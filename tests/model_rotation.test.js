const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const blockMatch = source.match(/this\.freeModels\s*=\s*\[(.*?)\];/s);
assert.ok(blockMatch, 'Não foi possível localizar a lista de modelos no KeyRotationEngine.');

const models = blockMatch[1]
  .split(',')
  .map(item => item.trim().replace(/['"]/g, ''))
  .filter(Boolean);

assert.strictEqual(models.length, 3, 'A rotação deve ficar restrita a exatamente 3 modelos fortes.');
assert.deepStrictEqual(models, [
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro-preview'
], 'Os modelos ativos não correspondem à lista de 3 modelos fortes desejada.');

console.log('Model rotation regression check passed.');
