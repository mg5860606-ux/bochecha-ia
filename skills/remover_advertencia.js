const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database_warnings.json');

module.exports = {
    definition: {
        function: {
            name: "remover_advertencia",
            description: "Remove todas as advertências (punições/warns) de um membro. O membro DEVE ser citado ou marcado.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        const participant = message.message?.extendedTextMessage?.contextInfo?.participant;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targets = [];
        if (participant) targets.push(participant);
        if (mentionedJid.length > 0) targets.push(...mentionedJid);
        
        if (targets.length === 0) return "Aviso: Nenhum usuário marcado. Peça ao usuário para marcar quem ele quer perdoar.";
        
        try {
            if (!fs.existsSync(dbPath)) return "Ninguém possui advertências, o banco de dados está vazio.";
            let db = JSON.parse(fs.readFileSync(dbPath));
            
            let removedCount = 0;
            targets.forEach(t => {
                const key = `${from}-${t}`;
                if (db[key]) {
                    delete db[key];
                    removedCount++;
                }
            });
            
            fs.writeFileSync(dbPath, JSON.stringify(db));
            
            if (removedCount > 0) {
                return `As advertências foram perdoadas e removidas do banco de dados com sucesso! Ficha limpa.`;
            } else {
                return `O membro citado não possuía NENHUMA advertência registrada no sistema. Ele já era inocente.`;
            }
        } catch (e) {
            return `Erro ao ler o banco de dados de advertências: ${e.message}`;
        }
    }
};
