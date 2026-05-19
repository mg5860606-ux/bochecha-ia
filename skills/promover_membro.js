const { isOwnerNumber } = require('../config');

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
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        // Verifica se quem pediu tem permissão (admin ou dono)
        if (!isOwner && !isGroupAdmins) {
            return `🚨 Acesso negado! Você não tem permissão de admin pra promover ninguém. Solicite a um administrador. 💀`;
        }
        const resolveTarget = async (inputJid) => {
            if (!inputJid) return "";
            const cleanInput = inputJid.replace(/[^0-9]/g, '');
            try {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];
                
                // 1. Tenta achar diretamente na lista de participantes
                let found = participants.find(p => p.id.split('@')[0] === cleanInput);
                if (found) return found.id;
                
                // 2. Se não achar, tenta buscar na AuthState (mapeamento LID -> JID do Baileys)
                const authState = sock.authState;
                if (authState && authState.creds && authState.creds.lidToJid) {
                    const map = authState.creds.lidToJid;
                    const matchingLid = Object.keys(map).find(lid => {
                        const mappedJid = map[lid] || "";
                        return mappedJid.split('@')[0] === cleanInput;
                    });
                    if (matchingLid) {
                        const foundLid = participants.find(p => p.id === matchingLid);
                        if (foundLid) return foundLid.id;
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar JID/LID no grupo:", e);
            }
            // Se tudo falhar, retorna o JID construído
            return inputJid.includes('@') ? inputJid : `${cleanInput}@s.whatsapp.net`;
        };

        let target = "";
        
        // 1. Se o modelo de IA especificou explicitamente um alvo nas propriedades da ferramenta, usamos ele!
        if (args.mencao) {
            target = await resolveTarget(args.mencao);
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
                if (validJid) target = await resolveTarget(validJid);
            }
            if (!target && contextInfo?.participant) {
                target = await resolveTarget(contextInfo.participant);
            }
        }

        if (!target || target.length < 15) {
            return "Aviso: Não consegui identificar o usuário. Peça ao usuário para marcar, citar ou digitar o número do membro a ser promovido.";
        }
        
        try {
            const response = await sock.groupParticipantsUpdate(from, [target], 'promote');
            const status = response?.[0]?.status;

            if (status === '200' || status === 200 || !status) {
                const targetNumber = target.split('@')[0];
                return `Membro @${targetNumber} promovido a Administrador com sucesso. Parabéns a ele!`;
            } else if (status === '409' || status === 409) {
                return `Aviso: O usuário @${target.split('@')[0]} já é um administrador deste grupo.`;
            } else if (status === '403' || status === 403) {
                return `Erro: Não tenho permissão de administrador ou nível de permissão suficiente para promover @${target.split('@')[0]}.`;
            } else {
                return `Erro ao promover @${target.split('@')[0]}. Status do WhatsApp: ${status}.`;
            }
        } catch (e) {
            return `Erro ao promover membro: ${e.message}. O Bochecha precisa ser administrador do grupo para dar poder a outros.`;
        }
    }
};
