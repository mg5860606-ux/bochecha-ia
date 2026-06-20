const assert = require('assert');
const { buildOfflineFallbackResponse } = require('../lib/offlineFallbackHelper');

const response = buildOfflineFallbackResponse('Bochecha vai no pv da @123 e manda ele vi aqui');
assert.strictEqual(response, '', 'Esperava fallback offline silencioso (string vazia) para deixar a IA sempre responder.');
console.log('offline_fallback regression check passed (silent mode).');
