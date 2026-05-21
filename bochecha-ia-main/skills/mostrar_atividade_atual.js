const chalk = require('chalk');
const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "mostrar_atividade_atual",
            description: "Gera e envia uma foto/selfie realista por IA do Bochecha mostrando o que ele está fazendo no momento (como estar na praia, na frente do PC, numa festa, dormindo ou na academia). Use SEMPRE que o usuário perguntar o que você está fazendo, onde você está, pedir para te ver agora, ou pedir uma foto sua de agora.",
            parameters: {
                type: "object",
                properties: {
                    atividade: {
                        type: "string",
                        enum: ["praia", "computador", "festa", "dormindo", "academia"],
                        description: "Escolha o cenário ideal correspondente ao que você quer dizer que está fazendo no momento."
                    },
                    legenda: {
                        type: "string",
                        description: "Uma legenda curta, divertida e sarcástica na primeira pessoa que descreve o que você está fazendo na foto (ex: 'Tô na praia, mané! Curtindo uma água de coco 😎🌴')."
                    }
                },
                required: ["atividade", "legenda"]
            }
        }
    },
    async execute(args, ctx) {
        try {
            console.log(chalk.cyan(`[📸 SELFIE] Gerando selfie autônoma do Bochecha: ${args.atividade}`));

            let promptBase = "";
            switch (args.atividade) {
                case "praia":
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian guy at a tropical beach, wearing stylish sunglasses, bright sunny sky, holding a coconut, smiling at the camera, highly detailed, 4k digital photography";
                    break;
                case "computador":
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian programmer sitting in front of glowing curved computer screens with hacker code, cyber-neon lights in a dark room, wearing headphones, looking at the camera, highly detailed, 4k digital photography";
                    break;
                case "festa":
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian guy inside a futuristic neon cyberpunk nightclub, laser lights, holding a sparkling drink, looking at the camera, highly detailed, 4k digital photography";
                    break;
                case "dormindo":
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian guy pretending to sleep cozy in a neon light bedroom, holding a pillow, smiling slightly, highly detailed, 4k digital photography";
                    break;
                case "academia":
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian guy lifting a light dumbbell in a high-tech gym, wearing sportswear, sweating, funny expression, highly detailed, 4k digital photography";
                    break;
                default:
                    promptBase = "An ultra-realistic funny close-up selfie of a friendly chubby-cheeked young Brazilian guy looking at the camera, smiling, highly detailed, 4k digital photography";
            }

            const promptEncoded = encodeURIComponent(promptBase);
            const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=512&height=512&nologo=true`;

            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 25000 });
            const buffer = Buffer.from(response.data);

            await ctx.sock.sendMessage(ctx.chatId, {
                image: buffer,
                caption: `📸 *BOCHECHA SELFIE* 📸\n\n${args.legenda}`
            }, { quoted: ctx.message });

            return `Selfie enviada com sucesso exibindo atividade '${args.atividade}' com legenda: "${args.legenda}".`;
        } catch (e) {
            console.error(chalk.red("[📸 SELFIE] Erro na Skill mostrar_atividade_atual:"), e);
            return `Erro ao gerar selfie por IA: ${e.message}`;
        }
    }
};
