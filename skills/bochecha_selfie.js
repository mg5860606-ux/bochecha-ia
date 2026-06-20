const axios = require('axios');
const { API_CONFIG } = require('../config');

// Descrição visual oficial do Bochecha
const BOCHECHA_SELFIE = "A futuristic cybernetic entity named Bochecha with glowing cyan-blue eyes, neon circuit patterns traced across pale face and body, silver-grey modern hair, cyberpunk aesthetic, hybrid human-machine entity, highly detailed, 4K, dramatic lighting, tech-noir style, taking a selfie, confident pose";

module.exports = {
    definition: {
        function: {
            name: "bochecha_selfie",
            description: "Gera uma selfie artística do Bochecha em sua forma visual futurista e cybernética, ou envia sua foto de perfil oficial.",
            parameters: {
                type: "object",
                properties: {
                    estilo: {
                        type: "string",
                        enum: ["normal", "zoeira", "diva", "intimidador", "perfil"],
                        description: "Estilo da selfie que Bochecha vai tirar. Escolha 'perfil' se o usuário pedir a foto dele oficial/real ou avatar padrão do Bochecha."
                    }
                },
                required: []
            }
        }
    },
    async execute(args, { sock, from }) {
        const estilo = args.estilo || "normal";
        
        if (estilo === "perfil") {
            const fs = require('fs');
            const path = require('path');
            const bochechaJpgPath = path.join(__dirname, '..', 'bochecha.jpg');
            
            if (fs.existsSync(bochechaJpgPath)) {
                await sock.sendMessage(from, { text: `🤳 Mandando minha foto de perfil oficial...` });
                try {
                    await sock.sendMessage(from, { 
                        image: fs.readFileSync(bochechaJpgPath), 
                        caption: `😎 *BOCHECHA* 😎\n\nEssa é minha foto de perfil oficial, cria! Respeita o manto. 🛸💎`
                    });
                    return "Foto de perfil enviada com sucesso!";
                } catch (err) {
                    return `❌ Erro ao enviar foto de perfil local: ${err.message}`;
                }
            } else {
                args.estilo = "normal";
            }
        }

        const estiloResolvido = args.estilo || "normal";
        let prontaFinal = BOCHECHA_SELFIE;
        
        // Adiciona estilo específico ao prompt
        switch(estiloResolvido) {
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
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prontaFinal)}?width=1024&height=1024&nologo=true&private=true&enhance=true`;

            const styleText = {
                "normal": "😎",
                "zoeira": "🤣",
                "diva": "💅",
                "intimidador": "😤"
            }[estiloResolvido] || "😎";

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
