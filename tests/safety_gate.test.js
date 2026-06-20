const assert = require('assert');
const safety = require('../lib/conversation_safety');

const unsafe = safety.classifyConversationSafety('quero ver putaria e sexo agora');
assert.strictEqual(unsafe.blocked, false, 'Controle de segurança desativado: não deve bloquear.');

const allowed = safety.classifyConversationSafety('e aí, tudo bem?');
assert.strictEqual(allowed.blocked, false, 'Conversas normais não devem ser bloqueadas.');

const adultCommand = safety.classifyConversationSafety('/baixar_adulto', { isGroup: true, isOwner: false });
assert.strictEqual(adultCommand.blocked, false, 'Controle de segurança desativado: não deve bloquear.');

const genericGroupReply = safety.sanitizeAssistantOutput('E aí, @123! Qual é a boa?', { isGroup: true });
assert.strictEqual(genericGroupReply, 'E aí, @123! Qual é a boa?', 'Controle de supressão de chatter desativado: deve retornar o texto original.');

console.log('Safety gate regression check passed (Bypassed mode).');
