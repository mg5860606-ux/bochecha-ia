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
            return "Aviso: Não consegui identificar a menção ou número da pessoa a ser removida. Certifique-se de marcar ou citar a mensagem dela.";
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
            const targetNumber = target.split('@')[0];
            return `Membro @${targetNumber} removido com sucesso.${args.motivo ? ' Motivo: ' + args.motivo : ''}`;
        } catch (e) {
            console.error(e);
            return `Erro ao remover membro: Verifique se eu sou administradora do grupo.`;
        }
    }
};
