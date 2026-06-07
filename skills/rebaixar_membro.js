const { isOwnerNumber } = require('../config');

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
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        // Verifica se quem pediu tem permissão (admin ou dono)
        if (!isOwner && !isGroupAdmins) {
            return `🚨 Acesso negado! Você não tem permissão de admin pra rebaixar ninguém. Solicite a um administrador. 💀`;
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
        const rawTargetInput = args.mencao || args.texto || args.alvo;
        if (rawTargetInput) {
            target = await resolveTarget(rawTargetInput);
        }
        
        // 2. Fallbacks secundários de contexto (apenas se args.mencao não foi informado)
        if (!target) {
            const contextInfo = message.message?.extendedTextMessage?.contextInfo || message.message?.[Object.keys(message.message || {})[0]]?.contextInfo;
            if (contextInfo?.mentionedJid?.length > 0) {
                // Filtramos para não rebaixar o próprio bot se ele foi mencionado para ativação
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
            return "Aviso: Não consegui identificar o usuário. Peça ao usuário para marcar, citar ou digitar o número do membro a ser rebaixado.";
        }
        
        // Proteção Máxima contra auto-rebaixamento ou rebaixamento do Criador (tanto via número quanto LID)
        const cleanTarget = target.split('@')[0];
        const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
        const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");
        const ownerNumbers = null; // Centralizado em config.js
        const isTargetOwner = isOwnerNumber(cleanTarget);
        const isMe = cleanTarget === myNumber || (myLid && cleanTarget === myLid);

        if (isTargetOwner) {
            return `🚨 Erro de segurança: Não tenho permissão para rebaixar o criador Marcos (@${cleanTarget})! 💀`;
        }
        
        try {
            const response = await sock.groupParticipantsUpdate(from, [target], 'demote');
            const status = response?.[0]?.status;

            if (status === '200' || status === 200 || !status) {
                const targetNumber = target.split('@')[0];
                return `Membro @${targetNumber} rebaixado de Administrador com sucesso. Ele virou um membro comum.`;
            } else if (status === '404' || status === 404) {
                return `Aviso: O usuário @${target.split('@')[0]} não é um administrador ou já foi rebaixado.`;
            } else if (status === '403' || status === 403) {
                return `Erro: Não tenho permissão de administrador suficiente para rebaixar @${target.split('@')[0]}.`;
            } else {
                return `Erro ao rebaixar @${target.split('@')[0]}. Status do WhatsApp: ${status}.`;
            }
        } catch (e) {
            return `Erro ao rebaixar membro: ${e.message}. O Bochecha precisa ser administrador do grupo.`;
        }
    }
};
