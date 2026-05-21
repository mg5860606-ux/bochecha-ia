const fs = require("fs");
const path = require("path");

const MIMETYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".json": "application/json",
    ".txt": "text/plain",
    ".js": "text/javascript",
    ".html": "text/html",
    ".css": "text/css"
};

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "send_file_to_whatsapp",
            description: "Envia um arquivo local do computador direto para a conversa ativa do WhatsApp. Pode mandar imagens, vídeos, áudios ou documentos em geral. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    filePath: {
                        type: "string",
                        description: "Caminho absoluto ou relativo do arquivo a ser enviado (ex: 'downloads/imagem.png' ou 'key.json')."
                    },
                    caption: {
                        type: "string",
                        description: "Legenda opcional para acompanhar o arquivo (se for imagem, vídeo ou documento)."
                    }
                },
                required: ["filePath"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para enviar arquivos da máquina.";
        }

        if (!ctx.sock) {
            return "Erro: O bot do WhatsApp está offline ou desconectado neste momento. Não é possível encaminhar o arquivo ao WhatsApp.";
        }

        const targetPath = path.resolve(args.filePath);
        if (!fs.existsSync(targetPath)) {
            return `Erro: O arquivo '${targetPath}' não existe no computador.`;
        }

        const stat = fs.statSync(targetPath);
        if (!stat.isFile()) {
            return `Erro: O caminho '${targetPath}' não é um arquivo (é um diretório).`;
        }

        // Limite de 100MB para envio no WhatsApp para evitar timeout do Baileys
        const maxSizeBytes = 100 * 1024 * 1024;
        if (stat.size > maxSizeBytes) {
            return `Erro: O arquivo é muito grande (${(stat.size / 1024 / 1024).toFixed(2)} MB). O limite máximo de envio é de 100 MB.`;
        }

        try {
            const ext = path.extname(targetPath).toLowerCase();
            const filename = path.basename(targetPath);
            const mime = MIMETYPES[ext] || "application/octet-stream";
            const buffer = fs.readFileSync(targetPath);
            
            let messageContent = {};

            if (mime.startsWith("image/")) {
                messageContent = { image: buffer, caption: args.caption || "" };
            } else if (mime.startsWith("video/")) {
                messageContent = { video: buffer, caption: args.caption || "" };
            } else if (mime.startsWith("audio/")) {
                messageContent = { audio: buffer, mimetype: mime, ptt: false };
            } else {
                // Envia como documento genérico
                messageContent = { 
                    document: buffer, 
                    mimetype: mime, 
                    fileName: filename,
                    caption: args.caption || ""
                };
            }

            await ctx.sock.sendMessage(ctx.from, messageContent, { quoted: ctx.message });
            return `Sucesso: O arquivo '${filename}' foi enviado com sucesso para o WhatsApp.`;
        } catch (e) {
            return `Falha crítica ao enviar arquivo para o WhatsApp: ${e.message}`;
        }
    }
};
