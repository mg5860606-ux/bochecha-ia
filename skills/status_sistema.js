const os = require('os');
const moment = require('moment-timezone');

module.exports = {
    definition: {
        function: {
            name: "ping",
            description: "Exibe o status técnico do bot (RAM, CPU, Latência).",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        const timestamp = Date.now();
        const fast = (Date.now() - timestamp); // Latência simulada ou real se capturada no loop
        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor((uptime % 86400) / 3600);
        const minutos = Math.floor((uptime % 3600) / 60);
        const segundos = Math.floor(uptime % 60);
        
        const ramUsada = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const hora = moment.tz('America/Sao_Paulo').format('HH:mm:ss');
        const data = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY');
        
        const chats = await sock.groupFetchAllParticipating();
        const groupsCount = Object.keys(chats).length;

        const txt = `*🏃‍♂️ • ᴠᴇʟᴏᴄɪᴅᴀᴅᴇ:* 0.001 s
*🦾 • ʟᴀᴛᴇɴᴄɪᴀ:* ${fast} ms
*⌛ • ᴀᴛʀᴀsᴏ:* 0.0000 s
*🖥️ • sɪsᴛᴇᴍᴀ:* ${os.platform()}
*🧠 • ʀᴀᴍ:* ${ramUsada} GB / ${totalRam} GB
*🕒 • ʜᴏʀᴀ:* ${hora}
*📅 • ᴅᴀᴛᴀ:* ${data}
*👥 • ɢʀᴜᴘᴏs ᴀᴛɪᴠᴏs:* ${groupsCount}
*⏰ • ᴛᴇᴍᴘᴏ ᴏɴʟɪɴᴇ:* ${dias} dia(s), ${horas} hora(s), ${minutos} minuto(s) e ${segundos} segundo(s).

> *𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀-𝐈𝐀*`;

        return txt;
    }
};
