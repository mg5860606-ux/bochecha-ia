const assert = require('assert');
const { buildOfflineFallbackResponse } = require('../lib/offlineFallbackHelper');

const response = buildOfflineFallbackResponse('Bochecha vai no pv da @123 e manda ele vi aqui');
assert.match(response, /não consegui|tente novamente|não tenho base/i, 'Esperava fallback offline curto e seguro.');
console.log('offline_fallback regression check passed.');
