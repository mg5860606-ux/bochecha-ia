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
        
        // 1. Se o modelo de IA especificou explicitamente um alvo nas propriedades da ferramenta, usamos ele!
        if (args.mencao) {
            const cleanedMention = args.mencao.replace(/[^0-9]/g, '');
            try {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];
                const found = participants.find(p => p.id.split('@')[0] === cleanedMention);
                if (found) {
                    target = found.id;
                }
            } catch (e) {
                console.error("Erro ao buscar JID nos participantes do grupo:", e);
            }

            if (!target) {
                if (args.mencao.includes('@lid')) {
                    target = cleanedMention + '@lid';
                } else if (args.mencao.includes('@g.us')) {
                    target = args.mencao;
                } else {
                    target = cleanedMention + '@s.whatsapp.net';
                }
            }
        }
        
        // 2. Fallbacks secundários de contexto (apenas se args.mencao não foi informado)
        if (!target) {
            const contextInfo = message.message?.extendedTextMessage?.contextInfo || message.message?.[Object.keys(message.message || {})[0]]?.contextInfo;
            if (contextInfo?.mentionedJid?.length > 0) {
                // Filtramos para não promover o próprio bot se ele foi mencionado para ativação
                const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
                const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");
                const validJid = contextInfo.mentionedJid.find(jid => {
                    const clean = jid.split('@')[0];
                    return clean !== myNumber && clean !== myLid;
                });
                if (validJid) target = validJid;
            }
            if (!target && contextInfo?.participant) {
                target = contextInfo.participant;
            }
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
