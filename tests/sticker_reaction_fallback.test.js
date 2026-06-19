const assert = require('assert');
const { resolveStickerReactionFallback } = require('../lib/stickerReactionHelper');

const rateLimitResult = resolveStickerReactionFallback({ response: { status: 429 } });
assert.strictEqual(rateLimitResult, '😂', 'Esperava fallback de reação para 429.');

const genericResult = resolveStickerReactionFallback(new Error('timeout'));
assert.strictEqual(genericResult, '😂', 'Esperava fallback de reação para erro genérico.');

console.log('sticker_reaction_fallback regression check passed.');
