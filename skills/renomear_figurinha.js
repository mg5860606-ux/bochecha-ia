const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const WebP = require('node-webpmux');
const path = require('path');
const fs = require('fs');

module.exports = {
    definition: {
        function: {
            name: "take",
            description: "Renomeia os créditos (autor/pacote) de uma figurinha. Responda a uma figurinha.",
            parameters: {
                type: "object",
                properties: {
                    texto: { type: "string", description: "O novo texto para os créditos da figurinha." }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMsg = quotedMsg?.stickerMessage;

        if (!stickerMsg) {
            return "❌ Você precisa responder a uma *figurinha* para renomeá-la!";
        }

        try {
            await sock.sendMessage(from, { text: "🏷️ Alterando créditos... Aguarde." });

            // Download da figurinha
            const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Cria o metadado EXIF (WebP)
            const img = new WebP.Image();
            await img.load(buffer);

            const exif = {
                "sticker-pack-id": "Bochecha-IA",
                "sticker-pack-name": args.texto,
                "sticker-pack-publisher": "", // Vazio como solicitado
                "emojis": ["🦅"]
            };

            const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonStr = JSON.stringify(exif);
            const exifBuffer = Buffer.concat([exifHeader, Buffer.from(jsonStr, "utf-8")]);
            exifBuffer.writeUIntLE(jsonStr.length, 14, 4);

            img.exif = exifBuffer;
            const resultBuffer = await img.save(null);

            await sock.sendMessage(from, { sticker: resultBuffer });
            return "Figurinha renomeada com sucesso!";
        } catch (e) {
            console.error(e);
            return `❌ Erro ao renomear figurinha: ${e.message}`;
        }
    }
};
