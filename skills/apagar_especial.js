module.exports = {
    definition: {
        function: {
            name: "apagar_especial",
            description: "Deleta mensagens de Status (Stories) do próprio bot ou mensagens sensíveis (ex: cobranças). O usuário DEVE citar a mensagem.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, { sock, from, message }) {
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const stanzaId = contextInfo?.stanzaId;
        let participant = contextInfo?.participant;
        
        if (!stanzaId) {
            return "Aviso ao usuário: Você precisa responder (citar) o Status que deseja que eu apague.";
        }
        
        try {
            const myNumber = sock.user.id.split(':')[0];
            
            // Lógica especial para detectar Status
            let remoteJid = from;
            if (contextInfo.remoteJid === 'status@broadcast' || participant === 'status@broadcast') {
                remoteJid = 'status@broadcast';
                participant = myNumber + '@s.whatsapp.net';
            }
            
            const key = {
                remoteJid: remoteJid,
                fromMe: participant ? participant.includes(myNumber) : false,
                id: stanzaId,
                participant: participant
            };
            
            await sock.sendMessage(remoteJid, { delete: key });
            return "Mensagem especial apagada com sucesso.";
        } catch (e) {
            return `Erro ao apagar mensagem especial: ${e.message}`;
        }
    }
};
