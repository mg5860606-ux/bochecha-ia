const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

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

function searchFilesRecursive(dir, query, results = [], maxResults = 20) {
    if (results.length >= maxResults) return results;
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (results.length >= maxResults) break;
            const fullPath = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch {
                continue;
            }

            if (stat.isDirectory()) {
                if (item !== "node_modules" && item !== ".git" && item !== "bochecha_sessao" && item !== ".gemini") {
                    searchFilesRecursive(fullPath, query, results, maxResults);
                }
            } else {
                if (item.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        name: item,
                        path: fullPath,
                        size: stat.size,
                        sizeStr: (stat.size / 1024).toFixed(2) + " KB"
                    });
                }
            }
        }
    } catch {}
    return results;
}

module.exports = {
    definition: {
        function: {
            name: "pc_file_manager",
            description: "Gerencia arquivos locais no computador do Marcos. Permite buscar e baixar arquivos locais, ou salvar arquivos recebidos no PC.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["buscar", "salvar"],
                        description: "Ação a ser executada: 'buscar' para pesquisar e enviar arquivo, ou 'salvar' para salvar um arquivo recebido."
                    },
                    query: {
                        type: "string",
                        description: "Termo de busca ou nome do arquivo para encontrar."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        if (!isOwner) {
            return "🚨 Acesso negado! Este comando de controle de arquivos é exclusivo do meu criador.";
        }

        const isCommand = args.isCommand || false;
        let action = args.acao || "";
        let query = args.query || "";

        if (isCommand) {
            action = args.command === "/buscar_arquivo" ? "buscar" : "salvar";
            query = (args.arg || "").trim();
        }

        if (action === "buscar") {
            if (!query) {
                return "⚠️ Forneça o nome ou parte do nome do arquivo que deseja buscar. Exemplo: `/buscar_arquivo foto.jpg`";
            }

            await sock.sendMessage(from, { text: `🔍 *Buscando arquivo:* \`${query}\` no PC...` });

            const results = searchFilesRecursive(".", query);
            if (results.length === 0) {
                return `❌ Nenhum arquivo correspondente a '${query}' foi encontrado no computador.`;
            }

            // Se encontrou múltiplos arquivos, lista para o usuário e se for apenas um, já envia direto
            if (results.length > 1) {
                let msg = `⚠️ *Múltiplos arquivos encontrados (${results.length}):*\n\n`;
                results.forEach((r, idx) => {
                    msg += `${idx + 1}. *${r.name}* (${r.sizeStr})\n📂 \`${r.path}\`\n\n`;
                });
                msg += `👉 Use o nome exato do arquivo desejado para que eu possa enviá-lo.`;
                return msg;
            }

            // Apenas 1 resultado: envia diretamente
            const targetFile = results[0];
            const maxSizeBytes = 100 * 1024 * 1024; // 100MB
            if (targetFile.size > maxSizeBytes) {
                return `⚠️ O arquivo '${targetFile.name}' é muito grande (${targetFile.sizeStr}). O limite máximo de envio é de 100 MB.`;
            }

            try {
                await sock.sendMessage(from, { text: `📦 *Arquivo encontrado!* Preparando para enviar: *${targetFile.name}* (${targetFile.sizeStr})...` });

                const ext = path.extname(targetFile.path).toLowerCase();
                const mime = MIMETYPES[ext] || "application/octet-stream";
                const buffer = fs.readFileSync(targetFile.path);

                let messageContent = {};
                if (mime.startsWith("image/")) {
                    messageContent = { image: buffer, caption: `📂 ${targetFile.name}` };
                } else if (mime.startsWith("video/")) {
                    messageContent = { video: buffer, caption: `📂 ${targetFile.name}` };
                } else if (mime.startsWith("audio/")) {
                    messageContent = { audio: buffer, mimetype: mime, ptt: false };
                } else {
                    messageContent = { 
                        document: buffer, 
                        mimetype: mime, 
                        fileName: targetFile.name,
                        caption: `📂 ${targetFile.name}`
                    };
                }

                await sock.sendMessage(from, messageContent, { quoted: message });
                return `✅ Arquivo *${targetFile.name}* enviado com sucesso.`;
            } catch (err) {
                return `❌ Erro ao enviar o arquivo: ${err.message}`;
            }
        }

        if (action === "salvar") {
            // Verifica se está respondendo a uma mensagem que contém mídia
            let msgObj = message.message;
            if (msgObj?.extendedTextMessage?.contextInfo?.quotedMessage) {
                msgObj = msgObj.extendedTextMessage.contextInfo.quotedMessage;
            }

            const mediaType = Object.keys(msgObj || {}).find(k => k.includes('Message'));
            if (!mediaType || !['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(mediaType)) {
                return "⚠️ Responda a uma mensagem de arquivo (documento, foto, vídeo ou áudio) com o comando `/enviar_arquivo` para salvá-lo no PC.";
            }

            try {
                await sock.sendMessage(from, { text: "📥 Baixando e salvando arquivo no PC..." });

                // Determina o nome do arquivo
                let filename = `received_${Date.now()}`;
                if (mediaType === 'documentMessage' && msgObj.documentMessage.fileName) {
                    filename = msgObj.documentMessage.fileName;
                } else {
                    // Adiciona extensão aproximada baseada no tipo
                    const extMap = { imageMessage: '.jpg', videoMessage: '.mp4', audioMessage: '.mp3' };
                    filename += extMap[mediaType] || '.bin';
                }

                // Cria pasta downloads se não existir
                const downloadDir = path.join('.', 'downloads');
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }

                const destPath = path.join(downloadDir, filename);

                // Baixa o conteúdo
                const stream = await downloadContentFromMessage(msgObj[mediaType], mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                fs.writeFileSync(destPath, buffer);
                
                const sizeStr = (buffer.length / 1024).toFixed(2) + " KB";
                return `✅ Arquivo salvo com sucesso no computador!\n\n📂 *Caminho:* \`${destPath}\`\n📊 *Tamanho:* ${sizeStr}`;

            } catch (err) {
                return `❌ Falha ao salvar arquivo no computador: ${err.message}`;
            }
        }
    }
};
