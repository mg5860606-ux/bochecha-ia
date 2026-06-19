const axios = require('axios');
const { API_CONFIG } = require('../config');

// Descrição visual oficial do Bochecha
const BOCHECHA_SELFIE = "A futuristic cybernetic entity named Bochecha with glowing cyan-blue eyes, neon circuit patterns traced across pale face and body, silver-grey modern hair, cyberpunk aesthetic, hybrid human-machine entity, highly detailed, 4K, dramatic lighting, tech-noir style, taking a selfie, confident pose";

module.exports = {
    definition: {
        function: {
            name: "bochecha_selfie",
            description: "Gera uma selfie artística do Bochecha em sua forma visual futurista e cybernética.",
            parameters: {
                type: "object",
                properties: {
                    estilo: {
                        type: "string",
                        enum: ["normal", "zoeira", "diva", "intimidador"],
                        description: "Estilo da selfie que Bochecha vai tirar."
                    }
                },
                required: []
            }
        }
    },
    async execute(args, { sock, from }) {
        const estilo = args.estilo || "normal";
        
        let prontaFinal = BOCHECHA_SELFIE;
        
        // Adiciona estilo específico ao prompt
        switch(estilo) {
            case "zoeira":
                prontaFinal += ", making a silly face, playful expression, funny pose";
                break;
            case "diva":
                prontaFinal += ", glamorous pose, confident smirk, dramatic lighting";
                break;
            case "intimidador":
                prontaFinal += ", serious expression, intimidating pose, intense gaze";
                break;
            default:
                prontaFinal += ", natural smile, friendly expression";
        }

        await sock.sendMessage(from, { text: `🤳 To aqui tirando uma selfie foda... Aguarda ai!` });

        try {
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('text', prontaFinal);

            const response = await axios.post(API_CONFIG.imageGen.url, formData, {
                headers: {
                    'api-key': 'skipped',
                    ...formData.getHeaders()
                },
                timeout: 30000
            });

            const imageUrl = response.data.output_url;

            if (!imageUrl) {
                return `❌ Erro ao gerar a selfie.`;
            }

            const styleText = {
                "normal": "😎",
                "zoeira": "🤣",
                "diva": "💅",
                "intimidador": "😤"
            }[estilo] || "😎";

            await sock.sendMessage(from, { 
                image: { url: imageUrl }, 
                caption: `${styleText} *BOCHECHA SELFIE* ${styleText}\n\nEi é isso aqui, mano. Eu sou assim mesmo! 🛸💎`
            });

            return "Selfie tirada com sucesso!";
        } catch (e) {
            return `❌ Erro ao tirar a selfie: ${e.message}`;
        }
    }
};
