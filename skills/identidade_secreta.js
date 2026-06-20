const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "identidade_secreta",
            description: "Inicia o jogo da Identidade Secreta. O Bochecha escolhe um membro ativo em segredo, envia uma missão secreta no PV dele. O grupo tem 10 minutos para descobrir quem é o espião.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["iniciar", "adivinhar", "revelar", "regras"],
                        description: "Ação a ser executada."
                    },
                    alvo: {
                        type: "string",
                        description: "O JID ou menção do palpite de espião (para a ação 'adivinhar')."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ A Identidade Secreta só pode ser jogada dentro de grupos!";

        if (!global.activeMissions) global.activeMissions = new Map();

        const missoes = [
            "Mande uma figurinha de sapo, macaco ou palhaço no grupo sem dar nenhuma explicação.",
            "Faça com que pelo menos duas pessoas digam a palavra 'sim' no grupo na mesma conversa.",
            "Convença alguém do grupo a te enviar um PIX de pelo menos 5 Bochecha-Coins.",
            "Digite uma mensagem contendo exatamente 5 gírias cariocas misturadas.",
            "Faça algum administrador do grupo te mandar calar a boca ou reclamar de você.",
            "Mande um áudio de exatamente 3 a 5 segundos rindo do nada ou cantando um trecho de música cafona."
        ];

        // REGRAS
        if (args.acao === "regras") {
            return `🕵️‍♂️ *REGRAS DA IDENTIDADE SECRETA* 🕵️‍♂️\n\n` +
                `1. O Bochecha-IA seleciona um agente secreto no grupo de forma 100% oculta.\n` +
                `2. O agente recebe uma missão bizarra em seu chat PRIVADO.\n` +
                `3. Ele tem *10 minutos* para realizar a missão no grupo principal de forma natural, sem levantar suspeitas.\n` +
                `4. Os outros membros devem observar o chat. Se suspeitarem de alguém, usam:\n` +
                `   👉 */missao adivinhar @suspeito*\n` +
                `5. Se o grupo acertar o espião, o acusador ganha *50 Bochecha-Coins*.\n` +
                `6. Se ninguém descobrir após 10 minutos, o Espião se revela e ganha *100 Bochecha-Coins*! 💀`;
        }

        // ADIVINHAR
        if (args.acao === "adivinhar") {
            const game = global.activeMissions.get(from);
            if (!game) return "❌ Não há nenhuma missão secreta ativa no momento neste grupo.";

            let suspect = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!suspect && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                suspect = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            if (!suspect) return "❌ Você precisa marcar (@número) ou responder à mensagem de quem você acha que é o espião!";

            if (suspect === game.agent) {
                // Acertou!
                const storage = global.storage || require('../sansekai').storage;
                await storage.addCoins(from, sender, 50);
                global.activeMissions.delete(from);

                const spyClean = game.agent.split('@')[0];
                const winnerClean = sender.split('@')[0];

                await sock.sendMessage(from, {
                    text: `🚨🕵️‍♂️ *AGENTE SECRETO ENCONTRADO!* 🕵️‍♂️🚨\n\n` +
                        `O espião do submundo era realmente @${spyClean}!\n` +
                        `Parabéns @${winnerClean}, você desmascarou o infiltrado e ganhou *50 Bochecha-Coins*! 🎉\n\n` +
                        `A missão dele enviada no PV era:\n` +
                        `💬 *"${game.missionText}"*\n\n` +
                        `💀 O disfarce caiu! Tente melhor na próxima, agente. 🥀`,
                    mentions: [game.agent, sender]
                });
                return "Espião desmascarado.";
            } else {
                return `❌ *ERRADO!* O usuário @${suspect.split('@')[0]} é inocente e não tem envolvimento com a espionagem! Continue observando... 🕵️‍♂️`;
            }
        }

        // REVELAR (Timeout ou Admin force)
        if (args.acao === "revelar") {
            const game = global.activeMissions.get(from);
            if (!game) return "❌ Não há missão ativa.";
            
            const owners = config.OWNER_NUMBERS || [];
            const cleanSender = sender.split('@')[0];
            if (!owners.includes(cleanSender) && sender !== game.agent) {
                return "❌ Apenas o próprio Espião ou o Criador Marcos pode forçar a revelação precoce!";
            }

            global.activeMissions.delete(from);
            const storage = global.storage || require('../sansekai').storage;
            await storage.addCoins(from, game.agent, 100);

            await sock.sendMessage(from, {
                text: `🕵️‍♂️ *OPERAÇÃO REVELADA!* 🕵️‍♂️\n\n` +
                    `O agente espião @${game.agent.split('@')[0]} cumpriu sua missão com sucesso total ou revelou-se do submundo!\n\n` +
                    `📝 *Missão secreta dele:* "${game.missionText}"\n\n` +
                    `🪙 Ele ganhou *100 Bochecha-Coins* por ludibriar o grupo! 💀🥀`,
                mentions: [game.agent]
            });
            return "Revelado com sucesso.";
        }

        // INICIAR
        if (global.activeMissions.has(from)) return "⚠️ Já existe uma missão secreta rolando neste grupo! Fique atento às mensagens.";

        let participants = [];
        try {
            const meta = await sock.groupMetadata(from);
            participants = (meta.participants || []).map(p => p.id).filter(id => {
                const clean = id.split('@')[0];
                const myNumber = (sock.user?.id || '').replace(/:.*/, '').replace(/@.*/, '');
                return clean !== myNumber && clean !== sender.split('@')[0];
            });
        } catch (e) {
            return "❌ Não consegui puxar a lista de espiões em potencial do grupo.";
        }

        if (participants.length < 2) return "❌ Precisa de pelo menos 2 membros diferentes no grupo para jogar!";

        // Escolhe agente e missão
        const agent = participants[Math.floor(Math.random() * participants.length)];
        const missionText = missoes[Math.floor(Math.random() * missoes.length)];

        // Envia mensagem no privado do agente
        try {
            const privateMsg = `🕵️‍♂️ *OPERAÇÃO ULTRA SECRETA: BOCHECHA-IA* 🕵️‍♂️\n\n` +
                `Você foi selecionado como o *Agente Secreto* do seu grupo!\n\n` +
                `🎯 *Sua Missão:* ${missionText}\n\n` +
                `⏰ Você tem *10 minutos* para realizar essa tarefa no grupo de forma natural.\n` +
                `💰 Se conseguir sem que digam '/missao adivinhar @seuNumero', você ganha *100 Bochecha-Coins*!\n\n` +
                `💀 _Não revele essa mensagem pra ninguém! Boa sorte._`;
            
            await sock.sendMessage(agent, { text: privateMsg });
        } catch (pvErr) {
            return "❌ Falha ao enviar a missão no privado do agente (pode estar com PV bloqueado). Tente novamente.";
        }

        global.activeMissions.set(from, {
            agent,
            missionText,
            startTime: Date.now()
        });

        // Auto revelação em 10 minutos
        setTimeout(async () => {
            const game = global.activeMissions.get(from);
            if (game && Date.now() - game.startTime >= 9.5 * 60 * 1000) { // garante que é o mesmo jogo
                global.activeMissions.delete(from);
                const storage = global.storage || require('../sansekai').storage;
                await storage.addCoins(from, game.agent, 100);
                
                await sock.sendMessage(from, {
                    text: `🏆🕵️‍♂️ *VITÓRIA DO AGENTE SECRETO!* 🕵️‍♂️🏆\n\n` +
                        `O grupo falhou em descobrir o infiltrado! O agente era @${game.agent.split('@')[0]}!\n\n` +
                        `🎯 *Missão executada:* "${game.missionText}"\n\n` +
                        `🪙 Ele faturou *100 Bochecha-Coins* livres de impostos! O submundo saúda o rei da espionagem. 💀🥀`,
                    mentions: [game.agent]
                });
            }
        }, 10 * 60 * 1000);

        return "🕵️‍♂️ *UM AGENTE SECRETO FOI INFILTRADO!* 🕵️‍♂️\n\n" +
            "Eu acabei de enviar a missão secreta no privado do espião escolhido.\n" +
            "Observem atentamente o chat! Quem cometer uma atitude bizarra pode ser ele.\n\n" +
            "👉 Digitem */missao adivinhar @suspeito* para tentar ganhar 50 coins!";
    }
};
