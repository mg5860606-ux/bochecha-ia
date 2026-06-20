const assert = require('assert');
const { shouldPreferAudioReply } = require('../lib/voice_utils');

// Mock Math.random to verify behavior with voiceChance
const originalRandom = Math.random;

// 1. Math.random returns 0.6 (larger than voiceChance 0.5 -> should return false)
Math.random = () => 0.6;
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'resposta curta'), false);
assert.strictEqual(shouldPreferAudioReply(true, 0.5, 'resposta curta'), true);
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'x'.repeat(2000)), false);

// 2. Math.random returns 0.4 (smaller than voiceChance 0.5 -> should return true for short simple text)
Math.random = () => 0.4;
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'resposta curta'), true);
// Even if math.random qualifies, too long text, code, or links should not be voice replies
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'x'.repeat(2000)), false);
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'código ```js\nconsole.log()```'), false);
assert.strictEqual(shouldPreferAudioReply(false, 0.5, 'link http://exemplo.com'), false);

// Restore Math.random
Math.random = originalRandom;

console.log('Voice reply decision test passed.');
