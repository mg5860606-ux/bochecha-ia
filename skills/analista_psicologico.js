const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
    definition: {
        function: {
            name: "analista_psicologico",
            description: "Analisa o comportamento, sinceridade ou o clima psicológico dos membros do grupo com base nas conversas arquivadas em tempo real.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["perfil", "mentira", "clima"],
                        description: "Ação de análise a ser executada."
                    },
                    usuario: {
                        type: "string",
                        description: "O JID ou número do usuário alvo para perfil."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, sender, pushname } = ctx;
        const isCommand = args.isCommand || false;

        let action = "";
        let targetUser = "";

        if (isCommand) {
            const cmdArgs = (args.arg || "").trim();
            const parts = cmdArgs.split(" ");
            action = args.command === "/perfil" ? "perfil" : (args.command === "/mentira" ? "mentira" : "clima");
            
            // Puxa mencionado ou o primeiro argumento
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (parts[0] && parts[0].includes('@')) {
                targetUser = parts[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                // Se respondeu a uma mensagem de alguém
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else {
                targetUser = sender; // Padrão analisa o próprio autor
            }
        } else {
            action = args.acao;
            targetUser = args.usuario || sender;
        }

        const historyPath = path.join(__dirname, 'database_history.json');
        let historyDb = {};
        try {
            if (fs.existsSync(historyPath)) {
                historyDb = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            }
        } catch (e) {}

        const currentBrain = global.keyRotator;
        if (!currentBrain) {
            return "❌ Cérebros neurais offline. Impossível ler a mente dos alvos.";
        }

        // ═════════════════════════════════════════════════════════════════
        // 🔮 AÇÃO 1: PERFIL PSICOLÓGICO DE CRIA (/perfil @user)
        // ═════════════════════════════════════════════════════════════════
        if (action === "perfil") {
            const userMessages = historyDb[from]?.[targetUser] || [];
            const customNickObj = global.userNicknames?.get(targetUser);
            const baseTargetName = targetUser === sender ? pushname : `@${targetUser.split('@')[0]}`;
            const targetName = (customNickObj && customNickObj.expires > Date.now()) ? `${baseTargetName} (Apelido: "${customNickObj.nick}")` : baseTargetName;
            
            if (isCommand) {
                await sock.sendMessage(from, { text: `🔮 *INICIANDO EXTRAÇÃO COGNITIVA* 🔮\n\nVarrendo histórico neural de ${targetName} no banco de dados do submundo...` });
            }

            let analysisPrompt = "";
            if (userMessages.length < 3) {
                analysisPrompt = `Faça um perfil psicológico ultra-sarcástico, divertido e debochado sobre o usuário '${targetName}' (JID: ${targetUser}).\n` +
                                 `Como temos pouquíssimos registros dele no chat, zombe dele dizendo que ele é um 'fantasma do chat', um 'espião silencioso' ou um 'observador tímido' que não fala por medo de ser exposto.\n` +
                                 `Crie uma análise 'chutada' hilária e assustadoramente cômica baseada apenas no apelido dele.`;
            } else {
                const messageListText = userMessages.map(m => `[${moment(m.time).format('HH:mm')}] - "${m.text}"`).join('\n');
                analysisPrompt = `Faça uma análise de perfil psicológico e comportamental assustadoramente precisa do usuário '${targetName}' com base nas últimas conversas reais dele listadas abaixo:\n\n` +
                                 `${messageListText}\n\n` +
                                 `Instruções de Cria:\n` +
                                 `1. Analise o estilo de escrita dele (sarcástico, agressivo, fofo, seco, emocionado, etc).\n` +
                                 `2. Deduza os principais traços de personalidade dele (ex: quer pagar de cria mas é romântico, finge que é durão mas é emocionado, fofoqueiro de plantão, etc).\n` +
                                 `3. Crie seções estéticas no estilo 'DEEP DATA HARVEST':\n` +
                                 `   - 🕵️‍♂️ COMPORTAMENTO E VOCABULÁRIO\n` +
                                 `   - 🧠 PERFIL COMPORTAMENTAL DE CRIA\n` +
                                 `   - 🥀 SEGREDOS E INSEGURANÇAS DEDUZIDAS\n` +
                                 `   - 🔮 PREVISÃO DO PRÓXIMO VACILO\n` +
                                 `4. Use a linguagem debochada e carioca do Bochecha. O usuário deve ficar genuinamente chocado de como você acertou a personalidade dele!`;
            }

            try {
                const sys = "Você é o Bochecha-IA, o observador onisciente e debochado do chat.";
                const { response: aiRes } = await currentBrain.executeWithRotation([], analysisPrompt, [], sys, true);
                const profileText = aiRes.response.text().trim();

                const userTitle = global.userTitles?.get(targetUser) ? `👑 *Título:* _${global.userTitles.get(targetUser)}_\n` : '';

                const report = `╔═══════════════════════════════╗\n` +
                               `   🧠 DIAGNÓSTICO COGNITIVO NEURAL 🧠\n` +
                               `╚═══════════════════════════════╝\n\n` +
                               `👤 *Alvo:* ${targetName}\n` +
                               userTitle +
                               `🗂️ *Mensagens Analisadas:* ${userMessages.length}\n` +
                               `📶 *Sincronia Cerebral:* 98.7% (Conexão Segura)\n\n` +
                               `${profileText}\n\n` +
                               `> *BOCHECHA MIND READER v4.5* 💀🛸🥀`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report, mentions: [targetUser] }, { quoted: message });
                }
                return report;

            } catch (err) {
                console.error(err);
                return "❌ Falha ao invadir os neurônios do alvo.";
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // 🔬 AÇÃO 2: DETECTOR DE MENTIRAS SEMÂNTICO (/mentira)
        // ═════════════════════════════════════════════════════════════════
        if (action === "mentira") {
            // Verifica se está respondendo a alguém
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            if (!quotedMsg) {
                const err = "⚠️ *Uso incorreto:* Responda a uma mensagem de alguém com o comando */mentira* para que eu faça a autópsia da verdade!";
                if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
                else return err;
            }

            let quotedText = "";
            if (quotedMsg.conversation) quotedText = quotedMsg.conversation;
            else if (quotedMsg.extendedTextMessage?.text) quotedText = quotedMsg.extendedTextMessage.text;
            else quotedText = "mídia ou emoji";

            if (isCommand) {
                await sock.sendMessage(from, { text: `🔬 *ATIVANDO AUTÓPSIA SEMÂNTICA* 🔬\n\nEscaneando traços linguísticos de falsidade, exagero e desculpas esfarrapadas...` });
            }

            const targetName = `@${quotedParticipant.split('@')[0]}`;
            const liePrompt = `Analise semântica e logicamente a frase a seguir dita por '${targetName}': "${quotedText}"\n` +
                              `Sua missão como detector de mentiras ultra-inteligente:\n` +
                              `1. Calcule uma porcentagem irônica de 'Sinceridade' vs 'Falsidade/Exagero'.\n` +
                              `2. Aponte 3 'PROVAS LÓGICAS' (pistas de escrita, justificativas excessivas, incoerências lógicas, padrões semânticos de mentira).\n` +
                              `3. Responda em um formato estético de 'LAUDO PERICIAL DA MENTIRA' usando gírias do submundo carioca e emojis debochados.\n` +
                              `4. Seja hilário, preciso e extremamente debochado no julgamento. Acabe com a banca do mentiroso no grupo!`;

            try {
                const sys = "Você é o Bochecha-IA, perito forense semântico e detector de mentiras.";
                const { response: aiRes } = await currentBrain.executeWithRotation([], liePrompt, [], sys, true);
                const lieReport = aiRes.response.text().trim();

                const report = `╔═══════════════════════════════╗\n` +
                               `   🔬 LAUDO PERICIAL DO MENTIRÔMETRO 🔬\n` +
                               `╚═══════════════════════════════╝\n\n` +
                               `👤 *Suspeito:* ${targetName}\n` +
                               `💬 *Frase:* "${quotedText}"\n\n` +
                               `${lieReport}\n\n` +
                               `> *BOCHECHA LIE DETECTOR v4.5* 💀⚡🥀`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report, mentions: [quotedParticipant] }, { quoted: message });
                }
                return report;

            } catch (err) {
                console.error(err);
                return "❌ Erro ao calibrar perito semântico.";
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // 🔮 AÇÃO 3: CLIMA EMOCIONAL DO GRUPO (/clima)
        // ═════════════════════════════════════════════════════════════════
        if (action === "clima") {
            const groupHistory = historyDb[from] || {};
            const allMsgs = [];
            
            Object.entries(groupHistory).forEach(([userJid, msgs]) => {
                msgs.forEach(m => {
                    allMsgs.push({
                        user: `@${userJid.split('@')[0]}`,
                        text: m.text,
                        time: m.time
                    });
                });
            });

            // Ordena por tempo
            allMsgs.sort((a, b) => new Date(a.time) - new Date(b.time));
            const recentMsgs = allMsgs.slice(-45); // Últimas 45 mensagens do grupo

            if (isCommand) {
                await sock.sendMessage(from, { text: `📶 *CONECTANDO RADARES ATMOSFÉRICOS* 📶\n\nMapeando ondas emocionais, fofocas e tensões coletivas no grupo...` });
            }

            let moodPrompt = "";
            if (recentMsgs.length < 5) {
                moodPrompt = `O grupo está muito silencioso ultimamente. Faça um diagnóstico sarcástico e engraçado do 'clima de velório' ou 'cemitério de bytes' que se instalou nas últimas horas no grupo. Diga que o chat tá mais morto que a postura dos caras de hoje em dia.`;
            } else {
                const recentText = recentMsgs.map(m => `${m.user}: "${m.text}"`).join('\n');
                moodPrompt = `Analise o clima psicológico coletivo recente do grupo com base nas últimas mensagens cruzadas a seguir:\n\n` +
                             `${recentText}\n\n` +
                             `Instruções de Cria:\n` +
                             `1. Determine o 'Clima Emocional' atual (ex: Tensão Pré-Treta, Fofoca de Elite, Cemitério Silencioso, Zueira Descontrolada).\n` +
                             `2. Aponte um termômetro irônico de humor.\n` +
                             `3. Aponte quem está sendo o 'Fomentador da Discórdia', o 'Palhaço do Chat' ou o 'Espírito Zombeteiro' nas conversas recentes.\n` +
                             `4. Dê uma diretriz assustadora da IA para acalmar ou atiçar os ânimos do chat.\n` +
                             `5. Formate esteticamente e use gírias do submundo carioca. Deixe o grupo chocado de como você percebeu as dinâmicas secretas e fofocas entre eles!`;
            }

            try {
                const sys = "Você é o Bochecha-IA, analista de dinâmicas de grupo e psicologia de massas.";
                const { response: aiRes } = await currentBrain.executeWithRotation([], moodPrompt, [], sys, true);
                const moodReport = aiRes.response.text().trim();

                // Extrai menções de usuários do texto gerado pela IA se houver
                const mentions = [];
                const regexMention = /@\d+/g;
                let match;
                while ((match = regexMention.exec(moodReport)) !== null) {
                    mentions.push(match[0].replace('@', '') + '@s.whatsapp.net');
                }

                const report = `╔═══════════════════════════════╗\n` +
                               `   🪐 TERMÔMETRO DE CLIMA PSICOLÓGICO 🪐\n` +
                               `╚═══════════════════════════════╝\n\n` +
                               `${moodReport}\n\n` +
                               `> *BOCHECHA ATMOSPHERE MONITOR* 🥀🛸💀`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report, mentions }, { quoted: message });
                }
                return report;

            } catch (err) {
                console.error(err);
                return "❌ Falha ao sintonizar barômetro de humor.";
            }
        }
    }
};
