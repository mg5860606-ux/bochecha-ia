const { jidDecode, downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");

const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
};

const Messages = (m, sock) => {
    const msg = m.messages[0];
    if (!msg.message) return null;

    msg.type = getContentType(msg.message);
    msg.body = msg.message.conversation || 
               msg.message[msg.type]?.text || 
               msg.message[msg.type]?.caption || 
               "";
    
    msg.from = msg.key.remoteJid;
    msg.isGroup = msg.from.endsWith("@g.us");
    msg.sender = decodeJid(msg.key.participant || msg.key.remoteJid);
    msg.pushName = msg.pushName || "Usuário";
    
    // Função auxiliar para respostas rápidas (essencial para os comandos manuais com /)
    msg.reply = async (text, options = {}) => {
        const sendOptions = { ...options };
        if (options.quoted === true || options.reply === true) {
            sendOptions.quoted = msg;
        } else {
            delete sendOptions.quoted;
        }
        return await sock.sendMessage(msg.from, { text: String(text) }, sendOptions);
    };

    msg.replyQuoted = async (text, options = {}) => {
        return await sock.sendMessage(msg.from, { text: String(text) }, { ...options, quoted: msg });
    };
    
    return msg;
};

module.exports = { Messages };
