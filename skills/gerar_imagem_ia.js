const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Descrição visual do Bochecha para usar como referência
const BOCHECHA_VISUAL = "A futuristic cybernetic entity named Bochecha with glowing cyan-blue eyes, neon circuit patterns traced across pale face and body, silver-grey modern hair, cyberpunk aesthetic, hybrid human-machine entity, highly detailed, 4K, tech-noir style";

module.exports = {
    definition: {
        function: {
            name: "gerar_imagem_ia",
            description: "Gera uma imagem artística ou vídeo animado a partir de uma descrição em texto usando Inteligência Artificial.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { 
                        type: "string", 
                        description: "A descrição detalhada da imagem ou vídeo que você quer gerar (ex: 'um gato samurai no estilo cyberpunk')." 
                    },
                    tipo: {
                        type: "string",
                        enum: ["imagem", "video"],
                        description: "O formato de saída da mídia. Escolha 'video' apenas se o usuário pedir explicitamente um vídeo, GIF ou animação. Caso contrário, use 'imagem'."
                    }
                },
                required: ["prompt"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.prompt) args.prompt = args.texto || args.alvo || '';
        if (!args.prompt) return "❌ Por favor, descreva o que você quer gerar.";

        const tipo = args.tipo || "imagem";
        const isVideo = tipo === "video" || /\b(video|vídeo|gif|animação|animacao|movimento)\b/gi.test(args.prompt);

        if (isVideo) {
            await sock.sendMessage(from, { text: `🎥 Minhas redes neurais estão processando e gerando o vídeo: "${args.prompt}"... Aguarde, isso pode levar alguns segundos.` });
        } else {
            await sock.sendMessage(from, { text: `🎨 Minhas redes neurais estão desenhando: "${args.prompt}"... Aguarde um instante.` });
        }

        try {
            let finalPrompt = args.prompt;

            // Detecta se é um pedido para desenhar/animar o Bochecha
            const isBochechaRequest = /\b(bochecha|eu|minha|me desenha|minha cara|meu rosto|selfie|autorretrato|como eu sou)\b/gi.test(args.prompt);
            
            if (isBochechaRequest) {
                // Tenta extrair a ação removendo termos redundantes
                let action = args.prompt.replace(/\b(bochecha|eu|minha|me desenha|minha cara|meu rosto|selfie|autorretrato|como eu sou|desenha o|gera uma foto do|desenhe o|faz uma foto do|mostra o|faz um video do|cria um video do|video do|foto do|vídeo do|faz um vídeo do|cria um vídeo do)\b/gi, "").trim();
                
                if (action.length > 2) {
                    finalPrompt = `${BOCHECHA_VISUAL}, ${action}`;
                } else {
                    finalPrompt = BOCHECHA_VISUAL;
                }
            }

            // Usando Pollinations AI que é gratuito e robusto
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&nologo=true&private=true&enhance=true`;

            if (isVideo) {
                // Garante que o diretório temp existe
                const tempDir = path.join(__dirname, '..', 'temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const timestamp = Date.now();
                const tempImagePath = path.join(tempDir, `bochecha_frame_${timestamp}.jpg`);
                const tempVideoPath = path.join(tempDir, `bochecha_video_${timestamp}.mp4`);

                // Baixa a imagem gerada
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
                fs.writeFileSync(tempImagePath, Buffer.from(imageResponse.data));

                // Roda o FFmpeg para aplicar o efeito zoompan de 5 segundos
                const ffmpeg = require('fluent-ffmpeg');
                const ffmpegPath = require('../lib/ffmpegHelper').getFFmpegPath();
                ffmpeg.setFfmpegPath(ffmpegPath);

                await new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(tempImagePath)
                        .loop(5)
                        .fps(25)
                        .videoFilters([
                            {
                                filter: 'zoompan',
                                options: {
                                    z: 'min(zoom+0.0015,1.5)',
                                    d: 125,
                                    x: 'iw/2-(iw/zoom/2)',
                                    y: 'ih/2-(ih/zoom/2)',
                                    s: '1080x1080'
                                }
                            }
                        ])
                        .videoCodec('libx264')
                        .outputOptions([
                            '-pix_fmt yuv420p',
                            '-t 5'
                        ])
                        .output(tempVideoPath)
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });

                // Envia o vídeo gerado
                await sock.sendMessage(from, { 
                    video: fs.readFileSync(tempVideoPath), 
                    caption: `🎬 *VÍDEO GERADO POR IA* 🎬\n\n🎯 *Prompt:* ${args.prompt}\n🚀 *Mídia:* Vídeo animado de 5s com Zoom 3D\n🤖 *Visual:* Baseado na imagem oficial do Bochecha`
                });

                // Deleta arquivos temporários de forma assíncrona
                try {
                    fs.unlinkSync(tempImagePath);
                    fs.unlinkSync(tempVideoPath);
                } catch (err) {}

                return "O vídeo foi gerado e enviado com sucesso.";
            } else {
                // Envia a imagem
                await sock.sendMessage(from, { 
                    image: { url: imageUrl }, 
                    caption: `✨ *IMAGEM GERADA POR IA*\n\n🎯 *Prompt:* ${args.prompt}\n🚀 *Motor:* Pollinations AI\n🤖 *Visual:* Baseado na imagem oficial do Bochecha`
                });

                return "A imagem foi gerada e enviada com sucesso.";
            }
        } catch (e) {
            return `❌ Ocorreu um erro ao processar o seu pedido: ${e.message}`;
        }
    }
};
