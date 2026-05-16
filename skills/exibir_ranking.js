const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "rankativo",
            description: "Exibe o ranking de usuários mais ativos do grupo (Ranking de XP).",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from }) {
        const rankingPath = path.join(__dirname, 'database_ranking.json');
        
        if (!fs.existsSync(rankingPath)) {
            return "🏮 Ainda não há dados de ranking neste grupo. Comecem a conversar!";
        }

        const db = JSON.parse(fs.readFileSync(rankingPath));
        if (!db[from]) return "🏮 Ainda não há dados de ranking neste grupo. Comecem a conversar!";

        const groupData = db[from];
        const sorted = Object.entries(groupData)
            .sort(([, a], [, b]) => b.xp - a.xp)
            .slice(0, 10); // Top 10

        let text = `🏆 *RANKING DE ATIVIDADE - TOP 10* 🏆\n\n`;
        
        const medals = ["🥇", "🥈", "🥉", "👤", "👤", "👤", "👤", "👤", "👤", "👤"];
        const mentions = [];

        sorted.forEach(([jid, data], index) => {
            const level = data.level || 1;
            const xp = data.xp || 0;
            const name = data.name || "Membro";
            
            text += `${medals[index]} *${index + 1}º* - @${jid.split('@')[0]}\n`;
            text += `┇ ⚡ *Nível:* ${level}\n`;
            text += `┇ 📊 *Mensagens:* ${xp}\n\n`;
            mentions.push(jid);
        });

        text += `_Continue conversando para subir de nível!_ 🚀`;

        await sock.sendMessage(from, { text, mentions });
        return "Ranking exibido com sucesso.";
    }
};
