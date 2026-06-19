const assert = require('assert');
const { getReconnectPlan } = require('../lib/connection_reconnect');

const transientPlan = getReconnectPlan(440, 2, false);
assert.strictEqual(transientPlan.shouldReconnect, true, 'Falhas transitórias devem disparar reconexão.');
assert.ok(transientPlan.delayMs >= 5000, 'O delay para 440 deve ser maior que o padrão imediato.');

const forbiddenPlan = getReconnectPlan(403, 1, false);
assert.strictEqual(forbiddenPlan.shouldReconnect, false, 'Status 403 deve parar a reconexão automática.');

const loggedOutPlan = getReconnectPlan(401, 1, true);
assert.strictEqual(loggedOutPlan.shouldReconnect, false, 'Sessões desconectadas devem limpar a sessão.');

const repeated440Plan = getReconnectPlan(440, 4, false);
assert.strictEqual(repeated440Plan.shouldReconnect, true, 'Falhas repetidas ainda devem tentar reconectar.');
assert.strictEqual(repeated440Plan.shouldClearSession, true, 'Falhas repetidas de 440 devem limpar a sessão para evitar loops agressivos.');

console.log('Connection reconnect regression check passed.');
