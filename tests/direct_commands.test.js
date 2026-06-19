const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDirectCommand } = require('../lib/direct_commands');
const { chunkParticipants } = require('../skills/marcar_todos');

test('mapeia /todos para a skill de marcar todos', () => {
  assert.deepStrictEqual(resolveDirectCommand('/todos'), {
    skillName: 'marcar_todos',
    args: { mensagem: 'Chamando todo mundo!' }
  });
});

test('mapeia /todos com mensagem personalizada', () => {
  assert.deepStrictEqual(resolveDirectCommand('/todos Atenção pessoal!'), {
    skillName: 'marcar_todos',
    args: { mensagem: 'Atenção pessoal!' }
  });
});

test('mapeia /bv para a skill de marcar todos', () => {
  assert.deepStrictEqual(resolveDirectCommand('/bv'), {
    skillName: 'marcar_todos',
    args: { mensagem: 'Chamando todo mundo!' }
  });
});

test('retorna null para mensagens sem comando direto', () => {
  assert.equal(resolveDirectCommand('oi'), null);
});

test('divide participantes em blocos menores para evitar rate limit', () => {
  assert.deepStrictEqual(chunkParticipants(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'b'], ['c', 'd'], ['e']]);
});
