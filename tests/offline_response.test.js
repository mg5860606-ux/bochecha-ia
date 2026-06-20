const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

// Garante que o método de fallback offline foi totalmente removido
assert.ok(
  !source.includes('generateOfflineResponse('),
  'O método generateOfflineResponse ainda existe em sansekai.js.'
);

const forbiddenPhrases = [
  'Já mandei a visão lá no PV do parceiro',
  'Missão dada é missão cumprida',
  'Membro promovido com sucesso',
  'Rebaixei o sujeito',
  '"oi"',
  '"ae"',
  'q foi'
];

for (const phrase of forbiddenPhrases) {
  assert.ok(!source.includes(phrase), `O código ainda contém fallback textual genérico: ${phrase}`);
}

console.log('Offline response regression check passed (no fallbacks verified).');
