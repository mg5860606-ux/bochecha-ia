const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

// 1. Verificações Estáticas de Integridade do Código
console.log('Executando validações estáticas...');

assert.ok(source.includes('this.modelCooldowns = new Map()'), 'O construtor do KeyRotationEngine precisa inicializar modelCooldowns.');
assert.ok(source.includes('const isProviderError = msg.includes("Provider returned error") || msg.includes("upstream") || msg.includes("model")'), 'A lógica de detecção de erro de provedor (isProviderError) deve estar presente.');
assert.ok(source.includes('this.modelCooldowns.set(modelName, Date.now() + 3 * 60 * 1000)'), 'O cooldown de 3 minutos deve ser aplicado ao modelo específico.');
assert.ok(source.includes('actualFreeModelsList = ['), 'A lista de modelos gratuitos reais (Gemini + :free do OpenRouter) deve estar no _tryFreeModelsOnly.');

console.log('✅ Validações estáticas passadas com sucesso!');

// 2. Validação Dinâmica via Simulação em VM (Mocking)
console.log('Executando validação de comportamento lógico...');

const vm = require('vm');

function extractMethod(methodName) {
  let methodStart = source.indexOf(`    ${methodName}(`);
  if (methodStart === -1) {
    methodStart = source.indexOf(`    async ${methodName}(`);
  }
  assert.notStrictEqual(methodStart, -1, `Método não encontrado: ${methodName}`);
  const braceStart = source.indexOf('{', methodStart);
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.notStrictEqual(end, -1, `Não foi possível fechar o método: ${methodName}`);
  return source.slice(methodStart, end + 1);
}

// Extrai a lógica principal de retry e cooldown de modelo
const executeCode = extractMethod('executeWithRotation');
const selectActiveKeyCode = extractMethod('_selectActiveKey');
const getPrioritizedModelsCode = extractMethod('_getPrioritizedModels');
const classifyRequestCode = extractMethod('_classifyRequest');

const context = {
  console,
  Date,
  Map,
  Set,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  AbortController: class {
    constructor() {
      this.signal = {};
    }
    abort() {}
  },
  setTimeout,
  clearTimeout,
  Promise,
  apiKeyManager: {
    listKeys: () => ['key_normal'],
    getKey: () => 'key_normal',
    setCurrentKey: () => {},
    markFailure: () => {}
  },
  mapGeminiToolsToOpenRouter: () => null,
  Logger: {
    warn() {},
    error() {},
    info() {}
  },
  storage: {
    cache: {
      get: () => ({
        primaryModel: 'meta-llama/llama-3.3-70b-instruct:free'
      })
    }
  },
  SETTINGS_FILE: 'settings.json'
};

vm.createContext(context);

// Constrói uma classe mock KeyRotationEngine na VM contendo as propriedades e os métodos extraídos
const setupCode = `
class KeyRotationEngine {
    constructor() {
        this.freeModels = ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro-preview'];
        this.availableModels = [...this.freeModels, 'meta-llama/llama-3.3-70b-instruct:free'];
        this.modelNormalization = {
            'google/gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
            'meta-llama/llama-3.3-70b-instruct:free': 'meta-llama/llama-3.3-70b-instruct:free'
        };
        this.cooldowns = new Map();
        this.modelCooldowns = new Map();
        this.deadModels = new Set();
        this.keyStats = new Map();
        this._globalFailCount = 0;
        this._globalFailMax = 3;
        this._lastSuccessTime = Date.now();
        this.metrics = { totalRequests: 0, successRequests: 0, failedRequests: 0, modelHits: {}, latencies: [] };
        this.cooldownDuration = 300000;
    }
    
    _truncateTextForModel(t) { return t; }
    _preparePromptContent(p) { return p; }
    async saveKeyMetrics() {}

    ${selectActiveKeyCode}
    ${getPrioritizedModelsCode}
    ${classifyRequestCode}
    ${executeCode}
}
this.KeyRotationEngine = KeyRotationEngine;
`;

vm.runInContext(setupCode, context);

// Simula chamada de API com mock de fetch global
let fetchCount = 0;
context.fetch = async (url, options) => {
    fetchCount++;
    const body = JSON.parse(options.body);
    const model = body.model;
    
    // Na primeira chamada (com llama), retorna 429 de provedor (Provider returned error)
    if (model === 'meta-llama/llama-3.3-70b-instruct:free' && fetchCount === 1) {
        const err = new Error('OpenRouter API Error: status 429 - {"error":{"message":"Provider returned error"}}');
        err.httpStatus = 429;
        throw err;
    }
    
    // Na segunda chamada (com gemini-flash-lite), retorna sucesso
    return {
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: "Sucesso no modelo de backup!"
                }
            }]
        })
    };
};

const KeyRotationEngine = context.KeyRotationEngine;
const engine = new KeyRotationEngine();

// Executa a chamada
engine.executeWithRotation([], 'Olá', [], null)
  .then(res => {
      assert.strictEqual(res.modelName, 'google/gemini-2.5-flash-lite', 'Deveria ter feito fallback para o Gemini Flash Lite na mesma chave.');
      assert.strictEqual(fetchCount, 2, 'Deveria ter feito exatamente 2 chamadas fetch.');
      
      // Verifica se o modelo Llama foi colocado em cooldown
      const llamaCooldown = engine.modelCooldowns.get('meta-llama/llama-3.3-70b-instruct:free');
      assert.ok(llamaCooldown && llamaCooldown > Date.now(), 'O modelo Llama deveria estar em cooldown ativo.');
      
      // Verifica se a chave NÃO foi colocada em cooldown
      const keyCooldown = engine.cooldowns.get('key_normal');
      assert.strictEqual(keyCooldown, undefined, 'A chave normal não deveria ter sofrido cooldown pois o erro foi de provedor.');

      console.log('✅ Validação lógica em ambiente mockado passou com sucesso!');
      console.log('Rate limit model cooldown check passed.');
  })
  .catch(err => {
      console.error('❌ Falha no teste dinâmico:', err);
      process.exit(1);
  });
