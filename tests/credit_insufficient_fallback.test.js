const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

console.log('Executando validações estáticas de erro 402...');

assert.ok(source.includes('this.keysWithoutCredits = new Set()'), 'O construtor do KeyRotationEngine precisa inicializar keysWithoutCredits.');
assert.ok(source.includes('this.keysWithoutCredits.add(activeKey)'), 'O tratamento de erro 402 deve adicionar a chave ao keysWithoutCredits.');
assert.ok(source.includes('this.keysWithoutCredits.has(activeKey)'), 'A filtragem deve verificar se a chave está sem créditos.');

console.log('✅ Validações estáticas passadas!');

console.log('Executando validação de comportamento lógico do erro 402...');

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
    listKeys: () => ['key_without_credits'],
    getKey: () => 'key_without_credits',
    setCurrentKey: () => {},
    markFailure: () => {},
    listClaudeKeys: () => [] // Sem chaves Claude para este teste
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
         // Define gemini-pro-preview (pago) como cérebro primário
         primaryModel: 'google/gemini-2.5-pro-preview'
      })
    }
  },
  SETTINGS_FILE: 'settings.json'
};

vm.createContext(context);

const setupCode = `
class KeyRotationEngine {
    constructor() {
        this.freeModels = ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro-preview'];
        this.availableModels = [...this.freeModels, 'qwen/qwen3-coder:free'];
        this.modelNormalization = {
            'google/gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
            'google/gemini-2.5-pro-preview': 'google/gemini-2.5-pro-preview',
            'qwen/qwen3-coder:free': 'qwen/qwen3-coder:free'
        };
        this.cooldowns = new Map();
        this.modelCooldowns = new Map();
        this.deadModels = new Set();
        this.keysWithoutCredits = new Set();
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

let fetchCount = 0;
let lastModelTried = '';

context.fetch = async (url, options) => {
    fetchCount++;
    const body = JSON.parse(options.body);
    const model = body.model;
    lastModelTried = model;
    
    // Na primeira chamada (com o modelo pago gemini-pro-preview), simula erro 402
    if (model === 'google/gemini-2.5-pro-preview' && fetchCount === 1) {
        const err = new Error('OpenRouter API Error: status 402 - {"error":{"message":"This request requires more credits"}}');
        err.httpStatus = 402;
        throw err;
    }
    
    // Na segunda chamada (com o modelo gratuito qwen/qwen3-coder:free), deve ter sucesso
    return {
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: "Sucesso com o modelo gratuito!"
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
      assert.strictEqual(res.modelName, 'qwen/qwen3-coder:free', 'Deveria ter feito fallback para o modelo gratuito Qwen Coder.');
      assert.strictEqual(fetchCount, 2, 'Deveria ter feito exatamente 2 chamadas fetch.');
      
      // Verifica se a chave foi inserida no keysWithoutCredits
      assert.ok(engine.keysWithoutCredits.has('key_without_credits'), 'A chave deveria estar no conjunto keysWithoutCredits.');
      
      // Verifica se a chave NÃO foi colocada em cooldown completo
      const keyCooldown = engine.cooldowns.get('key_without_credits');
      assert.strictEqual(keyCooldown, undefined, 'A chave não deveria sofrer cooldown de cota pois ela pode usar modelos gratuitos.');

      console.log('✅ Validação dinâmica do erro 402 passou com sucesso!');
      console.log('Credit insufficient fallback check passed.');
  })
  .catch(err => {
      console.error('❌ Falha no teste dinâmico 402:', err);
      process.exit(1);
  });
