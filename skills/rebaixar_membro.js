module.exports = {
    definition: {
        function: {
            name: "rebaixar_membro",
            description: "Remove os privilégios de administrador de um membro do grupo. O membro DEVE ser citado ou marcado.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        const participant = message.message?.extendedTextMessage?.contextInfo?.participant;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targets = [];
        if (participant) targets.push(participant);
        if (mentionedJid.length > 0) targets.push(...mentionedJid);
        
        if (targets.length === 0) return "Aviso: O usuário não marcou ou citou a pessoa que deveria ser rebaixada.";
        
        // Proteção contra rebaixar Dono ou Bot
        const owners = ["556584770585", "176291932332072"];
        const myNumber = sock.user.id.split(':')[0];
        const hasOwnerOrBot = targets.some(t => owners.some(o => t.includes(o)) || t.includes(myNumber));
        
        if (hasOwnerOrBot) {
            return "🚨 Erro de segurança: Não posso rebaixar o dono ou a mim mesma!";
        }
        
        try {
            await sock.groupParticipantsUpdate(from, targets, 'demote');
            return `Membro(s) rebaixado(s) de Administrador com sucesso. Ele virou um membro comum.`;
        } catch (e) {
            return `Erro ao rebaixar membro: ${e.message}. O Bochecha precisa ser administrador do grupo.`;
        }
    }
};
