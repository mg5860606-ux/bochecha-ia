const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const requiredModels = [
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro-preview'
];

for (const model of requiredModels) {
  assert.ok(source.includes(model), `Modelo esperado não encontrado: ${model}`);
}

assert.ok(source.includes('isReasoning'), 'O roteador não está detectando tarefas de raciocínio para priorizar modelos mais fortes.');
assert.ok(source.includes('codingModels'), 'O roteador não possui classificação especializada para modelos de código.');
assert.ok(source.includes('_classifyRequest'), 'O roteador não está classificando automaticamente prompts em modo rápido ou inteligente.');

console.log('Free-model list regression check passed.');
