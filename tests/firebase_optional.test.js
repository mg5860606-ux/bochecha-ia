const assert = require('assert');
const connector = require('../firebase_connector');

assert.strictEqual(typeof connector.isAvailable, 'boolean', 'O conector deve expor um estado de disponibilidade do Firestore.');
assert.strictEqual(typeof connector.getStatus, 'function', 'O conector deve expor um método de status.');

const status = connector.getStatus();
assert.ok(status && typeof status === 'object');
assert.ok('available' in status, 'O status deve informar se o Firestore está disponível.');

console.log('Firebase optional fallback regression check passed.');
