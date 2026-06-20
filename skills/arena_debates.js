const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "arena_debates",
            description: "Abre uma Arena de Debates pública entre dois membros sobre um tema polêmico. Consiste em 3 fases: Fase 1 (Discurso do Desafiante, 40s), Fase 2 (Réplica do Desafiado, 40s) e Fase 3 (Júri Popular, 40s).",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["iniciar", "status", "cancelar", "votar"],
                        description: "Ação a executar na Arena."
                    },
                    alvo: {
                        type: "string",
                        description: "O JID ou menção do oponente (para 'iniciar') ou candidato preferido (para 'votar')."
                    },
                    tema: {
                        type: "string",
                        description: "O tema do debate."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ A Arena de Debates só pode ser montada dentro de grupos!";

        if (!global.activeDebates) global.activeDebates = new Map();

        // CANCELAR
        if (args.acao === "cancelar") {
            const debate = global.activeDebates.get(from);
            if (!debate) return "❌ Não há nenhum debate rolando agora.";
            
            const owners = config.OWNER_NUMBERS || [];
            const cleanSender = sender.split('@')[0];
            if (!owners.includes(cleanSender) && sender !== debate.challenger && sender !== debate.opponent) {
                return "❌ Apenas os debatedores ou o Criador Marcos podem cancelar o debate!";
            }
            
            global.activeDebates.delete(from);
            return "💥 Debate cancelado! As espadas foram guardadas e a discussão acabou em pizza. 🍕";
        }

        // STATUS
        if (args.acao === "status") {
            const debate = global.activeDebates.get(from);
            if (!debate) return "🎤 O microfone está desligado. Ninguém está debatendo no momento.";
            
            const remaining = Math.max(0, Math.ceil((40000 - (Date.now() - debate.phaseStart)) / 1000));
            return `🎤 *ARENA DE DEBATES — STATUS* 🎤\n\n` +
                `⚔️ *Desafiante:* @${debate.challenger.split('@')[0]}\n` +
                `🛡️ *Desafiado:* @${debate.opponent.split('@')[0]}\n` +
                `📝 *Tema:* "${debate.topic}"\n\n` +
                `⏳ *Fase Atual:* ${debate.phase.toUpperCase()}\n` +
                `⏱️ Tempo restante na fase: *${remaining}s*`;
        }

        // VOTAR
        if (args.acao === "votar") {
            const debate = global.activeDebates.get(from);
            if (!debate) return "❌ Não há nenhum debate ativo para votar.";
            if (debate.phase !== "votacao") return "❌ A votação ainda não está aberta! Espere os debatedores falarem.";

            let voteTarget = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!voteTarget && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                voteTarget = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            if (!voteTarget) return "❌ Você precisa marcar ou responder ao debatedor em quem deseja votar!";

            const cleanVoteTarget = voteTarget.split('@')[0];
            const cleanChallenger = debate.challenger.split('@')[0];
            const cleanOpponent = debate.opponent.split('@')[0];

            if (cleanVoteTarget !== cleanChallenger && cleanVoteTarget !== cleanOpponent) {
                return "❌ Esse usuário não é um debatedor nesta arena! Vote apenas nos debatedores.";
            }

            if (sender === debate.challenger || sender === debate.opponent) {
                return "❌ Debatedores não podem votar em si mesmos nem no oponente! Tenha decência.";
            }

            if (debate.voted.has(sender)) {
                return "❌ Você já deu o seu voto de júri neste debate.";
            }

            debate.voted.add(sender);
            const votes = debate.votes.get(voteTarget) || 0;
            debate.votes.set(voteTarget, votes + 1);

            return `🗳️ Voto computado para @${cleanVoteTarget}!`;
        }

        // INICIAR
        if (global.activeDebates.has(from)) {
            return "⚠️ Já existe uma arena de debate montada neste grupo! Aguarde a conclusão.";
        }

        let opponent = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
        if (!opponent && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            opponent = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        if (!opponent) return "❌ Você precisa desafiar um oponente marcando ele ou respondendo à sua mensagem!";
        if (opponent === sender) return "❌ Você não pode debater consigo mesmo, seu esquizofrênico!";

        const topic = args.tema || "Se biscoito ou bolacha é o termo correto";

        const debate = {
            challenger: sender,
            opponent,
            topic,
            phase: "discurso_desafiante",
            phaseStart: Date.now(),
            votes: new Map(),
            voted: new Set()
        };
        debate.votes.set(sender, 0);
        debate.votes.set(opponent, 0);

        global.activeDebates.set(from, debate);

        await sock.sendMessage(from, {
            text: `🎤⚔️ *ARENA DE DEBATES: O CONFRONTO COMEÇOU!* ⚔️🎤\n\n` +
                `🗣️ *Desafiante:* @${sender.split('@')[0]}\n` +
                `🛡️ *Desafiado:* @${opponent.split('@')[0]}\n` +
                `📝 *Tema em debate:* "${topic}"\n\n` +
                `📢 *FASE 1: DISCURSO DO DESAFIANTE!*\n` +
                `👉 @${sender.split('@')[0]}, você tem *40 segundos* para defender sua tese! Digite sua resposta no chat agora. O oponente não deve interromper!`,
            mentions: [sender, opponent]
        });

        // Fase 1 -> Fase 2 (Réplica)
        setTimeout(async () => {
            const deb1 = global.activeDebates.get(from);
            if (!deb1 || deb1.phase !== "discurso_desafiante") return;

            deb1.phase = "replica_desafiado";
            deb1.phaseStart = Date.now();

            await sock.sendMessage(from, {
                text: `🎤⚔️ *ARENA DE DEBATES: RÉPLICA DO DESAFIADO!* ⚔️🎤\n\n` +
                    `📢 *FASE 2: DISCURSO DO DESAFIADO!*\n` +
                    `👉 @${deb1.opponent.split('@')[0]}, você tem *40 segundos* para refutar os argumentos e apresentar sua tese! O tempo está rodando, digite!`,
                mentions: [deb1.opponent]
            });

            // Fase 2 -> Fase 3 (Votação)
            setTimeout(async () => {
                const deb2 = global.activeDebates.get(from);
                if (!deb2 || deb2.phase !== "replica_desafiado") return;

                deb2.phase = "votacao";
                deb2.phaseStart = Date.now();

                await sock.sendMessage(from, {
                    text: `🎤⚔️ *ARENA DE DEBATES: JÚRI POPULAR ABERTO!* ⚔️🎤\n\n` +
                        `O tempo de fala acabou! Agora é com os plebeus!\n\n` +
                        `👉 Digite no chat *"votar"* respondendo ao debatedor preferido ou digite:\n` +
                        `• */debate votar @${deb2.challenger.split('@')[0]}*\n` +
                        `• */debate votar @${deb2.opponent.split('@')[0]}*\n\n` +
                        `⏱️ A votação se encerra em *40 segundos*! Votem agora!`,
                    mentions: [deb2.challenger, deb2.opponent]
                });

                // Fase 3 -> Encerramento
                setTimeout(async () => {
                    const finalDeb = global.activeDebates.get(from);
                    global.activeDebates.delete(from);
                    if (!finalDeb) return;

                    const vChallenger = finalDeb.votes.get(finalDeb.challenger) || 0;
                    const vOpponent = finalDeb.votes.get(finalDeb.opponent) || 0;

                    let resultText = `🎤👨‍⚖️ *ARENA DE DEBATES — SENTENÇA DO TRIBUNAL DO CHAT* 👨‍⚖️🎤\n\n` +
                        `O confronto de ideias sobre "${finalDeb.topic}" chegou ao fim!\n\n` +
                        `📊 *Resultado dos Votos:*\n` +
                        `• @${finalDeb.challenger.split('@')[0]}: *${vChallenger} votos*\n` +
                        `• @${finalDeb.opponent.split('@')[0]}: *${vOpponent} votos*\n\n`;

                    const storage = global.storage || require('../sansekai').storage;
                    const PRIZE = 50;

                    if (vChallenger > vOpponent) {
                        await storage.addCoins(from, finalDeb.challenger, PRIZE);
                        await storage.addCoins(from, finalDeb.opponent, -PRIZE);
                        resultText += `🏆 *VENCEDOR DO DEBATE:* @${finalDeb.challenger.split('@')[0]}!\n` +
                            `🪙 Ele faturou *${PRIZE} Bochecha-Coins* arrancadas do oponente derrotado! A retórica dele foi imbatível! 💀🥀`;
                    } else if (vOpponent > vChallenger) {
                        await storage.addCoins(from, finalDeb.opponent, PRIZE);
                        await storage.addCoins(from, finalDeb.challenger, -PRIZE);
                        resultText += `🏆 *VENCEDOR DO DEBATE:* @${finalDeb.opponent.split('@')[0]}!\n` +
                            `🪙 Ele faturou *${PRIZE} Bochecha-Coins* arrancadas do oponente derrotado! A dialética dele massacrou! 💀🥀`;
                    } else {
                        resultText += `🤝 *EMPATE INTELECTUAL!* Ambos os debatedores terminaram com *${vChallenger} votos*. A banca declarou empate e nenhuma moeda mudou de dono. O debate continuará em segredo nas mentes dos plebeus! 🪐`;
                    }

                    await sock.sendMessage(from, {
                        text: resultText,
                        mentions: [finalDeb.challenger, finalDeb.opponent]
                    });

                }, 40000);

            }, 40000);

        }, 40000);

        return "Arena de debate criada.";
    }
};
