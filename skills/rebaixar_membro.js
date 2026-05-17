module.exports = {
    definition: {
        function: {
            name: "rebaixar_membro",
            description: "Remove os privilégios de administrador de um membro do grupo. O membro pode ser citado, marcado com @ ou fornecido o número.",
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
            return "Aviso: Não consegui identificar o usuário. Peça ao usuário para marcar, citar ou digitar o número do membro a ser rebaixado.";
        }
        
        // Proteção contra rebaixar Dono ou Bot
        const owners = ["556584770585", "176291932332072"];
        const myNumber = sock.user.id.split(':')[0];
        const hasOwnerOrBot = owners.some(o => target.includes(o)) || target.includes(myNumber);
        
        if (hasOwnerOrBot) {
            return "🚨 Erro de segurança: Não posso rebaixar o dono ou a mim mesma!";
        }
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'demote');
            const targetNumber = target.split('@')[0];
            return `Membro @${targetNumber} rebaixado de Administrador com sucesso. Ele virou um membro comum.`;
        } catch (e) {
            return `Erro ao rebaixar membro: ${e.message}. O Bochecha precisa ser administrador do grupo.`;
        }
    }
};
