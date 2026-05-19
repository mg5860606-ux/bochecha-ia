const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "divorciar",
            description: "Pede divórcio do parceiro atual, rodando a roleta da partilha forçada de 50% dos bens (Bochecha-Coins).",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, { sock, from, sender, pushname }) {
        if (!from.endsWith('@g.us')) return "❌ O divórcio e a partilha forçada só acontecem no tribunal público do grupo!";

        const storage = global.storage;
        const marryDbPath = path.join(__dirname, 'database_marry.json');

        try {
            const marryDb = await storage.read(marryDbPath, {});
            const partner = marryDb[sender];

            if (!partner) {
                return "❌ Você está solteiro(a) e livre como um passarinho! Não tem de quem se divorciar, cria. Aproveite a paz! 🕊️";
            }

            const partnerName = partner.split('@')[0];
            const cleanSender = sender.split('@')[0];

            // 1. Obter saldos de moedas dos dois
            const myCoins = await storage.addCoins(from, sender, 0);
            const partnerCoins = await storage.addCoins(from, partner, 0);

            // 2. Determinar quem vai perder as moedas na partilha de bens (50% de chance para cada um)
            const victimIsSender = Math.random() < 0.5;
            
            let loserJid = victimIsSender ? sender : partner;
            let winnerJid = victimIsSender ? partner : sender;
            
            let loserName = victimIsSender ? pushname : `@${partnerName}`;
            let winnerName = victimIsSender ? `@${partnerName}` : pushname;
            
            let loserCoins = victimIsSender ? myCoins : partnerCoins;
            let stolenAmt = Math.floor(loserCoins * 0.5);

            // 3. Executar a transferência forçada
            if (stolenAmt > 0) {
                await storage.addCoins(from, loserJid, -stolenAmt);
                await storage.addCoins(from, winnerJid, stolenAmt);
            }

            // 4. Limpar o matrimônio da database
            delete marryDb[sender];
            delete marryDb[partner];
            await storage.write(marryDbPath, marryDb);

            return `💔⚖️ *DIVÓRCIO E PARTILHA FORÇADA DE BENS* ⚖️💔\n\n` +
                   `O casamento profano entre @${cleanSender} e @${partnerName} CHEGOU AO FIM! O amor acabou, e a ganância venceu!\n\n` +
                   `🏛️ *SENTENÇA DO TRIBUNAL DO BOCHECHA:*\n` +
                   `O juiz decretou a partilha de bens imediata. E a justiça foi... completamente cega!\n\n` +
                   `💸 *PENSÃO ALIMENTÍCIA:* ${loserName} perdeu a guarda dos bens e teve *50% do seu saldo confiscado*!\n` +
                   `💰 *VALOR TRANSFERIDO:* *${stolenAmt} Bochecha-Coins* foram transferidos para a conta de ${winnerName} como pensão de zoeira!\n\n` +
                   `🕊️ Ambos agora estão oficialmente *SOLTEIROS* e livres para dar o golpe em outros membros do grupo!`;

        } catch (e) {
            console.error(e);
            return `❌ Erro judicial ao decretar divórcio: ${e.message}`;
        }
    }
};
