const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'sansekai.js'), 'utf8');

assert.ok(source.includes('const LTM_AUTOSAVE_ENABLED ='), 'A flag LTM_AUTOSAVE_ENABLED de gravação de memória não foi encontrada no código.');
assert.ok(source.includes('function extractSimpleFacts'), 'O bot deve ter um extrator local simples de fatos para memória.');

console.log('LTM memory regression check passed.');
