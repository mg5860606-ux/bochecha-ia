const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'sansekai.js'), 'utf8');

assert.ok(source.includes('const LTM_AUTOSAVE_ENABLED = true;'), 'O LTM deve ficar ativado por padrão.');
assert.ok(source.includes('function extractSimpleFacts'), 'O bot deve ter um extrator local simples de fatos para memória.');

console.log('LTM memory regression check passed.');
