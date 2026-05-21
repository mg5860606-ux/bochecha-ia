const path = require('path');
const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "tribunal",
            description: "Abre um julgamento público contra um membro do grupo. Se for culpado pela maioria das mensagens de voto (culpado/inocente) em 45 segundos, ele é banido do grupo com auto-convite no PV.",
            parameters: {
                type: "object",
                properties: {
                    alvo: {
                        type: "string",
                        description: "O JID ou menção do réu."
                    },
                    motivo: {
                        type: "string",
                        description: "O crime cometido pelo réu."
                    }
                },
                required: ["alvo", "motivo"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ O tribunal de júri popular só tem validade jurídica dentro de grupos público-profanos!";
 
        // Inicializa estrutura global de tribunais ativos se não existir
        if (!global.activeTribunals) global.activeTribunals = new Map();
 
        if (global.activeTribunals.has(from)) {
            return "⚠️ Já existe um julgamento em andamento neste grupo! Aguarde a sentença antes de abrir outro processo.";
        }
 
        // Determina o réu (alvo)
        const resolveTarget = async (inputStr) => {
            if (!inputStr) return "";
            if (inputStr.endsWith('@s.whatsapp.net') || inputStr.endsWith('@lid')) {
                return inputStr;
            }
            const firstToken = inputStr.split(/\s+/)[0];
            const cleanToken = firstToken.replace(/[^a-zA-Z0-9]/g, '');
            const numericToken = firstToken.replace(/[^0-9]/g, '');

            try {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];

                if (numericToken.length >= 8) {
                    const found = participants.find(p => p.id.split('@')[0] === numericToken);
                    if (found) return found.id;
                }

                if (cleanToken.length >= 2 && global.BochechaEngine?.storeRef?.contacts) {
                    const contacts = global.BochechaEngine.storeRef.contacts;
                    const searchLower = cleanToken.toLowerCase();
                    for (const p of participants) {
                        const contact = contacts[p.id];
                        if (contact) {
                            const name = (contact.name || contact.notify || contact.verifiedName || "").toLowerCase();
                            if (name.includes(searchLower) || searchLower.includes(name)) {
                                return p.id;
                            }
                        }
                    }
                }

                if (cleanToken.length >= 2 && global.BochechaEngine?.storeRef?.contacts) {
                    const contacts = global.BochechaEngine.storeRef.contacts;
                    const searchLower = cleanToken.toLowerCase();
                    for (const jid in contacts) {
                        const contact = contacts[jid] || {};
                        const name = (contact.name || contact.notify || contact.verifiedName || "").toLowerCase();
                        if (name.includes(searchLower) || searchLower.includes(name)) {
                            const foundInGroup = participants.find(p => p.id.split('@')[0] === jid.split('@')[0]);
                            if (foundInGroup) return foundInGroup.id;
                        }
                    }
                }
            } catch (e) {
                console.error("Erro ao resolver alvo no Tribunal:", e);
            }
            return "";
        };

        let target = "";
        
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
            const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");
            const validJid = message.message.extendedTextMessage.contextInfo.mentionedJid.find(jid => {
                const clean = jid.split('@')[0];
                return clean !== myNumber && clean !== myLid;
            });
            if (validJid) target = validJid;
        }

        if (!target && message.message?.extendedTextMessage?.contextInfo?.participant) {
            target = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!target && args.alvo) {
            target = await resolveTarget(args.alvo);
        }

        if (!target) {
            return "❌ Você precisa marcar (@número), citar por nome ou responder à mensagem do vacilão que deseja julgar!";
        }

        let reason = (args.motivo || args.texto || "respirar muito perto dos administradores").trim();
        if (args.texto) {
            const firstToken = args.texto.split(/\s+/)[0];
            if (firstToken.startsWith('@')) {
                reason = args.texto.substring(firstToken.length).trim();
            }
        }
        if (!reason) {
            reason = "respirar muito perto dos administradores";
        }

        const cleanSender = sender.split('@')[0];
        const cleanTarget = target.split('@')[0];
 
        // 1. Impedir de se julgar
        if (target === sender) {
            return "❌ Você não pode abrir um tribunal contra si mesmo, masoquista do caralho!";
        }
 
        // 2. Proteção do Criador Supremo (Marcos)
        const owners = config.OWNER_NUMBERS || ["551420370026"];
        if (owners.includes(cleanTarget)) {
            return "🚨 *IMPEACHMENT NEGADO!* 🚨\n\nVocê tentou julgar o programador supremo Marcos! O tribunal considerou isso um crime de lesa-majestade, a petição foi anulada e você foi considerado um completo pé de breque! Contemple sua insignificância! 💀🥀";
        }

        try {
            // Cria o tribunal na memória
            const tribunalState = {
                target,
                guiltyVotes: new Set(),
                innocentVotes: new Set(),
                voted: new Set()
            };
            global.activeTribunals.set(from, tribunalState);

            // Envia mensagem de abertura de júri
            await sock.sendMessage(from, {
                text: `⚖️ *JÚRI POPULAR ABERTO NO TRIBUNAL DO BOCHECHA* ⚖️\n\n` +
                      `👤 *Réu:* @${cleanTarget}\n` +
                      `🗣️ *Acusador:* @${cleanSender}\n` +
                      `📝 *Acusação:* "${reason}"\n\n` +
                      `👉 *COMO VOTAR:*\n` +
                      `Qualquer membro do grupo tem *45 segundos* para digitar no chat:\n` +
                      `• *"culpado"* para condenar o réu ao banimento.\n` +
                      `• *"inocente"* para absolver o réu das acusações.\n\n` +
                      `⚖️ _Que a voz do povo decrete o destino! Votem agora!_`,
                mentions: [sender, target]
            });

            // Timer de 45 segundos para coletar e encerrar o júri
            setTimeout(async () => {
                const finalState = global.activeTribunals.get(from);
                global.activeTribunals.delete(from);

                if (!finalState) return;

                const guiltyCount = finalState.guiltyVotes.size;
                const innocentCount = finalState.innocentVotes.size;

                let responseText = `👨‍⚖️ *TRIBUNAL DO BOCHECHA - SENTENÇA DECRETADA* 👨‍⚖️\n\n` +
                                   `O julgamento do réu @${cleanTarget} foi encerrado!\n` +
                                   `📊 *PLACAR DO JÚRI:*\n` +
                                   `• 👍 Culpado: *${guiltyCount} votos*\n` +
                                   `• 👎 Inocente: *${innocentCount} votos*\n\n`;

                if (guiltyCount > innocentCount) {
                    responseText += `💀 *VEREDITO: CULPADO!* 💀\n\n` +
                                    `O júri popular considerou o réu CULPADO! A punição de banimento imediato será executada agora mesmo!`;

                    await sock.sendMessage(from, { text: responseText, mentions: [target] });

                    try {
                        // 1. Gerar convite do grupo para enviar no PV dele
                        let inviteLink = "";
                        try {
                            const inviteCode = await sock.groupInviteCode(from);
                            inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
                        } catch (invErr) {
                            console.error("Erro ao gerar link de convite:", invErr);
                        }

                        // 2. Enviar mensagem de ban no privado dele com o link de volta
                        const pvMsg = `Você foi julgado e condenado pelo tribunal do grupo no WhatsApp!\n` +
                                      `Sentença: Banimento imediato.\n\n` +
                                      `Mas como o Bochecha é um inquisidor magnânimo, aqui está o seu salvo-conduto para retornar ao grupo após os 5 minutos de reflexão na geladeira: ${inviteLink}`;
                        
                        await sock.sendMessage(target, { text: pvMsg }).catch(() => {});

                        // 3. Remover participante de verdade!
                        await sock.groupParticipantsUpdate(from, [target], "remove");

                    } catch (banErr) {
                        console.error("Erro ao remover usuário no tribunal:", banErr);
                        await sock.sendMessage(from, { text: `⚠️ Não consegui banir @${cleanTarget} de verdade (provavelmente sou apenas um participante comum ou ele é administrador do grupo)! Mas moralmente ele foi esculachado! 💀` });
                    }
                } else if (innocentCount > guiltyCount) {
                    responseText += `🕊️ *VEREDITO: ABSOLVIDO!* 🕊️\n\n` +
                                    `O júri popular considerou o réu INOCENTE de todas as acusações! @${cleanTarget} está livre e sua honra foi totalmente restabelecida! A justiça triunfou no submundo! 🥀`;
                    await sock.sendMessage(from, { text: responseText, mentions: [target] });
                } else {
                    responseText += `🤝 *VEREDITO: EMPATE TÉCNICO!* 🤝\n\n` +
                                    `O júri empatou em *${guiltyCount} a ${innocentCount}*! Em caso de dúvida, vigora o princípio do *In Dubio Pro Reu*. @${cleanTarget} foi absolvido por falta de consenso absoluto. Vá em paz!`;
                    await sock.sendMessage(from, { text: responseText, mentions: [target] });
                }

            }, 45000);

            return "O tribunal está aberto.";

        } catch (e) {
            console.error(e);
            global.activeTribunals.delete(from);
            return `❌ Erro ao abrir processo no tribunal: ${e.message}`;
        }
    }
};
