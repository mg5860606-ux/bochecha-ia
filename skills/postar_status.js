const { downloadContentFromMessage, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    definition: {
        function: {
            name: "postar_status",
            description: "Envia uma mensagem especial com layout de 'Status' (groupStatusMessageV2) dentro do grupo atual. Se o usuário CITAR uma mídia/texto, envia isso. Senão, envia o texto passado.",
            parameters: {
                type: "object",
                properties: {
                    texto: {
                        type: "string",
                        description: "O texto a ser postado (só usado se nenhuma mensagem for citada)."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, message }) {
        try {
            let innerMessage = null;
            let msgObj = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // 1. MONTAR O CONTEÚDO (INNER MESSAGE)
            if (msgObj) {
                const mediaType = Object.keys(msgObj)[0];
                
                if (mediaType === 'conversation' || mediaType === 'extendedTextMessage') {
                    const text = msgObj.conversation || msgObj.extendedTextMessage?.text;
                    innerMessage = {
                        extendedTextMessage: {
                            text: text,
                            backgroundArgb: 0xFF1E1E1E,
                            font: 1
                        }
                    };
                } else if (['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) {
                    await sock.sendMessage(from, { text: "📲 Baixando mídia citada para converter em Status de Grupo..." });
                    
                    const stream = await downloadContentFromMessage(msgObj[mediaType], mediaType.replace('Message', ''));
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    
                    const caption = msgObj[mediaType].caption || "";
                    
                    // Temos que fazer o upload pro servidor do WhatsApp primeiro para colocar no Status
                    // Mas como alternativa nativa, apenas reencaminhamos o buffer como mensagem normal
                    // Porém, para manter a fidelidade do layout de status da Baileys:
                    if (mediaType === 'imageMessage') {
                        // Sem prepareWAMessageMedia aqui pra simplificar, Baileys v6 pode crashar se não tiver.
                        // Mas vou usar a forma mais segura possível
                        innerMessage = {
                            extendedTextMessage: {
                                text: caption || "Mídia postada no status do grupo (recurso visual em adaptação)",
                                backgroundArgb: 0xFF1E1E1E
                            }
                        };
                        // Envio padrão pra garantir entrega
                        await sock.sendMessage(from, { image: buffer, caption: "Status do grupo: " + caption });
                        return "A mídia foi postada no grupo!";
                    }
                }
            } else {
                if (!args.texto) return "Aviso: Nenhum texto foi fornecido.";
                innerMessage = {
                    extendedTextMessage: {
                        text: args.texto,
                        backgroundArgb: 0xFF1B5E20, // Fundo verde escuro igual o Corvo
                        font: 1 
                    }
                };
            }
            
            // 2. EMBRULHAR NO FORMATO GROUP STATUS DO CORVO
            if (innerMessage) {
                var statusMsg = generateWAMessageFromContent(from, {
                    groupStatusMessageV2: {
                        message: {
                            viewOnceMessage: {
                                message: innerMessage
                            }
                        }
                    }
                }, {});

                await sock.relayMessage(from, statusMsg.message, { messageId: statusMsg.key.id });
                return "O Status de Grupo foi postado com sucesso!";
            }

        } catch (e) {
            return `Erro ao tentar postar Status no grupo: ${e.message}`;
        }
    }
};
