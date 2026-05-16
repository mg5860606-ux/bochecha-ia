const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    definition: {
        function: {
            name: "configurar_menu",
            description: "Altera a foto, GIF ou Vídeo do cabeçalho do menu principal. O usuário deve responder a uma mídia.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        let msgObj = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!msgObj) return "❌ Você precisa responder a uma Foto, GIF ou Vídeo dizendo 'Bochecha, troca a foto do menu'.";

        const mediaType = Object.keys(msgObj).find(k => k.includes('Message'));
        if (!['imageMessage', 'videoMessage'].includes(mediaType)) {
            return "❌ Mídia inválida. Por favor, responda a uma Imagem, GIF ou Vídeo curto.";
        }

        try {
            await sock.sendMessage(from, { text: "⏳ Processando e salvando nova mídia do Menu... Aguarde." });
            
            const stream = await downloadContentFromMessage(msgObj[mediaType], mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const ext = mediaType === 'imageMessage' ? '.jpg' : '.mp4';
            const fileName = `menu_header${ext}`;
            const libDir = path.join(__dirname, '../lib');
            if (!fs.existsSync(libDir)) fs.mkdirSync(libDir);
            
            const filePath = path.join(libDir, fileName);
            
            // Remove arquivos antigos para não duplicar tipos diferentes
            if (fs.existsSync(path.join(libDir, 'menu_header.jpg'))) fs.unlinkSync(path.join(libDir, 'menu_header.jpg'));
            if (fs.existsSync(path.join(libDir, 'menu_header.mp4'))) fs.unlinkSync(path.join(libDir, 'menu_header.mp4'));

            fs.writeFileSync(filePath, buffer);

            return `✅ *MÍDIA DO MENU ATUALIZADA!*\n\nAgora o seu menu será exibido com este novo ${mediaType === 'imageMessage' ? 'visual' : 'GIF/Vídeo'}.`;
        } catch (e) {
            return `❌ Erro ao configurar menu: ${e.message}`;
        }
    }
};
