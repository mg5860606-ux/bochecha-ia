const assert = require('assert');
const fs = require('fs');
const path = require('path');

const keyFile = path.join(__dirname, '..', 'key.json');
const backup = fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : null;

try {
  fs.writeFileSync(keyFile, JSON.stringify({ keys: [], claudekeys: [] }, null, 2));

  const apiKeyManager = require('../apiKeyManager');

  assert.strictEqual(apiKeyManager.addKey('  sk-test-1  '), true, 'Deveria adicionar uma chave válida após normalizar o valor.');
  assert.deepStrictEqual(apiKeyManager.listKeys(), ['sk-test-1'], 'A chave deve ser armazenada sem espaços extras.');
  assert.deepStrictEqual(apiKeyManager.mergeKeyLists(['sk-local-1'], ['sk-remote-1', 'sk-local-1']), ['sk-local-1', 'sk-remote-1'], 'Deveria unir chaves locais e remotas sem duplicar.');
  assert.strictEqual(apiKeyManager.addKey('sk-test-1'), false, 'Não deveria aceitar chaves duplicadas.');
  assert.strictEqual(apiKeyManager.removeKey('sk-test-1'), true, 'Deveria remover a chave adicionada.');
  assert.deepStrictEqual(apiKeyManager.listKeys(), [], 'A lista de chaves deve ficar vazia após a remoção.');

  console.log('apiKeyManager regression test passed.');
  process.exit(0);
} finally {
  if (backup === null) {
    if (fs.existsSync(keyFile)) fs.unlinkSync(keyFile);
  } else {
    fs.writeFileSync(keyFile, backup);
  }
}
