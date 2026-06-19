const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = {
    definition: {
        function: {
            name: "mostrar_atividade_atual",
            description: "Gera e envia uma foto ou um vídeo/selfie realista por IA do Bochecha mostrando o que ele está fazendo no momento (como estar na praia, na frente do PC, numa festa, dormindo ou na academia). Use SEMPRE que o usuário perguntar o que você está fazendo, onde você está, pedir para te ver agora, pedir uma foto sua, ou pedir um VÍDEO seu de agora.",
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
                        description: "Uma legenda curta, divertida e sarcástica na primeira pessoa que descreve o que você está fazendo na foto/vídeo (ex: 'Olha eu aqui, mané! 😎')."
                    },
                    tipo: {
                        type: "string",
                        enum: ["foto", "video"],
                        description: "Selecione se o usuário pediu uma FOTO ('foto') ou um VÍDEO ('video'). Caso ele peça para 'te ver', 'foto sua' ou não especifique, envie 'foto'. Se ele pedir 'vídeo seu', 'mostra um vídeo seu' ou similar, envie 'video'."
                    }
                },
                required: ["atividade", "legenda", "tipo"]
            }
        }
    },
    async execute(args, ctx) {
        try {
            const requestedType = args.tipo || "foto";
            console.log(chalk.cyan(`[📸 SELFIE] Gerando selfie autônoma do Bochecha: ${args.atividade} | Formato: ${requestedType}`));

            let promptBase = "";
            switch (args.atividade) {
                case "praia":
                    promptBase = "A raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, at a busy Rio de Janeiro beach. He is wearing dark generic sunglasses, smiling, holding a coconut with a straw. Natural sunlight, real skin texture, raw amateur photography, shot on mobile phone.";
                    break;
                case "computador":
                    promptBase = "A raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, inside his messy bedroom. He is sitting in front of curving monitors with coding terminals, wearing over-ear black headphones. Natural desk lamp light, real skin texture, raw amateur photography, shot on mobile phone.";
                    break;
                case "festa":
                    promptBase = "A raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, at a crowded house party in Rio. He is holding a cup with a drink, background shows warm party lights. Real amateur quality, real skin texture, raw amateur photography, shot on mobile phone.";
                    break;
                case "dormindo":
                    promptBase = "A raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, cozy in bed. He has messy bed hair, dim warm room light, squinting his eyes pretending to sleep, smiling slightly. Real skin texture, raw amateur photography, shot on mobile phone.";
                    break;
                case "academia":
                    promptBase = "A raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, at a local weight gym. He is wearing a simple workout tank top, sweating, showing a slightly tired funny expression, holding a small dumbbell. Gym mirrors in background, real skin texture, raw amateur photography, shot on mobile phone.";
                    break;
                default:
                    promptBase = "A simple raw casual amateur smartphone selfie photo of a 25-year-old Brazilian man named Bochecha, chubby-cheeked friendly round face, short curly black hair, light stubble beard, dark brown eyes, smiling naturally. Warm indoor lighting, real skin texture, raw amateur photography, shot on mobile phone.";
            }

            const promptEncoded = encodeURIComponent(promptBase);
            const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=512&height=512&nologo=true&private=true&enhance=false&model=flux&seed=${Math.floor(Math.random() * 100000)}`;

            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 25000 });
            const imageBuffer = Buffer.from(response.data);

            if (requestedType === "video") {
                const tempDir = path.join(__dirname, '../scratch');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const tempImageName = `selfie_${Date.now()}.jpg`;
                const tempVideoName = `selfie_${Date.now()}.mp4`;
                const tempImagePath = path.join(tempDir, tempImageName);
                const tempVideoPath = path.join(tempDir, tempVideoName);

                fs.writeFileSync(tempImagePath, imageBuffer);

                // Localiza o binário do FFmpeg Estático
                const ffmpegPath = require('ffmpeg-static');

                // z='min(zoom+0.0015,1.2)' -> zoom suave até 1.2x
                // d=120 -> duração de 120 frames (4.8 segundos a 25 fps)
                const runFFmpeg = () => {
                    return new Promise((resolve, reject) => {
                        const ffmpeg = spawn(ffmpegPath, [
                            '-y',
                            '-loop', '1',
                            '-i', tempImagePath,
                            '-vf', "zoompan=z='min(zoom+0.0015,1.2)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=512x512,format=yuv420p",
                            '-c:v', 'libx264',
                            '-t', '5',
                            '-pix_fmt', 'yuv420p',
                            '-r', '25',
                            tempVideoPath
                        ]);

                        ffmpeg.on('close', (code) => {
                            if (code === 0) resolve();
                            else reject(new Error(`FFmpeg exit code ${code}`));
                        });

                        ffmpeg.on('error', reject);
                    });
                };

                await runFFmpeg();

                const videoBuffer = fs.readFileSync(tempVideoPath);

                // Deleta arquivos temporários de forma segura
                try {
                    fs.unlinkSync(tempImagePath);
                    fs.unlinkSync(tempVideoPath);
                } catch (unlinkErr) {}

                await ctx.sock.sendMessage(ctx.chatId, {
                    video: videoBuffer,
                    gifPlayback: false
                }, { quoted: ctx.message });

                return "";
            } else {
                // Envia como foto estática
                await ctx.sock.sendMessage(ctx.chatId, {
                    image: imageBuffer
                }, { quoted: ctx.message });

                return "";
            }
        } catch (e) {
            console.error(chalk.red("[📸 SELFIE] Erro na Skill mostrar_atividade_atual:"), e);
            return `Erro ao gerar selfie por IA: ${e.message}`;
        }
    }
};
