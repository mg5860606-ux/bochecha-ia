const test = require('node:test');
const assert = require('node:assert/strict');

// Mock storage
const mockStorage = {
    coins: {},
    async addCoins(from, user, amt) {
        const key = `${from}-${user}`;
        if (this.coins[key] === undefined) {
            this.coins[key] = 1000; // default 1000 coins for testing
        }
        this.coins[key] += amt;
        return this.coins[key];
    }
};

global.storage = mockStorage;

const sistemaEconomia = require('../skills/sistema_economia');

test('Duelo: lança desafio e aceita com sucesso', async () => {
    const from = 'group1@g.us';
    const challenger = 'challenger@s.whatsapp.net';
    const opponent = 'opponent@s.whatsapp.net';
    
    // 1. Lança o desafio
    const challengeArgs = { acao: 'duelo', valor: 100 };
    const mockMessage1 = {
        message: {
            extendedTextMessage: {
                contextInfo: {
                    mentionedJid: [opponent]
                }
            }
        }
    };
    
    const mockSock = {
        async sendMessage(to, content, options) {
            // Noop
        }
    };
    
    const challengeRes = await sistemaEconomia.execute(challengeArgs, {
        sock: mockSock,
        from,
        sender: challenger,
        pushname: 'Challenger',
        message: mockMessage1
    });
    
    assert.match(challengeRes, /⚔️ \*DESAFIO DE DUELO LANÇADO!\* ⚔️/);
    
    // Verifica se salvou o duelo pendente
    const pendingKey = `${from}-${challenger}`;
    const pendingDuel = global.pendingDuels.get(pendingKey);
    assert.ok(pendingDuel);
    assert.equal(pendingDuel.challenger, challenger);
    assert.equal(pendingDuel.target, opponent);
    assert.equal(pendingDuel.bet, 100);
    
    // 2. Oponente aceita o desafio (sem especificar alvo explicitamente)
    const acceptArgs = { acao: 'duelo', opcao: 'aceitar' };
    const mockMessage2 = { message: {} };
    
    const acceptRes = await sistemaEconomia.execute(acceptArgs, {
        sock: mockSock,
        from,
        sender: opponent,
        pushname: 'Opponent',
        message: mockMessage2
    });
    
    assert.match(acceptRes, /🔫 \*DUELO RUSSO DE COINS\* 🔫/);
    
    // O duelo deve ter sido removido dos pendentes
    assert.equal(global.pendingDuels.has(pendingKey), false);
});
