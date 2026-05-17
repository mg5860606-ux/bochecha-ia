module.exports = {
    definition: {
        function: {
            name: "promover_membro",
            description: "Promove um membro do grupo ao cargo de administrador. O membro pode ser citado, marcado com @ ou fornecido o número.",
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
            return "Aviso: Não consegui identificar o usuário. Peça ao usuário para marcar, citar ou digitar o número do membro a ser promovido.";
        }
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'promote');
            const targetNumber = target.split('@')[0];
            return `Membro @${targetNumber} promovido a Administrador com sucesso. Parabéns a ele!`;
        } catch (e) {
            return `Erro ao promover membro: ${e.message}. O Bochecha precisa ser administrador do grupo para dar poder a outros.`;
        }
    }
};
