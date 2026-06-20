const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "oraculo_bochecha",
            description: "O Oráculo do Bochecha lê os astros do submundo e proclama uma profecia dramática e zombeteira sobre dois membros. Abre votação de 45s pro grupo decidir se é 'real' ou 'cao'.",
            parameters: {
                type: "object",
                properties: {
                    alvo1: { type: "string", description: "O primeiro usuário mencionado." },
                    alvo2: { type: "string", description: "O segundo usuário mencionado." }
                },
                required: []
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ O Oráculo só responde nos templos dos grupos!";

        if (!global.activeOracles) global.activeOracles = new Map();
        if (global.activeOracles.has(from)) return "⚠️ O Oráculo está em transe com uma profecia ativa. Aguarde!";

        let target1 = args.alvo1;
        let target2 = args.alvo2;

        // Tenta pegar das menções se não veio explicitamente
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentions.length > 0) {
            if (!target1) target1 = mentions[0];
            if (mentions.length > 1 && !target2) target2 = mentions[1];
        }

        // Se faltar alvos, escolhe aleatoriamente do grupo
        if (!target1 || !target2) {
            try {
                const meta = await sock.groupMetadata(from);
                const participants = (meta.participants || []).map(p => p.id).filter(id => {
                    const clean = id.split('@')[0];
                    const myNumber = (sock.user?.id || '').replace(/:.*/, '').replace(/@.*/, '');
                    return clean !== myNumber;
                });
                
                if (participants.length < 2) return "❌ Preciso de pelo menos 2 membros no grupo para fazer uma profecia!";
                
                if (!target1) {
                    target1 = participants[Math.floor(Math.random() * participants.length)];
                }
                if (!target2) {
                    let candidates = participants.filter(p => p !== target1);
                    target2 = candidates[Math.floor(Math.random() * candidates.length)];
                }
            } catch (e) {
                return "❌ Falha ao consultar os astros (erro ao carregar participantes).";
            }
        }

        if (target1 === target2) return "❌ O Oráculo não faz profecias de uma pessoa só, egoísta!";

        const profecias = [
            `prevê que @target1 vai mandar um PIX por engano para @target2 e vai chorar no privado do Marcos pedindo reembolso.`,
            `revela que @target1 e @target2 estão trocando segredinhos suspeitos no privado e planejando um golpe para tirar os administradores do grupo.`,
            `enxergou na bola de cristal que @target1 vai ser mutado por flood e @target2 vai comemorar mandando figurinha de palhaço.`,
            `prevê que @target1 vai confessar seu amor secreto por @target2 na madrugada após beber duas latas de cerveja quente.`,
            `indica que @target1 vai tentar duelar contra @target2 no cassino, vai perder todas as moedas e ficar chorando pedindo esmola.`,
            `revela que @target2 na verdade é o perfil fake criado por @target1 para inflar o próprio ego e dar risada das piadas no chat.`
        ];

        const profeciaBase = profecias[Math.floor(Math.random() * profecias.length)];
        const textProfecia = profeciaBase
            .replace("@target1", `@${target1.split('@')[0]}`)
            .replace("@target2", `@${target2.split('@')[0]}`);

        const oracleState = {
            target1,
            target2,
            realVotes: new Set(),
            caoVotes: new Set(),
            voted: new Set(),
            textProfecia
        };
        global.activeOracles.set(from, oracleState);

        await sock.sendMessage(from, {
            text: `🔮 *ORÁCULO DO BOCHECHA PROCLAMA UMA PROFECIA!* 🔮\n\n` +
                `👁️ *A revelação dos astros do submundo:* \n` +
                `👉 "O Oráculo ${textProfecia}"\n\n` +
                `🔴 Plebeus, vocês acreditam nessa visão?\n` +
                `Digite *"real"* para votar que vai acontecer.\n` +
                `Digite *"caô"* para votar que é mentira pura.\n\n` +
                `⏱️ A urna fecha em *45 segundos*! Quem votar no lado vencedor ganha *20 Bochecha-Coins*! 💀🥀`,
            mentions: [target1, target2]
        });

        setTimeout(async () => {
            const finalOracle = global.activeOracles.get(from);
            global.activeOracles.delete(from);
            if (!finalOracle) return;

            const rVotes = finalOracle.realVotes.size;
            const cVotes = finalOracle.caoVotes.size;

            let result = `🔮 *O ORÁCULO FECHOU OS PORTAIS DA VISÃO* 🔮\n\n` +
                `📊 *Resultado da Urna Popular:*\n` +
                `• 👍 É REAL: *${rVotes} votos*\n` +
                `• 👎 É CAÔ: *${cVotes} votos*\n\n`;

            const storage = global.storage || require('../sansekai').storage;
            const PRIZE = 20;

            if (rVotes === 0 && cVotes === 0) {
                result += `🤷‍♂️ Ninguém se importou com o destino dos astros. A profecia foi esquecida na poeira cósmica. 💀`;
            } else if (rVotes > cVotes) {
                result += `🔥 *O POVO ACREDITA:* A profecia foi decretada como *REAL* pela maioria!\n` +
                    `🪙 Todos os crentes ganharam *${PRIZE} Bochecha-Coins*!\n\n` +
                    `💀 @${finalOracle.target1.split('@')[0]} e @${finalOracle.target2.split('@')[0]}, preparem seus destinos! A profecia se cumprirá!`;
                
                for (const winner of finalOracle.realVotes) {
                    await storage.addCoins(from, winner, PRIZE).catch(() => {});
                }
            } else if (cVotes > rVotes) {
                result += `🚫 *O POVO REJEITOU:* A profecia foi considerada puro *CAÔ*!\n` +
                    `🪙 Os céticos ganharam *${PRIZE} Bochecha-Coins*!\n\n` +
                    `💀 Os astros falharam desta vez, ou o povo tá cego. Destino cancelado!`;
                
                for (const winner of finalOracle.caoVotes) {
                    await storage.addCoins(from, winner, PRIZE).catch(() => {});
                }
            } else {
                result += `🤝 *EMPATE CÓSMICO:* As forças do real e do caô se equilibraram em *${rVotes} votos*! A profecia fica em estado quântico de indecisão. Ninguém ganha coins! 🪐`;
            }

            await sock.sendMessage(from, {
                text: result,
                mentions: [finalOracle.target1, finalOracle.target2]
            });

        }, 45000);

        return "Oráculo consultado.";
    }
};
