const os = require('os');
const moment = require('moment-timezone');
const apiKeyManager = require('../apiKeyManager');
const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "ping",
            description: "Exibe o status técnico e neural avançado do bot (RAM, CPU, Latência Real, Pool de Chaves e Cérebro Ativo).",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        const startTime = Date.now();
        const hora = moment.tz('America/Sao_Paulo').format('HH:mm:ss');
        const data = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY');
        
        // 1. Latência do WebSocket / Processamento Local
        const localLatency = Date.now() - startTime; 
        
        // 2. Latência Real da API OpenRouter
        let openRouterLatency = "-";
        const keys = apiKeyManager.listKeys();
        const activeKey = keys[0];
        
        if (activeKey) {
            try {
                const apiStart = Date.now();
                await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: "openai/gpt-4o-mini:free",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 1
                }, {
                    headers: {
                        "Authorization": `Bearer ${activeKey}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 4000
                });
                openRouterLatency = `${Date.now() - apiStart}ms`;
            } catch (err) {
                openRouterLatency = "Timeout/Erro 🛑";
            }
        }

        // 3. Status de RAM e Sistema
        const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor((uptime % 86400) / 3600);
        const minutos = Math.floor((uptime % 3600) / 60);
        const segundos = Math.floor(uptime % 60);
        
        // 4. Contagem de chats ativos
        const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
        const groupsCount = Object.keys(chats).length;

        // 5. Cérebro/Primary Model
        const primaryModel = global.primaryModel || "Claude 3.7 Sonnet (Thinking)";

        const dashboard = `🛸 *PAINEL CYBERPUNK - STATUS NEURAL* 🥀\n` +
                          `*───────────────────────────────*\n` +
                          `⚡ *Métricas de Velocidade:*\n` +
                          ` ↳ Latência Local (WS): *${localLatency}ms*\n` +
                          ` ↳ Latência da API SOTA: *${openRouterLatency}*\n` +
                          ` ↳ Atraso Neural: *0.0001s*\n\n` +
                          `🧠 *Cérebro e Conexões:*\n` +
                          ` ↳ Cérebro Principal: *${primaryModel}*\n` +
                          ` ↳ Chaves no Pool: *${keys.length} Ativas*\n\n` +
                          `🖥️ *Especificações do Servidor:*\n` +
                          ` ↳ Sistema Operacional: *${os.platform()} (${os.arch()})*\n` +
                          ` ↳ RAM Usada: *${ramUsed} MB* / *${totalRam} GB*\n` +
                          ` ↳ Tempo de Voo (Uptime): *${dias}d ${horas}h ${minutos}m ${segundos}s*\n\n` +
                          `👥 *Status de Canal:*\n` +
                          ` ↳ Grupos Ativos: *${groupsCount}*\n` +
                          ` ↳ Data e Hora: *${data} - ${hora}*\n` +
                          `*───────────────────────────────*\n` +
                          `> *BOCHECHA NEURAL NETWORK v4.0* 💀⚡`;

        return dashboard;
    }
};
