const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "rankativo",
            description: "Exibe o ranking de usuários mais ativos do grupo em um formato de cartão cyberpunk retro.",
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

        if (sorted.length === 0) return "🏮 Ainda não há dados de ranking neste grupo.";

        // Destaca o TOP 1 (Rei do Chat) em um cartão cibernético ultra-estilizado
        const top1Jid = sorted[0][0];
        const top1Data = sorted[0][1];
        const top1Lvl = top1Data.level || 1;
        const top1Xp = top1Data.xp || 0;
        
        // Gera barra de progresso visual para o TOP 1
        const xpForNextLevel = top1Lvl * 50; 
        const currentLevelXp = top1Xp % xpForNextLevel;
        const percent = Math.min(Math.floor((currentLevelXp / xpForNextLevel) * 100), 100);
        const progressBarSize = 10;
        const filled = Math.min(Math.floor(percent / 10), progressBarSize);
        const bar = "▓".repeat(filled) + "░".repeat(progressBarSize - filled);

        let text = `╔═══════════════════════════════╗\n` +
                   `   🌌 *BOCHECHA CYBER-RANK v4.0* 🛸\n` +
                   `╚═══════════════════════════════╝\n\n` +
                   `🏆 *REI DO SUBMUNDO (TOP #1)* 🏆\n` +
                   `┌───────────────────────────────┐\n` +
                   `  👤 *Membro:* @${top1Jid.split('@')[0]}\n` +
                   `  ⚡ *Nível:* ${top1Lvl}\n` +
                   `  📊 *Mensagens:* ${top1Xp} XPs\n` +
                   `  🎟️ *Status:* 👑 CYBER-LEGEND\n` +
                   `  📶 *XP Up:* [${bar}] ${percent}%\n` +
                   `└───────────────────────────────┘\n\n` +
                   `👾 *OS OUTROS SOBREVIVENTES* 👾\n`;

        const medals = ["🥇", "🥈", "🥉", "👤", "👤", "👤", "👤", "👤", "👤", "👤"];
        const statusList = [
            "👑 CYBER-LEGEND",
            "🛡️ SUB-INQUISIDOR",
            "💀 AGENTE DAS SOMBRAS",
            "⚔️ GLADIADOR DIGITAL",
            "🔥 MERCENÁRIO",
            "🔋 INICIADO",
            "🎮 CIBER-APRENDIZ",
            "👾 PARTICIPANTE",
            "🔌 CONECTADO",
            "👣 RECRUTA"
        ];
        const mentions = [];

        sorted.forEach(([jid, data], index) => {
            mentions.push(jid);
            if (index === 0) return; // Top 1 já foi exibido com destaque

            const lvl = data.level || 1;
            const xp = data.xp || 0;
            const status = statusList[index] || "SOBREVIVENTE";
            
            text += `\n${medals[index]} *#${index + 1}º* - @${jid.split('@')[0]}\n`;
            text += `┇ ⚡ *Nível:* ${lvl} | 📈 *Cargo:* ${status}\n`;
            text += `┇ 📊 *XP Total:* ${xp}\n`;
        });

        text += `\n*───────────────────────────────*\n`;
        text += `_Fale ativamente no chat para escalar os cargos do Bochecha!_ 🚀🥀`;

        await sock.sendMessage(from, { text, mentions });
        return "Ranking cyberpunk exibido com sucesso.";
    }
};
