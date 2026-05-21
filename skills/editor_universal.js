const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const Jimp = require('jimp');
const chalk = require('chalk');

const TEMP_DIR = path.join(process.cwd(), 'temp_media');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

module.exports = {
    definition: {
        function: {
            name: "editor_universal",
            description: "Edita, manipula ou melhora qualquer tipo de mídia (imagem, vídeo, áudio, PDF ou texto) baseado na instrução do usuário.",
            parameters: {
                type: "object",
                properties: {
                    instrucao: {
                        type: "string",
                        description: "O que o usuário deseja fazer com a mídia (ex: 'deixe em preto e branco', 'corte em 5 segundos', 'traduza este texto')."
                    }
                },
                required: ["instrucao"]
            }
        }
    },
    async execute(args, ctx) {
        const { sock, from, message } = ctx;
        const instruction = args.instrucao || args.texto || args.alvo || "";

        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;

        if (!quotedMsg) {
            return "❌ Você precisa responder a uma Foto, Vídeo, Áudio, Documento ou Texto dizendo o que quer editar, cria!";
        }

        if (!instruction) {
            return "❌ Você precisa fornecer uma instrução de edição (ex: `/editar deixe preto e branco` ou `/editar corte os primeiros 5s`)!";
        }

        await sock.sendMessage(from, { text: `🛠️ *Bochecha Media Engine:* Processando sua solicitação de edição... Aguarde um instante.` });

        let mediaType = null;
        let mediaObj = null;

        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            mediaObj = quotedMsg.imageMessage;
        } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            mediaObj = quotedMsg.videoMessage;
        } else if (quotedMsg.audioMessage) {
            mediaType = 'audio';
            mediaObj = quotedMsg.audioMessage;
        } else if (quotedMsg.documentMessage) {
            mediaType = 'document';
            mediaObj = quotedMsg.documentMessage;
        }

        let quotedText = quotedMsg.conversation || 
                         quotedMsg.extendedTextMessage?.text || 
                         quotedMsg.imageMessage?.caption || 
                         quotedMsg.videoMessage?.caption || 
                         "";

        try {
            let buffer = null;
            let base64Media = "";
            let mimeType = "";

            if (mediaType && mediaType !== 'document') {
                const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                const stream = await downloadContentFromMessage(mediaObj, mediaType);
                let chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                buffer = Buffer.concat(chunks);
                base64Media = buffer.toString("base64");
                mimeType = mediaObj.mimetype || "";
            }

            console.log(chalk.cyan(`[🛠️ UNIVERSAL EDITOR] Tipo: ${mediaType || 'Text'} | Instrução: "${instruction}"`));

            const systemRule = `Você é o Engenheiro de Mídia e Editor Universal do Bochecha-IA.
Seu objetivo é analisar as instruções de edição do usuário e retornar estritamente um bloco JSON estruturado descrevendo a ação necessária.

[ESTRUTURA DE RETORNO (DEVE SER APENAS O JSON, SEM CHAVES DE BLOCKCODE DE OUTRA FORMA, APENAS O JSON CRU OU DENTRO DE \`\`\`json \`\`\`)]:
{
  "action": "text_edit" | "image_jimp" | "ffmpeg_run" | "image_ocr_improve",
  "explanation": "Breve frase descrevendo o que vai ser feito.",
  "jimp_code": "código JS manipulando o objeto 'image' usando a biblioteca Jimp (ex: 'image.greyscale().blur(5);')",
  "ffmpeg_args": ["-ss", "00:00:05", "-c:a", "copy"],
  "ffmpeg_output_ext": "mp3" | "mp4" | "ogg",
  "text_result": "Texto final editado/traduzido/corrigido caso a ação seja 'text_edit'"
}

[DIRETRIZES DE DECISÃO]:
1. Se for TEXTO ou o usuário pediu tradução/correção/resumo de texto puro:
   - Use action: "text_edit".
   - Faça o processamento e coloque o resultado direto em "text_result".
2. Se for IMAGEM e o usuário quer manipulação gráfica (preto e branco, borrar, girar, redimensionar):
   - Use action: "image_jimp".
   - Escreva o código JS em "jimp_code". Você tem o objeto 'image' (Jimp instance) disponível no escopo. Mude-o in-place.
3. Se for IMAGEM e o usuário quer OCR ou melhorar o texto escrito na imagem:
   - Use action: "image_ocr_improve".
   - O Bochecha vai rodar o motor de OCR da imagem para você. Apenas retorne essa ação.
4. Se for AUDIO ou VIDEO e o usuário quer cortar, acelerar, extrair áudio ou converter:
   - Use action: "ffmpeg_run".
   - Forneça os argumentos do FFmpeg na lista "ffmpeg_args". O Bochecha vai rodar o comando usando 'ffmpeg -y -i input_file <ffmpeg_args> output_file'.
   - Defina a extensão do output em "ffmpeg_output_ext".
   - Exemplos:
     - Cortar primeiros 10 segundos de áudio: ["-ss", "00:00:00", "-t", "10"] com output "mp3" ou "ogg" ou "mp4".
     - Converter vídeo para áudio MP3: ["-vn", "-acodec", "libmp3lame"] com output "mp3".
     - Acelerar áudio/vídeo em 2x: ["-filter:a", "atempo=2.0"] com output "mp3" ou ["-filter_complex", "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]", "-map", "[v]", "-map", "[a]"] com output "mp4" se for vídeo completo.
     - Silenciar vídeo: ["-an", "-vcodec", "copy"] com output "mp4".`;

            let promptPayload = `Mídia de entrada: ${mediaType || 'Texto'}.
Instrução do usuário: "${instruction}"
Texto da mensagem: "${quotedText}"`;

            let inputPrompt = promptPayload;

            // Se for imagem, mandamos a imagem junto para a IA poder "ver" se ela quiser OCR ou entender a instrução gráfica
            if (mediaType === 'image' && base64Media) {
                inputPrompt = [
                    { text: `${promptPayload}\n\nAnalise a imagem para decidir a ação.` },
                    { inlineData: { mimeType: mimeType, data: base64Media } }
                ];
            }

            const { response } = await global.keyRotator.executeWithRotation([], inputPrompt, [], systemRule);
            let responseText = response.response.text().trim();

            // Limpa formatação markdown se houver
            if (responseText.startsWith("```json")) responseText = responseText.replace("```json", "");
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length - 3);
            responseText = responseText.trim();

            const plan = JSON.parse(responseText);
            console.log(chalk.green(`[🛠️ UNIVERSAL EDITOR] Plano:`, JSON.stringify(plan)));

            // ==========================================
            // AÇÃO 1: TEXT EDIT (Traduções, correções)
            // ==========================================
            if (plan.action === "text_edit") {
                return `📝 *Bochecha Media Engine: Texto Editado!*\n\n${plan.text_result}`;
            }

            // ==========================================
            // AÇÃO 2: IMAGE JIMP (Manipulação Gráfica)
            // ==========================================
            if (plan.action === "image_jimp" && buffer) {
                const image = await Jimp.read(buffer);
                
                // Roda o código dinâmico da IA para editar a imagem
                const jimpCode = plan.jimp_code;
                eval(jimpCode);

                const outBuffer = typeof image.getBufferAsync === 'function' 
                    ? await image.getBufferAsync(Jimp.MIME_JPEG) 
                    : await image.getBuffer(Jimp.MIME_JPEG);

                await sock.sendMessage(from, { 
                    image: outBuffer, 
                    caption: `🎨 *Bochecha Media Engine: Imagem Editada!*\n\n_Filtros aplicados com precisão!_` 
                });
                return "Imagem processada com sucesso.";
            }

            // ==========================================
            // AÇÃO 3: IMAGE OCR IMPROVE (OCR + Melhorar Texto)
            // ==========================================
            if (plan.action === "image_ocr_improve" && buffer) {
                const ocrPrompt = [
                    { text: `Extraia todo o texto visível nesta imagem e em seguida reescreva-o de forma muito mais profissional, corrigindo a ortografia, melhorando o tom e organizando o conteúdo. Responda apenas com o texto melhorado de forma limpa.` },
                    { inlineData: { mimeType: mimeType, data: base64Media } }
                ];
                const ocrRes = await global.keyRotator.executeWithRotation([], ocrPrompt, [], "Você é um especialista em OCR e melhoria de textos.");
                const improvedText = ocrRes.response.response.text().trim();

                return `📝 *Bochecha Media Engine: Texto da Imagem Otimizado!*\n\n${improvedText}`;
            }

            // ==========================================
            // AÇÃO 4: FFMPEG RUN (Edição de Áudio / Vídeo)
            // ==========================================
            if (plan.action === "ffmpeg_run" && buffer) {
                const ext = plan.ffmpeg_output_ext || (mediaType === 'audio' ? 'mp3' : 'mp4');
                const inPath = path.join(TEMP_DIR, `in_${Date.now()}.${mediaType === 'audio' ? 'mp3' : 'mp4'}`);
                const outPath = path.join(TEMP_DIR, `out_${Date.now()}.${ext}`);

                fs.writeFileSync(inPath, buffer);

                // Constrói comando do FFmpeg
                const argsStr = plan.ffmpeg_args.join(" ");
                const cmd = `"${ffmpegPath}" -y -i "${inPath}" ${argsStr} "${outPath}"`;

                console.log(chalk.cyan(`[🛠️ UNIVERSAL EDITOR] Executando FFmpeg: ${cmd}`));

                return new Promise((resolve) => {
                    exec(cmd, async (error, stdout, stderr) => {
                        // Limpa o arquivo de entrada
                        try { fs.unlinkSync(inPath); } catch(_) {}

                        if (error) {
                            console.error("[FFmpeg Error]", error);
                            resolve(`❌ Erro no processador de mídia FFmpeg: ${error.message}`);
                            return;
                        }

                        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
                            resolve(`❌ O arquivo de saída não foi gerado pelo FFmpeg. Verifique os argumentos.`);
                            return;
                        }

                        const outBuffer = fs.readFileSync(outPath);
                        try { fs.unlinkSync(outPath); } catch(_) {}

                        const caption = `🎬 *Bochecha Media Engine: Mídia Editada!*\n\n_${plan.explanation}_`;

                        if (ext === 'mp3' || ext === 'ogg' || mediaType === 'audio') {
                            await sock.sendMessage(from, { 
                                audio: outBuffer, 
                                mimetype: ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4',
                                ptt: false 
                            });
                        } else {
                            await sock.sendMessage(from, { 
                                video: outBuffer, 
                                caption: caption 
                            });
                        }

                        resolve("Mídia processada e enviada com sucesso.");
                    });
                });
            }

            return "❌ Ação de edição não reconhecida ou suportada para este tipo de arquivo.";

        } catch (e) {
            console.error("[Universal Editor] Erro geral:", e);
            return `❌ Erro geral ao processar edição da mídia: ${e.message}`;
        }
    }
};
