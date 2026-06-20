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
            description: "Gera e envia uma foto, vídeo, GIF ou apenas texto por IA do Bochecha mostrando o que ele está fazendo no momento. Use SEMPRE que o usuário perguntar o que você está fazendo, onde você está, pedir para te ver agora, pedir uma foto sua de agora, ou pedir um VÍDEO/GIF seu de agora. Seja criativo e varie a atividade para não repetir sempre a mesma coisa!",
            parameters: {
                type: "object",
                properties: {
                    atividade: {
                        type: "string",
                        description: "Uma atividade criativa e variada em inglês (ex: 'eating pizza in a neon cafe', 'riding a flying motorcycle in Rio', 'playing retro games on a couch', 'chilling at Copacabana beach wearing sunglasses'). EVITE repetir a mesma atividade em conversas seguidas!"
                    },
                    legenda: {
                        type: "string",
                        description: "Uma legenda curta, divertida, sarcástica e com gírias cariocas na primeira pessoa que descreve o que você está fazendo (ex: 'Olha eu aqui programando as paradas do Marcos, mó trampo! 💻🔥')."
                    },
                    tipo: {
                        type: "string",
                        enum: ["foto", "video", "gif", "texto"],
                        description: "Selecione o formato da resposta. Use 'gif' se o usuário pedir explicitamente um GIF, 'video' para vídeo curto de ação com som, 'foto' para imagem estática e 'texto' se a IA decidir responder apenas em formato textual/áudio."
                    }
                },
                required: ["atividade", "legenda", "tipo"]
            }
        }
    },
    async execute(args, ctx) {
        try {
            const requestedType = args.tipo || "foto";
            const mentions = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            // Se for apenas resposta textual, pula geração de imagem/vídeo totalmente
            if (requestedType === "texto") {
                console.log(chalk.cyan(`[📸 SELFIE] Responder o que está fazendo apenas com texto/áudio: ${args.atividade}`));
                await ctx.sock.sendMessage(ctx.chatId, {
                    text: args.legenda,
                    mentions: mentions
                }, { quoted: ctx.message });

                // Envia áudio narrando a legenda
                if (global.VoiceSynthesizer && typeof global.VoiceSynthesizer.speak === 'function') {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await global.VoiceSynthesizer.speak(ctx.sock, ctx.chatId, args.legenda, ctx.message);
                    } catch (audioErr) {
                        console.error(chalk.red("[📸 SELFIE] Erro ao sintetizar áudio da atividade:"), audioErr);
                    }
                }
                return "";
            }

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

                // Localiza o binário do FFmpeg
                const ffmpegPath = require('../lib/ffmpegHelper').getFFmpegPath();

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
                    gifPlayback: requestedType === "gif",
                    mentions: mentions
                }, { quoted: ctx.message });

            } else {
                // Envia como foto estática com legenda
                await ctx.sock.sendMessage(ctx.chatId, {
                    image: imageBuffer,
                    caption: args.legenda,
                    mentions: mentions
                }, { quoted: ctx.message });
            }

            // Se o VoiceSynthesizer estiver disponível globalmente, envia também o áudio correspondente à legenda!
            if (global.VoiceSynthesizer && typeof global.VoiceSynthesizer.speak === 'function') {
                try {
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Pequeno delay de 1.5s
                    await global.VoiceSynthesizer.speak(ctx.sock, ctx.chatId, args.legenda, ctx.message);
                } catch (audioErr) {
                    console.error(chalk.red("[📸 SELFIE] Erro ao sintetizar áudio da atividade:"), audioErr);
                }
            }

            return "";
        } catch (e) {
            console.error(chalk.red("[📸 SELFIE] Erro na Skill mostrar_atividade_atual:"), e);
            return `Erro ao gerar selfie por IA: ${e.message}`;
        }
    }
};
