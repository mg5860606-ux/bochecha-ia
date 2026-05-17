const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    definition: {
        function: {
            name: "fazer_figurinha_de_texto",
            description: "Cria uma figurinha (sticker) artística em formato de adesivo a partir de uma frase ou palavra escrita.",
            parameters: {
                type: "object",
                properties: {
                    texto: { 
                        type: "string", 
                        description: "A palavra ou frase que você quer transformar em figurinha (ex: 'Que moleque chato')." 
                    }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.texto) return "❌ Por favor, informe o texto que você quer transformar em figurinha.";

        await sock.sendMessage(from, { text: `🎨 Desenhando a figurinha de texto: "${args.texto}"...` });

        try {
            // Gera um prompt artístico otimizado para sticker com texto
            const prompt = `design of a high quality circular die cut vector sticker displaying the words "${args.texto}" in outstanding glowing neon cyberpunk style, highly detailed typography, isolated black background`;
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

            // Faz o download do buffer da imagem
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            const sticker = new Sticker(buffer, {
                pack: 'Bochecha IA', 
                author: 'Corvo System', 
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'], 
                quality: 60 
            });
            
            const finalSticker = await sticker.toBuffer();
            
            await sock.sendMessage(from, { sticker: finalSticker });
            return "Figurinha de texto gerada e enviada com sucesso.";

        } catch (e) {
            return `❌ Ocorreu um erro ao gerar a figurinha de texto: ${e.message}`;
        }
    }
};
