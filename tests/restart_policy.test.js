const assert = require('assert');
const { shouldAutoRestart } = require('../lib/restartPolicy');

assert.strictEqual(shouldAutoRestart(new Error('429 rate limit')), false);
assert.strictEqual(shouldAutoRestart(new Error('socket hang up')), false);
assert.strictEqual(shouldAutoRestart(new Error('out of memory')), true);

console.log('restart_policy regression check passed.');
