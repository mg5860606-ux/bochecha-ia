const assert = require('assert');
const { shouldPreferAudioReply } = require('../lib/voice_utils');

assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'resposta curta'), false);
assert.strictEqual(shouldPreferAudioReply(true, 0.5, 'resposta curta'), true);
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'x'.repeat(2000)), false);

console.log('Voice reply decision test passed.');
