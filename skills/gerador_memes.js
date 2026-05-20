const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Jimp, loadFont, JimpMime, HorizontalAlign } = require('jimp');

module.exports = {
    definition: {
        function: {
            name: "gerador_memes",
            description: "Cria um meme sobrepondo texto em cima e embaixo de uma imagem citada/enviada.",
            parameters: {
                type: "object",
                properties: {
                    textoCima: {
                        type: "string",
                        description: "Texto a ser desenhado na parte superior da imagem."
                    },
                    textoBaixo: {
                        type: "string",
                        description: "Texto a ser desenhado na parte inferior da imagem."
                    }
                },
                required: ["textoCima"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message } = ctx;

        let textoCima = args.textoCima || "";
        let textoBaixo = args.textoBaixo || "";

        // Se for comando direto (/meme "cima" "baixo" ou /meme cima | baixo)
        if (args.isCommand) {
            const rawArg = (args.arg || "").trim();
            if (!rawArg) {
                return "⚠️ *Uso correto:* Responda a uma foto com: \n`/meme TEXTO DE CIMA | TEXTO DE BAIXO`\n(Use o caractere '|' para separar a parte superior da inferior).";
            }

            const parts = rawArg.split('|');
            textoCima = parts[0] ? parts[0].trim() : "";
            textoBaixo = parts[1] ? parts[1].trim() : "";
        }

        // Pega a mensagem citada ou a atual
        let msgObj = message.message;
        if (msgObj?.extendedTextMessage?.contextInfo?.quotedMessage) {
            msgObj = msgObj.extendedTextMessage.contextInfo.quotedMessage;
        }

        const mediaType = Object.keys(msgObj || {}).find(k => k.includes('Message'));
        if (!mediaType || mediaType !== 'imageMessage') {
            return "❌ Você precisa responder a uma imagem/foto com o comando `/meme` para poder transformá-la em meme!";
        }

        await sock.sendMessage(from, { text: "🎨 *Bochecha Meme Factory:* Desenhando e moldando seu meme... Aguarde!" });

        try {
            // Baixa a imagem original
            const stream = await downloadContentFromMessage(msgObj[mediaType], mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Carrega imagem no Jimp
            const image = await Jimp.read(buffer);

            // Caminhos dos arquivos de fontes locais do node_modules do Jimp
            const baseFontDir = path.join(__dirname, '..', 'node_modules', '@jimp', 'plugin-print', 'dist', 'fonts', 'open-sans');
            
            // Decidir tamanho da fonte baseado na largura da imagem
            const fontName = image.bitmap.width > 800 ? 'open-sans-64' : 'open-sans-32';
            
            const fontPathWhite = path.join(baseFontDir, `${fontName}-white`, `${fontName}-white.fnt`);
            const fontPathBlack = path.join(baseFontDir, `${fontName}-black`, `${fontName}-black.fnt`);

            const fontWhite = await loadFont(fontPathWhite);
            const fontBlack = await loadFont(fontPathBlack);

            const padding = 15;
            const maxWidth = image.bitmap.width - (padding * 2);

            // Helper para desenhar texto centralizado com outline preto
            const printTextWithOutline = (text, yPos, isBottom = false) => {
                const textStr = text.toUpperCase();
                
                // Calcula y correto se for embaixo
                let finalY = yPos;
                if (isBottom) {
                    // Para texto no rodapé, estimamos a altura
                    const textHeight = fontName.includes('64') ? 70 : 35;
                    finalY = image.bitmap.height - textHeight - padding;
                }

                // Desenha contorno preto deslocando 2 pixels
                const offsets = [
                    [-2, 0], [2, 0], [0, -2], [0, 2],
                    [-2, -2], [2, 2], [-2, 2], [2, -2]
                ];

                for (const [ox, oy] of offsets) {
                    image.print({
                        font: fontBlack,
                        x: padding + ox,
                        y: finalY + oy,
                        text: textStr,
                        alignmentX: HorizontalAlign.CENTER,
                        maxWidth: maxWidth
                    });
                }

                // Desenha o texto branco principal por cima
                image.print({
                    font: fontWhite,
                    x: padding,
                    y: finalY,
                    text: textStr,
                    alignmentX: HorizontalAlign.CENTER,
                    maxWidth: maxWidth
                });
            };

            // Desenha a parte de cima
            if (textoCima) {
                printTextWithOutline(textoCima, padding, false);
            }

            // Desenha a parte de baixo
            if (textoBaixo) {
                printTextWithOutline(textoBaixo, 0, true);
            }

            // Converte de volta para buffer JPEG
            const outBuffer = await image.getBuffer(JimpMime.jpeg);

            await sock.sendMessage(from, { 
                image: outBuffer, 
                caption: `🔥 *Meme fresquinho feito pelo Bochecha Meme Factory!* 💀🥀` 
            }, { quoted: message });

            return "Meme gerado e enviado com sucesso.";

        } catch (err) {
            console.error(err);
            return `❌ Falha ao tentar desenhar o meme na foto: ${err.message}`;
        }
    }
};
