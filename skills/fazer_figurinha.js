const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    definition: {
        function: {
            name: "fazer_figurinha",
            description: "Cria uma figurinha a partir de imagem, vídeo ou GIF. O usuário DEVE mandar a mídia junto com o pedido ou citar uma mídia.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        await sock.sendMessage(from, { text: "🎨 Cortando e preparando a figurinha..." });
        try {
            // Pega a mensagem atual ou a citada
            let msgObj = message.message;
            if (msgObj?.extendedTextMessage?.contextInfo?.quotedMessage) {
                msgObj = msgObj.extendedTextMessage.contextInfo.quotedMessage;
            }
            
            const mediaType = Object.keys(msgObj || {}).find(k => k.includes('Message'));
            if (!mediaType || !['imageMessage', 'videoMessage'].includes(mediaType)) {
                return "Aviso: Nenhuma imagem ou vídeo foi encontrado. Peça para o usuário enviar a foto com a legenda ou citar uma.";
            }
            
            if (mediaType === 'videoMessage' && msgObj.videoMessage.seconds > 10) {
                return "Aviso: O vídeo é muito longo. O WhatsApp permite no máximo 10 segundos para figurinhas animadas.";
            }

            const stream = await downloadContentFromMessage(msgObj[mediaType], mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            const sticker = new Sticker(buffer, {
                pack: 'Bochecha IA', 
                author: 'Corvo System', 
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'], 
                quality: 60 
            });
            
            const finalSticker = await sticker.toBuffer();
            
            await sock.sendMessage(from, { sticker: finalSticker });
            return "A figurinha foi enviada com sucesso para o grupo.";
            
        } catch (e) {
            return `Erro fatal no motor de figurinhas: ${e.message}. (Verifique se o FFMPEG está instalado no Windows do Servidor).`;
        }
    }
};
