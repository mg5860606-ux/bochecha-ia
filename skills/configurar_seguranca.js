const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database_security.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

module.exports = {
    definition: {
        function: {
            name: "configurar_seguranca",
            description: "Ativa ou desativa as proteções de segurança automáticas do grupo (antilink, antifake, antiflood).",
            parameters: {
                type: "object",
                properties: {
                    protecao: {
                        type: "string",
                        enum: ["antilink", "antifake", "antiflood", "antistatus", "antiporn", "antipagamento", "antipromote", "antidemote", "antidelete", "bemvindo"],
                        description: "Qual proteção deseja configurar."
                    },
                    estado: {
                        type: "boolean",
                        description: "true para ativar, false para desativar."
                    }
                },
                required: ["protecao", "estado"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";
        
        let db = JSON.parse(fs.readFileSync(dbPath));
        if (!db[from]) db[from] = { antilink: false, antifake: false, antiflood: false };
        
        db[from][args.protecao] = args.estado;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        
        const status = args.estado ? "ATIVADO ✅" : "DESATIVADO ❌";
        await sock.sendMessage(from, { text: `🛡️ Segurança de Grupo Atualizada!\n\nProteção: *${args.protecao.toUpperCase()}*\nEstado: ${status}` });
        
        return `A proteção ${args.protecao} foi configurada para ${args.estado}.`;
    }
};
