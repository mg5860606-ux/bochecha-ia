const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const requiredPhrases = [
  'Use o histórico recente e as memórias',
  'respostas úteis, diretas e contextuais',
  'não use frases genéricas como "claro" ou "como posso ajudar"'
];

for (const phrase of requiredPhrases) {
  const normalizedSource = source.toLowerCase();
  const normalizedPhrase = phrase.toLowerCase();
  assert.ok(normalizedSource.includes(normalizedPhrase), `O prompt não foi reforçado com a instrução: ${phrase}`);
}

console.log('Prompt intelligence regression check passed.');
