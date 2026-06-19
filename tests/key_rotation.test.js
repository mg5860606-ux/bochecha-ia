const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

function extractMethod(methodName) {
  const methodStart = source.indexOf(`    ${methodName}(`);
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

const methodCode = extractMethod('_selectActiveKey');
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
  apiKeyManager: {
    listKeys: () => ['k1', 'k2'],
    getKey: () => 'k1',
    setCurrentKey: (key) => { context.apiKeyManager.current = key; return key; },
    current: 'k1'
  },
  Logger: {
    warn() {},
    error() {},
    info() {}
  }
};

vm.createContext(context);
vm.runInContext(`class KeyRotationEngine { constructor(){ this.cooldowns = new Map(); } ${methodCode} } this.KeyRotationEngine = KeyRotationEngine;`, context);

const KeyRotationEngine = context.KeyRotationEngine;
const engine = new KeyRotationEngine();
engine.cooldowns.set('k1', Date.now() + 60_000);
assert.strictEqual(engine._selectActiveKey(), 'k2', 'O roteador deveria ignorar chaves em cooldown e escolher uma chave limpa.');
console.log('Key rotation regression check passed.');
