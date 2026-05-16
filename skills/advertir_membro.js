const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database_warnings.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

module.exports = {
    definition: {
        function: {
            name: "advertir_membro",
            description: "Dá uma advertência oficial a um membro do grupo. Ao atingir 3 advertências, avise ao usuário na sua resposta.",
            parameters: {
                type: "object",
                properties: {
                    mencao: { type: "string", description: "O ID ou número do usuário (ex: @551199999999)" },
                    motivo: { type: "string", description: "O motivo da advertência" }
                },
                required: ["mencao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";
        
        let target = args.mencao.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        // Proteção: Nunca advertir o próprio bot
        const myNumber = sock.user.id.split(':')[0];
        if (target.includes(myNumber)) return "Eu não posso me advertir! Isso é ilógico.";

        let db = JSON.parse(fs.readFileSync(dbPath));
        if (!db[from]) db[from] = {};
        if (!db[from][target]) db[from][target] = 0;
        
        db[from][target] += 1;
        const avisos = db[from][target];
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        
        let msg = `⚠️ *ADVERTÊNCIA OFICIAL* ⚠️\n\nMembro: @${target.split('@')[0]}\nAviso: ${avisos}/3`;
        if (args.motivo) msg += `\nMotivo: ${args.motivo}`;
        if (avisos >= 3) msg += "\n\n🚨 Limite de avisos atingido! O membro está sujeito a banimento.";
        
        await sock.sendMessage(from, { text: msg, mentions: [target] });
        return `O membro tem ${avisos} de 3 avisos.`;
    }
};
