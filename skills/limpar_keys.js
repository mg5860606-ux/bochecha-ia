const axios = require('axios');
const chalk = require('chalk');
const apiKeyManager = require('../apiKeyManager');

module.exports = {
    definition: {
        function: {
            name: "limpar_keys",
            description: "Valida em lote todas as chaves OpenRouter configuradas e remove do pool aquelas que estiverem inválidas, sem saldo ou expiradas.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        if (!isOwner) {
            return "Qual foi, playboy? Esse comando é exclusivo do meu Arquiteto Supremo Marcos! Não se mete! 💀";
        }

        const keys = apiKeyManager.listKeys();
        if (!keys || keys.length === 0) {
            await sock.sendMessage(from, { text: "❌ Nenhuma chave configurada no pool!" }, { quoted: message });
            return;
        }

        await sock.sendMessage(from, { text: `🛡️ *INICIANDO FAXINA NEURAL DE API* 🥀\n\nValidando e testando saldo de *${keys.length} chaves* em paralelo. Aguarde o relatório...` }, { quoted: message });

        let activeCount = 0;
        let deadCount = 0;
        const details = [];

        const testKey = async (key, idx) => {
            const startTime = Date.now();
            try {
                // Dispara requisição leve para testar cota e saldo
                const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: "openai/gpt-4o-mini:free",
                    messages: [{ role: "user", content: "oi" }],
                    max_tokens: 1
                }, {
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 8000
                });

                const latency = Date.now() - startTime;
                if (response.status === 200) {
                    activeCount++;
                    details.push({
                        id: idx + 1,
                        key: `${key.substring(0, 10)}...`,
                        status: "✅ ONLINE",
                        latency: `${latency}ms`
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (err) {
                deadCount++;
                let errMsg = err.response?.data?.error?.message || err.message || "Erro desconhecido";
                details.push({
                    id: idx + 1,
                    key: `${key.substring(0, 10)}...`,
                    status: "❌ FORA DO AR / ZERADA",
                    latency: "-",
                    error: errMsg.substring(0, 40)
                });
                // Expurga a chave inválida ou sem saldo
                apiKeyManager.markFailure(key, true);
            }
        };

        // Roda testes em paralelo
        await Promise.all(keys.map((k, idx) => testKey(k, idx)));

        // Monta o relatório em formato premium
        let report = `🧹 *RELATÓRIO DA FAXINA NEURAL DE API* 🥀\n`;
        report += `*───────────────────────────────*\n`;
        report += `📊 *Estatísticas:* \n`;
        report += ` ↳ Total Analisadas: *${keys.length}*\n`;
        report += ` ↳ Chaves Ativas/Salvas: *${activeCount}*\n`;
        report += ` ↳ Chaves Expurgadas (Mortas): *${deadCount}*\n`;
        report += `*───────────────────────────────*\n\n`;

        details.sort((a, b) => a.id - b.id);
        details.forEach(d => {
            report += `🔑 *Slot #${d.id}* [${d.key}]\n`;
            report += `  ↳ Status: ${d.status}\n`;
            if (d.latency !== "-") {
                report += `  ↳ Latência: *${d.latency}*\n\n`;
            } else {
                report += `  ↳ Causa: _${d.error}_\n\n`;
            }
        });

        report += `> *BOCHECHA API CLEANER ENGINE v1.0* 💀⚡`;

        await sock.sendMessage(from, { text: report }, { quoted: message });
        return report;
    }
};
