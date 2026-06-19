const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

assert.ok(
  source.includes('generateOfflineResponse(prompt)') && source.includes('return "";'),
  'A lógica de fallback offline não foi desativada para respostas silenciosas.'
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

assert.ok(source.includes('Tô com um branco agora') || source.includes('Não consegui responder com clareza agora') || source.includes('mais contexto'), 'O fallback offline precisa ser mais útil e menos genérico.');
assert.ok(source.includes('tocar') || source.includes('musica') || source.includes('música'), 'O fallback offline precisa reconhecer pedidos de tocar música ou comandos de ação.');

console.log('Offline response regression check passed.');
