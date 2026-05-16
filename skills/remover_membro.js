const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "remover_membro",
            description: "Remove um membro do grupo. Só funciona em grupos e se o bot for administrador.",
            parameters: {
                type: "object",
                properties: {
                    mencao: {
                        type: "string",
                        description: "O número ou menção da pessoa a ser removida (ex: 5594991855060 ou @5594991855060)"
                    },
                    motivo: {
                        type: "string",
                        description: "Opcional: O motivo da remoção"
                    }
                },
                required: ["mencao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        let target = args.mencao.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        // Se a IA capturou uma menção com @, o Baileys já pode ter isso no message.mentionedJid
        if (message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        try {
            // Proteção: Nunca remover o próprio bot ou o dono
            const owners = ["556584770585", "176291932332072"];
            const myNumber = sock.user.id.split(':')[0];
            const isOwner = owners.some(num => target.includes(num));

            if (target.includes(myNumber) || isOwner) {
                return "🚨 Erro de segurança: Não tenho permissão para remover o dono ou a mim mesma do grupo!";
            }

            console.log(chalk.red(`[🚫 BAN] Removendo: ${target}`));
            await sock.groupParticipantsUpdate(from, [target], "remove");
            return `Membro ${target.split('@')[0]} removido com sucesso.${args.motivo ? ' Motivo: ' + args.motivo : ''}`;
        } catch (e) {
            console.error(e);
            return `Erro ao remover membro: Verifique se eu sou administradora do grupo.`;
        }
    }
};
