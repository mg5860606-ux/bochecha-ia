const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sansekaiPath = path.join(__dirname, '..', 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

assert.ok(source.includes('const isPrivateChat = !isGroup'), 'O fluxo privado não está desativando menções automáticas no PV.');
assert.ok(source.includes('cleanedReply = cleanedReply.replace(/@([a-zA-Z0-9'), 'A limpeza de saída não está removendo menções em mensagens privadas.');
console.log('Private mention regression check passed.');
