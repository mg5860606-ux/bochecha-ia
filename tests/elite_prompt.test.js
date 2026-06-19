const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const systemPath = path.join(root, 'SYSTEM.md');
const source = fs.readFileSync(sansekaiPath, 'utf8');
const systemSource = fs.readFileSync(systemPath, 'utf8');

const requiredPhrases = [
  'POSTURA DE ELITE',
  'não fique pedindo confirmação',
  'o que você quer?',
  'vibe de elite',
  'sem parecer assistente'
];

for (const phrase of requiredPhrases) {
  assert.ok(source.toLowerCase().includes(phrase.toLowerCase()), `O prompt não foi reforçado com: ${phrase}`);
}

const requiredSystemPhrases = [
  'não responda com frases de abertura',
  'responda a pergunta atual diretamente',
  'não repita a pergunta'
];

for (const phrase of requiredSystemPhrases) {
  assert.ok(systemSource.toLowerCase().includes(phrase.toLowerCase()), `O SYSTEM.md não foi reforçado com: ${phrase}`);
}

console.log('Elite prompt regression check passed.');
