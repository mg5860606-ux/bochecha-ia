const assert = require('assert');
const { hasValidAudioBuffer } = require('../lib/voice_utils');

assert.strictEqual(hasValidAudioBuffer(Buffer.alloc(0)), false);
assert.strictEqual(hasValidAudioBuffer(Buffer.alloc(600, 1)), true);
assert.strictEqual(hasValidAudioBuffer(null), false);

console.log('Voice audio buffer validation test passed.');
