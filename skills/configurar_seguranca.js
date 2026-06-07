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
        
        // Fallback para comando direto: /configurar_seguranca <protecao> <on|off>
        if (!args.protecao || args.estado === undefined) {
            const texto = (args.texto || args.alvo || '').trim().toLowerCase();
            if (texto) {
                const partes = texto.split(/\s+/);
                if (partes[0]) args.protecao = partes[0];
                if (partes[1] !== undefined) {
                    args.estado = ['on', 'true', '1', 'ativar', 'ativo'].includes(partes[1]) ? true : false;
                }
            }
            if (!args.protecao || args.estado === undefined) {
                return "❌ Use: /configurar_seguranca <protecao> on | off\nEx: /configurar_seguranca antilink on";
            }
        }

        const storage = global.storage || require("../sansekai").storage;
        await storage.updateGroupSecurity(from, args.protecao, args.estado);
        
        const status = args.estado ? "ATIVADO ✅" : "DESATIVADO ❌";
        await sock.sendMessage(from, { text: `🛡️ Segurança de Grupo Atualizada!\n\nProteção: *${args.protecao.toUpperCase()}*\nEstado: ${status}` });
        
        return `A proteção ${args.protecao} foi configurada para ${args.estado}.`;
    }
};
