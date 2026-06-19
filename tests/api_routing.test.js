const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

assert.ok(source.includes('"openrouter/auto"'), 'O roteador não está usando o endpoint OpenRouter auto para resposta via API.');
console.log('API routing regression check passed.');
