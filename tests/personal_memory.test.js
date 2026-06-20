const assert = require('assert');
const path = require('path');
const fs = require('fs');

// We require sansekai.js to get sessionManager
const sansekai = require('../sansekai');
const { sessionManager } = sansekai;

(async () => {
    try {
        console.log('Iniciando teste de memória pessoal por usuário...');

        const sender = '5511999999999@s.whatsapp.net';
        const cleanSender = '5511999999999';

        // Certifica que começamos do zero
        const memoryDir = path.join(__dirname, '..', 'memory');
        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir, { recursive: true });
        }
        const personalFile = path.join(memoryDir, `user_${cleanSender}.json`);
        if (fs.existsSync(personalFile)) {
            fs.unlinkSync(personalFile);
        }

        // 1. Testa gravação de mensagens pessoais
        await sessionManager.addPersonalMessage(sender, 'user', 'Mensagem 1 do Usuário');
        await sessionManager.addPersonalMessage(sender, 'assistant', 'Resposta 1 do Bochecha');

        let personalHistory = await sessionManager.getPersonalHistory(sender);
        assert.strictEqual(personalHistory.length, 2, 'Deveria ter gravado duas mensagens no histórico pessoal.');
        assert.strictEqual(personalHistory[0].role, 'user');
        assert.strictEqual(personalHistory[0].content, 'Mensagem 1 do Usuário');
        assert.strictEqual(personalHistory[1].role, 'assistant');
        assert.strictEqual(personalHistory[1].content, 'Resposta 1 do Bochecha');

        // 2. Testa limite de tamanho (deve fatiar ao exceder 40 mensagens)
        for (let i = 2; i <= 45; i++) {
            await sessionManager.addPersonalMessage(sender, 'user', `Mensagem ${i}`);
        }
        personalHistory = await sessionManager.getPersonalHistory(sender);
        assert.strictEqual(personalHistory.length, 40, 'O histórico pessoal deve estar limitado a no máximo 40 mensagens.');
        assert.strictEqual(personalHistory[39].content, 'Mensagem 45');

        // 3. Testa mesclagem de históricos (mergeHistories) com deduplicação
        const chatHistory = [
            { isSummaryMetadata: true, summary: 'Resumo prévio do chat', role: 'user', content: 'Resumo', timestamp: Date.now() - 100000 },
            { role: 'user', content: 'Mensagem do chat 1', timestamp: Date.now() - 5000 },
            { role: 'assistant', content: 'Mensagem 45', timestamp: Date.now() - 2000 } // idêntica a uma mensagem no histórico pessoal
        ];

        const testPersonal = [
            { role: 'user', content: 'Mensagem pessoal do usuário 1', timestamp: Date.now() - 4000 },
            { role: 'assistant', content: 'Mensagem 45', timestamp: Date.now() - 2000 } // duplicada
        ];

        const merged = sessionManager.mergeHistories(chatHistory, testPersonal);

        // Deve conter: resumo (0), mensagem do chat 1 (1), mensagem pessoal (2), mensagem 45 (3)
        assert.strictEqual(merged.length, 4, 'Deveria conter 4 mensagens após mesclar e deduplicar.');
        assert.strictEqual(merged[0].isSummaryMetadata, true);
        assert.strictEqual(merged[1].content, 'Mensagem do chat 1');
        assert.strictEqual(merged[2].content, 'Mensagem pessoal do usuário 1');
        assert.strictEqual(merged[3].content, 'Mensagem 45'); // deduplicada

        // Limpa arquivo de teste após execução
        if (fs.existsSync(personalFile)) {
            fs.unlinkSync(personalFile);
        }

        console.log('Personal memory regression check passed.');
        process.exit(0);
    } catch (err) {
        console.error('Falha no teste de memória pessoal:', err);
        process.exit(1);
    }
})();
