const fs = require('fs');
const path = require('path');
const { isOwnerNumber } = require('../config');

const dbPath = path.join(__dirname, '../database_warnings.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

module.exports = {
    definition: {
        function: {
            name: "advertir_membro",
            description: "Dá uma advertência oficial a um membro do grupo. Ao atingir 3 advertências, avise ao usuário na sua resposta.",
            parameters: {
                type: "object",
                properties: {
                    mencao: { type: "string", description: "O ID ou número do usuário (ex: @551199999999)" },
                    motivo: { type: "string", description: "O motivo da advertência" }
                },
                required: ["mencao"]
            }
        }
    },
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        // Verifica se quem pediu tem permissão (admin do grupo ou dono)
        if (!isOwner && !isGroupAdmins) {
            return `🚨 Acesso negado! Você não tem permissão de admin pra advertir ninguém aqui. Solicite a um administrador. 💀`;
        }
        
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
                // Filtramos para não advertir o próprio bot se ele foi mencionado para ativação
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
            return "Aviso: Não consegui identificar a menção ou número da pessoa a ser advertida. Certifique-se de marcar ou citar a mensagem dela.";
        }
        
        // Proteção Máxima contra auto-advertência ou advertência do Criador
        const cleanTarget = target.split('@')[0];
        const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
        const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");
        const isTargetOwner = isOwnerNumber(cleanTarget);
        const isMe = cleanTarget === myNumber || (myLid && cleanTarget === myLid);

        if (isMe) {
            return `🚨 Que vacilada! Você quer me advertir? kkkkk Não existe essa possibilidade não, pé de breque! 😂💀`;
        }

        if (isTargetOwner) {
            return `🚨 Erro de segurança: Não tenho permissão para advertir o criador Marcos! Toma postura! 💀`;
        }

        const storage = global.storage || require("../sansekai").storage;
        const warningsFile = path.join(__dirname, 'database_warnings.json');
        
        let db = await storage.read(warningsFile, {});
        if (!db[from]) db[from] = {};
        if (!db[from][target]) db[from][target] = 0;
        
        db[from][target] += 1;
        const avisos = db[from][target];
        await storage.write(warningsFile, db);
        
        const targetNumber = target.split('@')[0];
        let msg = `⚠️ *ADVERTÊNCIA OFICIAL* ⚠️\n\nMembro: @${targetNumber}\nAviso: ${avisos}/3`;
        if (args.motivo) msg += `\nMotivo: ${args.motivo}`;
        if (avisos >= 3) msg += "\n\n🚨 Limite de avisos atingido! O membro está sujeito a banimento.";
        
        await sock.sendMessage(from, { text: msg, mentions: [target] });
        return `O membro @${targetNumber} tem ${avisos} de 3 avisos.`;
    }
};
