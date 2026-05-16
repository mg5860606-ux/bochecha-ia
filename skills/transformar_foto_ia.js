const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    definition: {
        function: {
            name: "transformar_foto_ia",
            description: "Transforma uma foto usando filtros de Inteligência Artificial (Anime, Zumbi, Desenho, etc). Deve responder a uma imagem.",
            parameters: {
                type: "object",
                properties: {
                    estilo: { 
                        type: "string", 
                        enum: ["anime", "zumbi", "desenho", "pixelart", "careca", "remover_fundo"], 
                        description: "O estilo visual da transformação." 
                    }
                },
                required: ["estilo"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        let msgObj = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!msgObj) return "❌ Você precisa responder a uma FOTO, VÍDEO ou GIF para eu transformar com IA!";

        const mediaType = msgObj.imageMessage ? 'image' : (msgObj.videoMessage ? 'video' : null);
        if (!mediaType) return "❌ Mídia inválida. Responda a uma Imagem, GIF ou Vídeo.";

        await sock.sendMessage(from, { text: `🪄 Processando mídia e aplicando filtro IA: *${args.estilo.toUpperCase()}*... Aguarde.` });

        try {
            // 1. Baixar a mídia
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(msgObj[mediaType + 'Message'], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Se for vídeo, a gente precisa extrair um frame (ou a thumbnail) para aplicar o filtro IA
            // APIs gratuitas raramente transformam o vídeo inteiro, mas transformam a cena em arte.
            
            // 2. FUpload
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', buffer, 'media.jpg');
            
            const upload = await axios.post('https://telegra.ph/upload', form, { headers: form.getHeaders() });
            const mediaUrl = `https://telegra.ph${upload.data[0].src}`;

            // 3. Endpoints de Elite
            const GONZALES_TOKEN = "6b37bf08416e08c4276b4d55cc276be2";
            let endpoint = "";
            
            switch(args.estilo) {
                case "anime": endpoint = `https://api.vyturex.com/anime?url=${mediaUrl}`; break;
                case "careca": endpoint = `https://apis.gonzalesdev.shop/api/canvas/calvo?url=${mediaUrl}&token=${GONZALES_TOKEN}`; break;
                case "zumbi": endpoint = `https://apis.gonzalesdev.shop/api/canvas/zumbificar?url=${mediaUrl}&token=${GONZALES_TOKEN}`; break;
                case "remover_fundo": endpoint = `https://apis.gonzalesdev.shop/api/canvas/removebg?url=${mediaUrl}&token=${GONZALES_TOKEN}`; break;
                case "desenho": endpoint = `https://apis.gonzalesdev.shop/api/canvas/sketch?url=${mediaUrl}&token=${GONZALES_TOKEN}`; break;
                case "pixelart": endpoint = `https://apis.gonzalesdev.shop/api/canvas/pixelate?url=${mediaUrl}&token=${GONZALES_TOKEN}`; break;
            }

            await sock.sendMessage(from, { 
                image: { url: endpoint }, 
                caption: `✅ *Transformação IA concluída!*\nEstilo: ${args.estilo}` 
            });

            return "A foto foi transformada com sucesso.";
        } catch (e) {
            return `❌ Erro na transformação IA: ${e.message}`;
        }
    }
};
