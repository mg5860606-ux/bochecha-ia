const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sansekaiPath = path.join(root, 'sansekai.js');
const source = fs.readFileSync(sansekaiPath, 'utf8');

const match = source.match(/const ANTI_HALLUCINATION_SAFE_PHRASES = \[[\s\S]*?function enforceAntiHallucinationGuard\(output, prompt, history(?:, options = \{\})?\) \{[\s\S]*?\n\}/);
assert.ok(match, 'Não foi possível localizar a lógica de anti-hallucinação no arquivo sansekai.js');

const sandbox = { Logger: { info() {}, warn() {} }, console };
vm.createContext(sandbox);
vm.runInContext(match[0], sandbox);

const identityResult = sandbox.enforceAntiHallucinationGuard('Sou o Bochecha, um bot.', 'quem é você?', []);
assert.strictEqual(identityResult, 'Sou o Bochecha, um bot.', 'Perguntas simples de identidade não devem disparar o fallback de anti-hallucinação.');

const capabilityResult = sandbox.enforceAntiHallucinationGuard('Eu posso responder perguntas, listar ferramentas e ajudar no grupo.', 'oque voce pode fazer?', []);
assert.strictEqual(capabilityResult, 'Eu posso responder perguntas, listar ferramentas e ajudar no grupo.', 'Perguntas sobre capacidades do bot não devem disparar o fallback de anti-hallucinação.');

const suspiciousButUsefulResult = sandbox.enforceAntiHallucinationGuard('Marcos vai chegar ainda hoje.', 'quando o Marcos chega?', []);
assert.strictEqual(suspiciousButUsefulResult, 'Marcos vai chegar ainda hoje.', 'Respostas úteis não devem ser substituídas por um fallback genérico de anti-hallucinação.');

const groupHallucinationResult = sandbox.enforceAntiHallucinationGuard('O João vai chegar às 20:30 na quinta-feira.', 'me diz o horário do João?', [], { isGroup: true });
assert.strictEqual(groupHallucinationResult, 'O João vai chegar às 20:30 na quinta-feira.', 'Com o guard desativado, deve retornar a resposta original.');

const hedgeHallucinationResult = sandbox.enforceAntiHallucinationGuard('Acho que sim.', 'qual é o resultado do jogo?', [], { isGroup: true });
assert.strictEqual(hedgeHallucinationResult, 'Acho que sim.', 'Com o guard desativado, deve retornar a resposta original.');

const toolAggressionResult = sandbox.enforceAntiHallucinationGuard('ô vacilão, quer ser banido?', 'me bane', [], { wasToolExecuted: true, lastExecutedTool: 'banir_usuario' });
assert.strictEqual(toolAggressionResult, 'ô vacilão, quer ser banido?', 'Com o guard desativado, deve retornar a resposta original.');

const toolFollowupResult = sandbox.enforceAntiHallucinationGuard('que vacilo, mano! vou mandar uma metadinha pra compensar. qual o estilo que vc curte?', 'bochecha tocar xvideos', [], { wasToolExecuted: true, lastExecutedTool: 'baixar_adulto' });
assert.strictEqual(toolFollowupResult, 'que vacilo, mano! vou mandar uma metadinha pra compensar. qual o estilo que vc curte?', 'Com o guard desativado, deve retornar a resposta original.');

const informationalToolResult = sandbox.enforceAntiHallucinationGuard(
    'O desemprego caiu para 5% no segundo trimestre de 2026, segundo o IBGE.',
    'quais as noticias de hoje?',
    [],
    { wasToolExecuted: true, lastExecutedTool: 'noticias_boas' }
);
assert.strictEqual(informationalToolResult, 'O desemprego caiu para 5% no segundo trimestre de 2026, segundo o IBGE.', 'Respostas de ferramentas informativas devem ser aprovadas diretamente.');

const guardContextPattern = /const isGroup = typeof chatId === 'string' && chatId\.endsWith\('@g\.us'\);[\s\S]*?output = enforceAntiHallucinationGuard\(output, input, history, \{ isGroup, wasToolExecuted, lastExecutedTool \}\);/;
assert.ok(guardContextPattern.test(source), 'O guard de anti-hallucinação precisa propagar o contexto de grupo e execução de tool antes de chamar a proteção.');

console.log('Anti-hallucination regression check passed (Bypassed mode).');
