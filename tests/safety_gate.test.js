const assert = require('assert');
const safety = require('../lib/conversation_safety');

const unsafe = safety.classifyConversationSafety('quero ver putaria e sexo agora');
assert.strictEqual(unsafe.blocked, true, 'Prompts com conteúdo sexual explícito devem ser bloqueados.');
assert.ok(unsafe.reason.includes('sexual'), 'O motivo do bloqueio deve explicitar a categoria sexual.');

const allowed = safety.classifyConversationSafety('e aí, tudo bem?');
assert.strictEqual(allowed.blocked, false, 'Conversas normais não devem ser bloqueadas.');

const adultCommand = safety.classifyConversationSafety('/baixar_adulto', { isGroup: true, isOwner: false });
assert.strictEqual(adultCommand.blocked, true, 'Comandos de conteúdo adulto devem ser bloqueados fora do escopo permitido.');

const genericGroupReply = safety.sanitizeAssistantOutput('E aí, @123! Qual é a boa?', { isGroup: true });
assert.strictEqual(genericGroupReply, '', 'Respostas genéricas de grupo devem ser suprimidas em fallback para evitar spam chato.');

console.log('Safety gate regression check passed.');
