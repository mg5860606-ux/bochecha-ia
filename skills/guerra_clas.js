const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "guerra_clas",
            description: "Inicia uma Guerra de Clãs no grupo. Divide os membros ativos em 2 times aleatórios. Durante 5 minutos, quem mandar mais mensagens vence. O time perdedor paga 30 Bochecha-Coins por membro ao time vencedor.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["iniciar", "status", "cancelar"],
                        description: "Ação: 'iniciar' para começar a guerra, 'status' para ver placar atual, 'cancelar' para cancelar."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ A Guerra de Clãs só pode acontecer dentro de grupos!";

        if (!global.activeWars) global.activeWars = new Map();

        // STATUS
        if (args.acao === "status") {
            const war = global.activeWars.get(from);
            if (!war) return "⚔️ Não há guerra em andamento neste grupo.";
            const elapsed = Math.floor((Date.now() - war.startTime) / 1000);
            const remaining = Math.max(0, 300 - elapsed);
            return `⚔️ *GUERRA EM ANDAMENTO!* ⚔️\n\n🔴 *${war.teamNames[0]}:* ${war.scores[0]} mensagens\n🔵 *${war.teamNames[1]}:* ${war.scores[1]} mensagens\n\n⏱️ Tempo restante: *${remaining}s*`;
        }

        // CANCELAR
        if (args.acao === "cancelar") {
            const owners = config.OWNER_NUMBERS || [];
            const cleanSender = sender.split('@')[0];
            if (!owners.includes(cleanSender)) {
                try {
                    const meta = await sock.groupMetadata(from);
                    const isAdmin = (meta.participants || []).some(p => p.id.split('@')[0] === cleanSender && (p.admin === 'admin' || p.admin === 'superadmin'));
                    if (!isAdmin) return "❌ Só admin pode cancelar a guerra!";
                } catch (e) {
                    return "❌ Só admin pode cancelar a guerra!";
                }
            }
            if (!global.activeWars.has(from)) return "❌ Não há guerra em andamento.";
            global.activeWars.delete(from);
            return "🏳️ Guerra de Clãs cancelada pelo admin. O submundo voltou a ser pacífico... por enquanto.";
        }

        // INICIAR
        if (global.activeWars.has(from)) return "⚠️ Já existe uma Guerra de Clãs em andamento! Use '/guerra_clas status' para ver o placar.";

        let participants = [];
        try {
            const meta = await sock.groupMetadata(from);
            participants = (meta.participants || []).map(p => p.id).filter(id => {
                const clean = id.split('@')[0];
                const myNumber = (sock.user?.id || '').replace(/:.*/, '').replace(/@.*/, '');
                return clean !== myNumber;
            });
        } catch (e) {
            return "❌ Não consegui buscar os membros do grupo para dividir os times.";
        }

        if (participants.length < 4) return "❌ Precisa de pelo menos 4 membros no grupo para iniciar a Guerra de Clãs!";

        // Embaralha e divide em 2 times
        const shuffled = participants.sort(() => Math.random() - 0.5);
        const mid = Math.floor(shuffled.length / 2);
        const team0 = shuffled.slice(0, mid);
        const team1 = shuffled.slice(mid);

        const teamNames = ["⚔️ Leões do Caos", "🐍 Cobras do Submundo"];

        const war = {
            startTime: Date.now(),
            teamNames,
            teams: [new Set(team0), new Set(team1)],
            scores: [0, 0]
        };
        global.activeWars.set(from, war);

        const mentions = [...team0, ...team1];
        const team0List = team0.map(j => `@${j.split('@')[0]}`).join(', ');
        const team1List = team1.map(j => `@${j.split('@')[0]}`).join(', ');

        await sock.sendMessage(from, {
            text: `🚨 *GUERRA DE CLÃS DECLARADA!* 🚨\n\n` +
                `Durante *5 minutos*, cada mensagem que seu time mandar vale 1 ponto.\n` +
                `O time que mandar mais mensagens VENCE e recebe Bochecha-Coins do perdedor!\n\n` +
                `🔴 *${teamNames[0]}:*\n${team0List}\n\n` +
                `🔵 *${teamNames[1]}:*\n${team1List}\n\n` +
                `💀 *QUE A GUERRA COMECE!* O submundo vai tremer! 🥀`,
            mentions
        });

        // Timer de 5 minutos
        setTimeout(async () => {
            const finalWar = global.activeWars.get(from);
            global.activeWars.delete(from);
            if (!finalWar) return;

            const [s0, s1] = finalWar.scores;
            const storage = global.storage || require('../sansekai').storage;
            const PRIZE = 30;
            let resultText = `🏆 *GUERRA DE CLÃS — RESULTADO FINAL!* 🏆\n\n` +
                `🔴 *${finalWar.teamNames[0]}:* ${s0} mensagens\n` +
                `🔵 *${finalWar.teamNames[1]}:* ${s1} mensagens\n\n`;

            const winnerTeamIdx = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;

            if (winnerTeamIdx === -1) {
                resultText += `🤝 *EMPATE ÉPICO!* Os dois times lutaram com a mesma força. Ninguém leva nem perde coins. Honra a ambos os clãs! ⚔️`;
            } else {
                const loserTeamIdx = winnerTeamIdx === 0 ? 1 : 0;
                const winners = [...finalWar.teams[winnerTeamIdx]];
                const losers = [...finalWar.teams[loserTeamIdx]];

                // Transfer coins
                for (const loser of losers) {
                    await storage.addCoins(from, loser, -PRIZE).catch(() => {});
                }
                const totalPrize = losers.length * PRIZE;
                const perWinner = Math.floor(totalPrize / winners.length);
                for (const winner of winners) {
                    await storage.addCoins(from, winner, perWinner).catch(() => {});
                }

                resultText += `🎉 *VENCEDOR: ${finalWar.teamNames[winnerTeamIdx]}!*\n\n` +
                    `💸 Cada membro do time perdedor perdeu *${PRIZE} Bochecha-Coins*!\n` +
                    `🪙 Cada vencedor ganhou *${perWinner} Bochecha-Coins*!\n\n` +
                    `💀 O submundo fez justiça. O time perdedor tá devendo! 🥀`;
            }

            await sock.sendMessage(from, { text: resultText });
        }, 5 * 60 * 1000);

        return "A guerra foi iniciada.";
    }
};
