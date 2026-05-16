module.exports = {
    definition: {
        function: {
            name: "promover_membro",
            description: "Promove um membro do grupo ao cargo de administrador. O membro DEVE ser citado ou marcado.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        const participant = message.message?.extendedTextMessage?.contextInfo?.participant;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targets = [];
        if (participant) targets.push(participant);
        if (mentionedJid.length > 0) targets.push(...mentionedJid);
        
        if (targets.length === 0) return "Aviso: O usuário não marcou ou citou a pessoa que deveria ser promovida.";
        
        try {
            await sock.groupParticipantsUpdate(from, targets, 'promote');
            return `Membro(s) promovido(s) a Administrador com sucesso. Parabéns a ele!`;
        } catch (e) {
            return `Erro ao promover membro: ${e.message}. O Bochecha precisa ser administrador do grupo para dar poder a outros.`;
        }
    }
};
