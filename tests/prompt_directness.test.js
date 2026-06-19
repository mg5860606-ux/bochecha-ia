const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const systemPath = path.join(root, 'SYSTEM.md');

const sansekaiSource = fs.readFileSync(sansekaiPath, 'utf8');
const systemSource = fs.readFileSync(systemPath, 'utf8');

assert.ok(
  sansekaiSource.includes('REGRA DE RESPOSTA DIRETA E CONTEXTUAL'),
  'A regra de resposta direta não foi adicionada ao prompt do bot.'
);

assert.ok(
  systemSource.includes('RESPOSTA DIRETA AO ÚLTIMO TEXTO'),
  'A regra de resposta direta não foi adicionada ao SYSTEM.md.'
);

console.log('Prompt directness regression check passed.');
