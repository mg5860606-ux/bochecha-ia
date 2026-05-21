const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database_warnings.json');

module.exports = {
    definition: {
        function: {
            name: "remover_advertencia",
            description: "Remove todas as advertências (punições/warns) de um membro. O membro pode ser citado, marcado com @ ou fornecido o número.",
            parameters: {
                type: "object",
                properties: {
                    mencao: {
                        type: "string",
                        description: "Opcional: O número ou menção da pessoa (ex: @551199999999)"
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        let target = "";
        const contextInfo = message.message?.extendedTextMessage?.contextInfo || message.message?.[Object.keys(message.message || {})[0]]?.contextInfo;
        
        if (contextInfo?.mentionedJid?.length > 0) {
            target = contextInfo.mentionedJid[0];
        } else if (contextInfo?.participant) {
            target = contextInfo.participant;
        } else if (args.mencao) {
            target = args.mencao.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!target || target.length < 15) {
            return "Aviso: Não consegui identificar o usuário. Peça ao usuário para marcar, citar ou digitar o número do membro a ser perdoado.";
        }
        
        try {
            if (!fs.existsSync(dbPath)) return "Ninguém possui advertências, o banco de dados está vazio.";
            let db = JSON.parse(fs.readFileSync(dbPath));
            
            let removedCount = 0;
            if (db[from] && db[from][target]) {
                delete db[from][target];
                removedCount = 1;
            }
            
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            
            const targetNumber = target.split('@')[0];
            if (removedCount > 0) {
                return `As advertências de @${targetNumber} foram perdoadas e removidas do banco de dados com sucesso! Ficha limpa.`;
            } else {
                return `O membro @${targetNumber} não possuía NENHUMA advertência registrada no sistema. Ele já era inocente.`;
            }
        } catch (e) {
            return `Erro ao ler o banco de dados de advertências: ${e.message}`;
        }
    }
};
