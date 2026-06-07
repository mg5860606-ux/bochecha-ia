const chalk = require('chalk');
const { OWNER_NUMBERS, isOwnerNumber } = require('../config');

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
    async execute(args, { sock, from, message, isOwner }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        const sender = message.key.participant || message.key.remoteJid;
        let isGroupAdmins = false;
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const admins = participants.filter(p => p.admin !== null).map(p => p.id);
            isGroupAdmins = admins.includes(sender);
        } catch (e) {}

        if (!isGroupAdmins && !isOwner) {
            return "❌ Apenas administradores do grupo ou o Arquiteto podem usar este comando.";
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
                // Filtramos para não remover o próprio bot se ele foi mencionado para ativação
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
            return "Aviso: Não consegui identificar a menção ou número da pessoa a ser removida. Certifique-se de marcar ou citar a mensagem dela.";
        }

        try {
            // Proteção Máxima contra auto-banimento ou remoção do Criador (tanto via número quanto LID)
            const cleanTarget = target.split('@')[0];
            const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
            const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");
            const isTargetOwner = isOwnerNumber(cleanTarget);
            const isMe = cleanTarget === myNumber || (myLid && cleanTarget === myLid);

            // Bloqueio de remoção do criador Marcos
            if (isTargetOwner) {
                return `🚨 Erro de segurança: Não tenho permissão para remover o criador Marcos (@${cleanTarget}) do grupo! Tá louco ou quê? 💀`;
            }

            // Bloqueio de auto-remoção: NINGUÉM manda o bot sair do grupo, nem admin, nem ninguém
            if (isMe) {
                const senderNumber = (message.key?.participant || message.key?.remoteJid || "").replace(/:.*/, "").replace(/@.*/, "");
                const senderIsOwner = isOwnerNumber(senderNumber);
                if (senderIsOwner) {
                    // Apenas o Marcos pode forçar a saída do bot do grupo
                    await sock.groupLeave(from);
                    return "saindo do grupo como você mandou, Marcos. 🥀";
                }
                return `🚨 Não vou sair do grupo não! você não é meu dono, @${senderNumber}. Fala isso pro Marcos se quiser que eu saia, pé de breque kkkkk 😂💀`;
            }

            console.log(chalk.red(`[🚫 BAN] Removendo: ${target}`));
            const response = await sock.groupParticipantsUpdate(from, [target], "remove");
            const status = response?.[0]?.status;

            if (status === '200' || status === 200 || !status) {
                const targetNumber = target.split('@')[0];
                return `Membro @${targetNumber} removido com sucesso.${args.motivo ? ' Motivo: ' + args.motivo : ''}`;
            } else if (status === '404' || status === 404) {
                return `Aviso: O usuário @${target.split('@')[0]} não faz parte deste grupo ou já foi removido.`;
            } else if (status === '403' || status === 403) {
                return `Erro: Não tenho permissão de administrador suficiente para remover @${target.split('@')[0]}.`;
            } else {
                return `Erro ao remover @${target.split('@')[0]}. Status do WhatsApp: ${status}.`;
            }
        } catch (e) {
            console.error(e);
            return `Erro ao remover membro: Verifique se eu sou administradora do grupo.`;
        }
    }
};
