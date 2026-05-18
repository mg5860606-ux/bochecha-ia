const chalk = require('chalk');

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
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        let target = "";
        
        // 1. Se o modelo de IA especificou explicitamente um alvo nas propriedades da ferramenta, usamos ele!
        if (args.mencao) {
            const cleanedMention = args.mencao.replace(/[^0-9]/g, '');
            if (args.mencao.includes('@lid')) {
                target = cleanedMention + '@lid';
            } else if (args.mencao.includes('@g.us')) {
                target = args.mencao;
            } else {
                target = cleanedMention + '@s.whatsapp.net';
            }
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
                if (validJid) target = validJid;
            }
            if (!target && contextInfo?.participant) {
                target = contextInfo.participant;
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
            const owners = ["556584770585", "176291932332072", "556592233630", "5565992233630"];
            
            const isOwner = owners.some(num => cleanTarget.includes(num));
            const isMe = cleanTarget === myNumber || (myLid && cleanTarget === myLid);

            if (isMe || isOwner) {
                return `🚨 Erro de segurança: Não tenho permissão para remover o criador Marcos ou a mim mesma (@${cleanTarget}) do grupo!`;
            }

            console.log(chalk.red(`[🚫 BAN] Removendo: ${target}`));
            await sock.groupParticipantsUpdate(from, [target], "remove");
            const targetNumber = target.split('@')[0];
            return `Membro @${targetNumber} removido com sucesso.${args.motivo ? ' Motivo: ' + args.motivo : ''}`;
        } catch (e) {
            console.error(e);
            return `Erro ao remover membro: Verifique se eu sou administradora do grupo.`;
        }
    }
};
