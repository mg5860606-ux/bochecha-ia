module.exports = {
    definition: {
        function: {
            name: "apagar_mensagem",
            description: "Apaga uma mensagem específica no grupo. Você DEVE usar essa função APENAS quando o usuário pedir para você apagar uma mensagem e ele tiver RESPONDIDO (citado) a mensagem que deve ser apagada.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";
        
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stanzaId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = message.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (!quoted || !stanzaId) {
            return "Diga ao usuário que para apagar uma mensagem, ele precisa responder (citar) a mensagem exata que ele quer apagar e fazer o pedido para você.";
        }
        
        try {
            const key = {
                remoteJid: from,
                fromMe: false, // Assumindo que não é do bot. Se fosse do bot, daria pra checar o participant.
                id: stanzaId,
                participant: participant
            };
            
            // Verificação para nunca tentar apagar mensagem de si mesmo com fromMe: false (causa erro no baileys se errar isso)
            const myNumber = sock.user.id.split(':')[0];
            if (participant && participant.includes(myNumber)) {
                key.fromMe = true;
            }

            await sock.sendMessage(from, { delete: key });
            return "Mensagem apagada com sucesso.";
        } catch (e) {
            return `Erro ao apagar mensagem: ${e.message}. Talvez eu não seja administradora do grupo.`;
        }
    }
};
