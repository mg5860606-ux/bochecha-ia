const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

assert.ok(source.includes('shouldSkipFactExtraction'), 'O LTM precisa de um guard de filtragem para mensagens curtas ou de ação.');
assert.ok(source.includes('const LTM_AUTOSAVE_ENABLED = false'), 'O LTM precisa estar desativado por padrão para impedir novas gravações.');
assert.ok(source.includes('executeClaudeWithRotation'), 'O motor precisa tentar um provedor alternativo quando o OpenRouter falha.');
assert.ok(source.includes('listClaudeKeys().length > 0'), 'O fallback alternativo precisa verificar se há chaves Claude disponíveis.');

console.log('Provider fallback regression check passed.');
