const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const match = source.match(/function shouldRespondToMessage[\s\S]*?\n\}/);
assert.ok(match, 'Não foi possível localizar a função de gate de resposta no arquivo sansekai.js');

const sandbox = { console, Logger: { warn() {}, info() {}, error() {}, success() {} } };
vm.createContext(sandbox);
vm.runInContext(match[0], sandbox);

assert.strictEqual(
  sandbox.shouldRespondToMessage('mano queria uma dica sobre a vida nao tou muito feliz com ela', { isGroup: false, isMentioned: false, isReply: false }),
  true,
  'Mensagens privadas devem continuar ativando a resposta mesmo sem intenção explícita.'
);

assert.strictEqual(
  sandbox.shouldRespondToMessage('bochecha me explica como funciona', { isGroup: false, isMentioned: false, isReply: false }),
  true,
  'Pedidos explícitos em PV devem continuar ativando a resposta.'
);

console.log('Private reply gate regression test passed.');
