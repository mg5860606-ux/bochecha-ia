const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

assert.ok(source.includes('options.wasToolExecuted'), 'A proteção anti-hallucinação precisa desativar o guard quando a skill/tool executou com sucesso.');
assert.ok(source.includes('buildToolExecutionFallbackOutput') || source.includes('getToolExecutionFallbackOutput'), 'A execução de skills precisa ter um fallback de confirmação natural.');

console.log('Tool execution guard regression check passed.');
