const axios = require('axios');
const { API_CONFIG } = require('../config');

module.exports = {
    definition: {
        function: {
            name: "gerar_imagem_ia",
            description: "Gera uma imagem artística ou realista a partir de uma descrição em texto usando Inteligência Artificial.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { 
                        type: "string", 
                        description: "A descrição detalhada da imagem que você quer gerar (ex: 'um gato samurai no estilo cyberpunk')." 
                    }
                },
                required: ["prompt"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.prompt) args.prompt = args.texto || args.alvo || '';
        if (!args.prompt) return "❌ Por favor, descreva o que você quer que eu desenhe.";

        await sock.sendMessage(from, { text: `🎨 Minhas redes neurais estão desenhando: "${args.prompt}"... Aguarde um instante.` });

        try {
            // Usando Pollinations.ai que é excelente, gratuito e rápido
            const imageUrl = `${API_CONFIG.imageGen.url}${encodeURIComponent(args.prompt)}?width=1024&height=1024&nologo=true&private=true&enhance=false&model=flux&seed=${Math.floor(Math.random() * 1000)}`;

            await sock.sendMessage(from, { 
                image: { url: imageUrl }, 
                caption: `✨ *IMAGEM GERADA POR IA*\n\n🎯 *Prompt:* ${args.prompt}\n🚀 *Motor:* Pollinations Hyper-Realistic`
            });

            return "A imagem foi gerada e enviada com sucesso.";
        } catch (e) {
            return `❌ Ocorreu um erro ao gerar a imagem: ${e.message}`;
        }
    }
};
