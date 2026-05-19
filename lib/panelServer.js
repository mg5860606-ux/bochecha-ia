const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const chalk = require("chalk");

function startPanelServer(port, sansekai, getSock) {
    const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const method = req.method;

        // CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }

        // Rota principal: Serve o HTML
        if (method === "GET" && parsedUrl.pathname === "/") {
            const htmlPath = path.join(__dirname, "..", "panel", "index.html");
            if (fs.existsSync(htmlPath)) {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(fs.readFileSync(htmlPath));
            } else {
                res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                res.end("Página do painel não encontrada.");
            }
            return;
        }

        // Rota para servir o avatar do Bochecha
        if (method === "GET" && parsedUrl.pathname === "/avatar.png") {
            const avatarPath = path.join(__dirname, "..", "bochecha.jpg");
            if (fs.existsSync(avatarPath)) {
                res.writeHead(200, { "Content-Type": "image/jpeg" });
                res.end(fs.readFileSync(avatarPath));
            } else {
                res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                res.end("Avatar não localizado.");
            }
            return;
        }

        // Rota para verificar status da conexão
        if (method === "GET" && parsedUrl.pathname === "/api/status") {
            const sock = getSock();
            const isWhatsappConnected = !!(sock && sock.user);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                whatsappConnected: isWhatsappConnected,
                systemControl: true
            }));
            return;
        }

        // Rota da API: Servir arquivos locais do diretório downloads (para exibir mídias na tela)
        if (method === "GET" && parsedUrl.pathname === "/api/files") {
            try {
                const filename = parsedUrl.query.name;
                if (!filename) {
                    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
                    res.end("Nome do arquivo não fornecido.");
                    return;
                }

                // Evita directory traversal por segurança
                const safeName = path.basename(filename);
                const filePath = path.join(__dirname, "..", "downloads", safeName);

                if (fs.existsSync(filePath)) {
                    const ext = path.extname(safeName).toLowerCase();
                    const mimeMap = {
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".gif": "image/gif",
                        ".webp": "image/webp",
                        ".mp4": "video/mp4",
                        ".mp3": "audio/mpeg",
                        ".m4a": "audio/mp4",
                        ".ogg": "audio/ogg",
                        ".pdf": "application/pdf"
                    };
                    const contentType = mimeMap[ext] || "application/octet-stream";
                    res.writeHead(200, { "Content-Type": contentType });
                    res.end(fs.readFileSync(filePath));
                } else {
                    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                    res.end("Arquivo não localizado.");
                }
            } catch (e) {
                res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
                res.end(e.message);
            }
            return;
        }

        // Rota da API: Obter modelos e modelo ativo
        if (method === "GET" && parsedUrl.pathname === "/api/models") {
            try {
                const settingsPath = path.join(__dirname, "..", "settings.json");
                let settings = { primaryModel: "google/gemini-2.5-flash:free" };
                if (fs.existsSync(settingsPath)) {
                    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
                }

                const gerenciarIas = require("../skills/gerenciar_ias");
                const modelAliases = gerenciarIas.MODEL_ALIASES || {};
                const friendlyNames = gerenciarIas.FRIENDLY_NAMES || {};

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    activeModel: settings.primaryModel,
                    modelAliases,
                    friendlyNames
                }));
            } catch (e) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        // Rota da API: Alterar modelo
        if (method === "POST" && parsedUrl.pathname === "/api/models") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    const newModel = data.model;
                    if (!newModel) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Modelo não fornecido" }));
                        return;
                    }

                    const settingsPath = path.join(__dirname, "..", "settings.json");
                    let settings = {};
                    if (fs.existsSync(settingsPath)) {
                        settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
                    }
                    settings.primaryModel = newModel;
                    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

                    console.log(chalk.cyan(`[⚡ Painel Web] Modelo principal alterado via painel para: ${newModel}`));

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, activeModel: newModel }));
                } catch (e) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
        // Rota da API: Limpar Histórico
        if (method === "DELETE" && parsedUrl.pathname === "/api/history") {
            try {
                await sansekai.sessionManager.saveHistory("painel-marcos", []);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        // Rota da API: Obter e Atualizar Settings
        if (parsedUrl.pathname === "/api/settings") {
            const settingsPath = path.join(__dirname, "..", "settings.json");
            if (method === "GET") {
                try {
                    const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, "utf8")) : {};
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(settings));
                } catch (e) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: e.message }));
                }
                return;
            } else if (method === "POST") {
                let body = "";
                req.on("data", chunk => body += chunk);
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, "utf8")) : {};
                        if (data.isPublic !== undefined) settings.isPublic = data.isPublic;
                        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: true, settings }));
                    } catch (e) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
                return;
            }
        }

        // Rota da API: Obter e Atualizar SYSTEM.md
        if (parsedUrl.pathname === "/api/system-prompt") {
            const systemPath = path.join(__dirname, "..", "SYSTEM.md");
            if (method === "GET") {
                try {
                    const prompt = fs.existsSync(systemPath) ? fs.readFileSync(systemPath, "utf8") : "";
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ prompt }));
                } catch (e) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: e.message }));
                }
                return;
            } else if (method === "POST") {
                let body = "";
                req.on("data", chunk => body += chunk);
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.prompt !== undefined) {
                            fs.writeFileSync(systemPath, data.prompt);
                        }
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
                return;
            }
        }
        // Rota da API: Obter histórico
        if (method === "GET" && parsedUrl.pathname === "/api/history") {
            try {
                const rawHistory = await sansekai.sessionManager.getHistory("painel-marcos");
                const safeHistory = Array.isArray(rawHistory) ? rawHistory : [];

                const history = safeHistory.map(m => {
                    let content = m.content;
                    if (m.role === "user" && content.includes("MENSAGEM:")) {
                        const parts = content.split("MENSAGEM:");
                        content = parts[1].replace(/===+$/, "").trim();
                    }
                    return {
                        role: m.role,
                        content: content,
                        timestamp: m.timestamp || new Date().toISOString()
                    };
                });

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ history }));
            } catch (e) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        // Rota da API: Enviar mensagem com mídia opcional
        if (method === "POST" && parsedUrl.pathname === "/api/chat") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    const prompt = data.prompt || "";
                    const fileData = data.file; // { base64, filename, mimeType, forwardToWhatsapp }

                    let finalPrompt = prompt;
                    let historyMessage = prompt;
                    let savedFileName = null;

                    if (fileData && fileData.base64 && fileData.filename) {
                        const downloadsDir = path.join(__dirname, "..", "downloads");
                        if (!fs.existsSync(downloadsDir)) {
                            fs.mkdirSync(downloadsDir, { recursive: true });
                        }

                        savedFileName = path.basename(fileData.filename);
                        const destPath = path.join(downloadsDir, savedFileName);
                        const fileBuffer = Buffer.from(fileData.base64, "base64");
                        fs.writeFileSync(destPath, fileBuffer);

                        console.log(chalk.green(`[⚡ Painel Web] Arquivo recebido e gravado: ${savedFileName}`));

                        // Injota metadados de arquivo para a IA e para o histórico de renderização do painel
                        finalPrompt = `[Anexo de arquivo local enviado via Painel Web: downloads/${savedFileName} (${fileData.mimeType})] ${prompt}`;
                        historyMessage = `[MÍDIA_ANEXADA: ${savedFileName} | type: ${fileData.mimeType}] ${prompt}`;

                        // Encaminha para o WhatsApp se a checkbox estiver ativa
                        if (fileData.forwardToWhatsapp) {
                            const sock = getSock();
                            if (sock) {
                                try {
                                    const mime = fileData.mimeType;
                                    let mediaType = "document";
                                    
                                    if (mime.startsWith("image/")) mediaType = "image";
                                    else if (mime.startsWith("video/")) mediaType = "video";
                                    else if (mime.startsWith("audio/")) mediaType = "audio";

                                    const owners = ["551420370091@s.whatsapp.net", "176291932332072@s.whatsapp.net"];
                                    const targetJid = owners[0];

                                    const messageOptions = {};
                                    if (mediaType === "image") {
                                        messageOptions.image = fileBuffer;
                                        if (prompt) messageOptions.caption = prompt;
                                    } else if (mediaType === "video") {
                                        messageOptions.video = fileBuffer;
                                        if (prompt) messageOptions.caption = prompt;
                                    } else if (mediaType === "audio") {
                                        messageOptions.audio = fileBuffer;
                                        messageOptions.mimetype = mime;
                                    } else {
                                        messageOptions.document = fileBuffer;
                                        messageOptions.fileName = savedFileName;
                                        messageOptions.mimetype = mime;
                                        if (prompt) messageOptions.caption = prompt;
                                    }

                                    await sock.sendMessage(targetJid, messageOptions);
                                    console.log(chalk.green(`[⚡ Painel Web] Arquivo encaminhado com sucesso para o WhatsApp.`));
                                } catch (waErr) {
                                    console.error(chalk.red(`[⚡ Painel Web] Erro ao encaminhar arquivo para o WhatsApp:`), waErr.message);
                                }
                            } else {
                                console.log(chalk.yellow(`[⚡ Painel Web] Aviso: WhatsApp offline. Arquivo não encaminhado.`));
                            }
                        }
                    }

                    if (!finalPrompt.trim()) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "O conteúdo da mensagem ou arquivo está vazio." }));
                        return;
                    }

                    const timeStr = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false });
                    const formattedMsgForHistory = 
                        `=========================================\n` +
                        `[💬 CHAT: "Painel Web"]\n` +
                        `[👤 USUÁRIO: "Marcos" | 📞 CONTATO: @painel_web | 🕒 HORA: ${timeStr} | 🏷️ HIERARQUIA: Criador (👑 Dono Absoluto)]\n` +
                        `-----------------------------------------\n` +
                        `MENSAGEM: ${historyMessage}\n` +
                        `=========================================`;

                    await sansekai.sessionManager.addMessage("painel-marcos", "user", formattedMsgForHistory);

                    const sock = getSock();
                    const aiResult = await sansekai.bochecha._callAI({
                        chatId: "painel-marcos",
                        pushname: "Marcos",
                        sender: "551420370091@s.whatsapp.net",
                        prompt: finalPrompt,
                        isOwner: true,
                        sock: sock,
                        messageRef: null
                    });

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        response: aiResult.output,
                        modelName: aiResult.modelName
                    }));
                } catch (e) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        // Caso contrário, 404
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Rota não encontrada.");
    });

    server.listen(port, () => {
        console.log(chalk.green(`[⚡ Painel Web] Servidor do Painel iniciado em http://localhost:${port}`));
    });

    return server;
}

module.exports = { startPanelServer };
