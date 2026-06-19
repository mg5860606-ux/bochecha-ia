const axios = require('axios');
const { API_CONFIG } = require('../config');

// Descrição visual do Bochecha para usar como referência
const BOCHECHA_VISUAL = "A futuristic cybernetic entity named Bochecha with glowing cyan-blue eyes, neon circuit patterns traced across pale face and body, silver-grey modern hair, cyberpunk aesthetic, hybrid human-machine entity, highly detailed, 4K, dramatic lighting, tech-noir style";

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
            let finalPrompt = args.prompt;

            // Detecta se é um pedido para desenhar o Bochecha
            const isBochechaRequest = /\b(bochecha|eu|minha|me desenha|minha cara|meu rosto|selfie|autorretrato|como eu sou)\b/gi.test(args.prompt);
            
            if (isBochechaRequest) {
                finalPrompt = BOCHECHA_VISUAL;
            }

            // Usando DeepAI que é gratuito e mais robusta
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('text', finalPrompt);

            const response = await axios.post(API_CONFIG.imageGen.url, formData, {
                headers: {
                    'api-key': 'skipped',
                    ...formData.getHeaders()
                },
                timeout: 30000
            });

            const imageUrl = response.data.output_url;

            if (!imageUrl) {
                return `❌ Erro: A API não retornou uma URL de imagem válida.`;
            }

            await sock.sendMessage(from, { 
                image: { url: imageUrl }, 
                caption: `✨ *IMAGEM GERADA POR IA*\n\n🎯 *Prompt:* ${args.prompt}\n🚀 *Motor:* DeepAI Neural Engine`
            });

            return "A imagem foi gerada e enviada com sucesso.";
        } catch (e) {
            return `❌ Ocorreu um erro ao gerar a imagem: ${e.message}`;
        }
    }
};
