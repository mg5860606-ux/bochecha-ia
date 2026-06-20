const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
    definition: {
        function: {
            name: "resumir_fofoca",
            description: "Gera um resumo falado sarcástico e fofoqueiro das últimas conversas e acontecimentos do grupo nas últimas 12 horas e o envia como nota de voz do Bochecha.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    async execute(args, ctx) {
        const chatId = ctx.chatId;
        if (!chatId.endsWith("@g.us")) {
            return "Pô, resumos de fofoca só fazem sentido em grupos de verdade, não no nosso privado! 💀";
        }

        try {
            const dbPath = path.join(__dirname, '../learnings/chat_activity.json');
            if (!fs.existsSync(dbPath)) {
                return "Ainda não tenho registros suficientes de fofocas para fazer um resumo hoje! 💀";
            }

            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const entries = db[chatId] || [];
            
            // Filtra logs das últimas 12 horas
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            const recent = entries.filter(e => e.timestamp >= twelveHoursAgo && e.text && e.text.trim().length > 1 && !e.text.startsWith("/"));

            if (recent.length === 0) {
                return "O grupo esteve muito parado nas últimas horas... Nenhuma fofoca digna de nota! 🥀";
            }

            // Conta mensagens por usuário para destacar o "tagarela"
            const counts = {};
            for (const r of recent) {
                counts[r.pushname] = (counts[r.pushname] || 0) + 1;
            }

            let mainTalker = "Ninguém";
            let maxMsgs = 0;
            for (const name in counts) {
                if (counts[name] > maxMsgs) {
                    maxMsgs = counts[name];
                    mainTalker = name;
                }
            }

            // Compila trechos do chat de forma compacta (limita a 30 mensagens para não estourar contexto)
            const chatSlice = recent.slice(-30).map(r => `[${r.pushname}]: ${r.text}`).join("\n");

            console.log(`[🎙️ FOFOCA] Gerando fofoca resumo para o grupo ${chatId}`);

            const prompt = `Analise os trechos de conversas recentes do grupo abaixo nas últimas 12 horas.
Gere um resumo falado extremamente fofoqueiro, sarcástico, bem humorado e com marra de carioca da pesada (com gírias como: cria, vacilão, pé de breque, tá de k.o, mane, etc. Sem usar emoticons ou símbolos desnecessários!).
Diga quem foi o maior falador das últimas horas (${mainTalker} com ${maxMsgs} mensagens), comente sobre o que as pessoas estavam conversando ou brincando e solte um deboche da postura deles.

[REGRAS CRUCIAIS]:
1. NUNCA fale que você é um robô, IA ou script. Fale como o Bochecha, o co-administrador safo e dono do pedaço.
2. Seja natural e expressivo. O resumo do áudio deve ter no máximo 1800 caracteres (cerca de 2 minutos) para não ultrapassar o limite máximo!

[Conversas Recentes]:
${chatSlice}`;

            const systemRule = "Você é o Bochecha, o inquisidor gótico e safo do grupo. Gere o roteiro de fofoca diária curto e expressivo para áudio.";

            // Executa com a rotação de chaves
            const { response } = await global.keyRotator.executeWithRotation([], prompt, [], systemRule);
            const summaryText = response.response.text().trim();

            if (!summaryText) {
                return "Falha ao processar a fofoca da mente central. Tente novamente mais tarde.";
            }

            // Envia o áudio gerado para o chat
            const success = await global.VoiceSynthesizer.speak(ctx.sock, chatId, summaryText, ctx.message);
            
            if (success) {
                return `🎙️ Resumo do submundo enviado com sucesso! Fofoca do momento compilada!`;
            } else {
                return `Não consegui gravar o áudio no servidor, mas a fofoca é essa: "${summaryText}"`;
            }
        } catch (e) {
            console.error("[Fofoca Skill] Erro ao rodar fofoca:", e);
            return `Erro ao gerar fofoca: ${e.message}`;
        }
    }
};
