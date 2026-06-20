const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Descrição visual do Bochecha para manter a consistência com a foto de perfil oficial
const BOCHECHA_VISUAL = "A futuristic cybernetic entity named Bochecha with glowing cyan-blue eyes, neon circuit patterns traced across pale face and body, silver-grey modern hair, cyberpunk aesthetic, tech-noir style, taking a selfie";

module.exports = {
    definition: {
        function: {
            name: "mostrar_atividade_atual",
            description: "Gera e envia uma foto, vídeo ou GIF realista por IA do Bochecha mostrando o que ele está fazendo no momento. Use SEMPRE que o usuário perguntar o que você está fazendo, onde você está, pedir para te ver agora, pedir uma foto sua de agora, ou pedir um VÍDEO/GIF seu de agora. Seja criativo e varie a atividade para não repetir sempre a mesma coisa!",
            parameters: {
                type: "object",
                properties: {
                    atividade: {
                        type: "string",
                        description: "Uma atividade criativa e variada em inglês (ex: 'eating pizza in a neon cafe', 'riding a flying motorcycle in Rio', 'playing retro games on a couch', 'chilling at Copacabana beach wearing sunglasses'). EVITE repetir a mesma atividade em conversas seguidas!"
                    },
                    legenda: {
                        type: "string",
                        description: "Uma legenda curta, divertida, sarcástica e com gírias cariocas na primeira pessoa que descreve o que você está fazendo (ex: 'Olha eu aqui programando as paradas do meu rei Marcos, mó trampo! 💻🔥')."
                    },
                    tipo: {
                        type: "string",
                        enum: ["foto", "video", "gif"],
                        description: "Selecione o formato: 'foto' para imagem estática, 'video' para vídeo curto de ação com som, ou 'gif' para animação de loop automático sem som."
                    }
                },
                required: ["atividade", "legenda", "tipo"]
            }
        }
    },
    async execute(args, ctx) {
        try {
            const requestedType = args.tipo || "foto";
            const isVideoOrGif = requestedType === "video" || requestedType === "gif";
            console.log(chalk.cyan(`[📸 SELFIE] Gerando selfie autônoma do Bochecha: ${args.atividade} | Formato: ${requestedType}`));

            // Cria o prompt combinando a descrição visual oficial do Bochecha com a atividade escolhida
            const promptBase = `${BOCHECHA_VISUAL}, ${args.atividade}`;
            const promptEncoded = encodeURIComponent(promptBase);
            const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=512&height=512&nologo=true&private=true&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;

            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
            const imageBuffer = Buffer.from(response.data);

            if (isVideoOrGif) {
                const tempDir = path.join(__dirname, '../temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const timestamp = Date.now();
                const tempImagePath = path.join(tempDir, `selfie_${timestamp}.jpg`);
                const tempVideoPath = path.join(tempDir, `selfie_${timestamp}.mp4`);

                fs.writeFileSync(tempImagePath, imageBuffer);

                // Localiza o binário do FFmpeg Estático
                const ffmpegPath = require('ffmpeg-static');

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
                    caption: args.legenda,
                    gifPlayback: requestedType === "gif"
                }, { quoted: ctx.message });

                return "";
            } else {
                // Envia como foto estática com legenda
                await ctx.sock.sendMessage(ctx.chatId, {
                    image: imageBuffer,
                    caption: args.legenda
                }, { quoted: ctx.message });

                return "";
            }
        } catch (e) {
            console.error(chalk.red("[📸 SELFIE] Erro na Skill mostrar_atividade_atual:"), e);
            return `Erro ao gerar selfie por IA: ${e.message}`;
        }
    }
};
