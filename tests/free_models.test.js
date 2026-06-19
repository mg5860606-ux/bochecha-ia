const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const requiredModels = [
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free'
];

for (const model of requiredModels) {
  assert.ok(source.includes(model), `Modelo gratuito esperado não encontrado: ${model}`);
}

assert.ok(source.includes('isReasoning'), 'O roteador não está detectando tarefas de raciocínio para priorizar modelos mais fortes.');
assert.ok(source.includes('qwen/qwen3-coder:free'), 'O roteador não está priorizando um modelo especializado em código.');
assert.ok(source.includes('_classifyRequest'), 'O roteador não está classificando automaticamente prompts em modo rápido ou inteligente.');

console.log('Free-model list regression check passed.');
