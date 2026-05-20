const axios = require('axios');
const fs = require('fs');
const path = require('path');
const YtDlpHelper = require('../lib/ytDlpHelper');

// Logger local simples caso não esteja globalmente definido
const Logger = global.Logger || {
    info: (...args) => console.log("[INFO]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    success: (...args) => console.log("[SUCCESS]", ...args)
};

module.exports = {
    definition: {
        function: {
            name: "baixar_videos",
            description: "Baixa vídeos sem marca d'água de qualquer plataforma como TikTok, Instagram Reels, YouTube, Facebook, Pinterest, Twitter, Reddit ou Kwai. O bot detecta automaticamente.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "O link completo do vídeo de qualquer site ou termo de pesquisa." }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.query) return "Aviso: Nenhum link ou pesquisa fornecido.";
        
        const query = args.query.trim();
        const isUrl = query.startsWith("http://") || query.startsWith("https://");
        const API_KEY = "glnzLoIUlvwM6YZ4ildC";
        const BASE_URL = "https://api.spiderx.com.br/api/downloads";

        await sock.sendMessage(from, { text: "🎬 Conectando aos Servidores de Mídia para processar seu vídeo... Aguarde." });

        // Se for URL e não tiver nos domínios conhecidos do SpiderX, tenta o yt-dlp diretamente!
        const isSpiderXCompatible = query.includes("tiktok.com") || 
                                     query.includes("instagram.com") || 
                                     query.includes("facebook.com") || 
                                     query.includes("fb.watch") || 
                                     query.includes("pinterest.com") || 
                                     query.includes("pin.it") || 
                                     query.includes("youtube.com") || 
                                     query.includes("youtu.be");

        if (isUrl && !isSpiderXCompatible) {
            try {
                Logger.info("baixar_videos", `Plataforma não mapeada pelo SpiderX. Iniciando download via yt-dlp...`);
                const tempDir = path.join(__dirname, "..", "temp");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                const tempFilePath = path.join(tempDir, `universal_${Date.now()}.mp4`);
                await YtDlpHelper.downloadVideo(query, tempFilePath);
                
                if (fs.existsSync(tempFilePath)) {
                    await sock.sendMessage(from, { 
                        video: fs.readFileSync(tempFilePath), 
                        caption: `✅ *Vídeo baixado via Motor Universal (yt-dlp)!*\n📡 *URL:* ${query}`,
                        mimetype: "video/mp4"
                    });
                    fs.unlinkSync(tempFilePath);
                    return "Vídeo processado e enviado com sucesso.";
                }
            } catch (dlpErr) {
                Logger.error("baixar_videos.ytDlpFallback", dlpErr);
            }
        }

        try {
            let endpoint = "";
            let platformName = "";
            
            if (query.includes("tiktok.com")) {
                endpoint = `${BASE_URL}/tik-tok?url=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "TikTok";
            } else if (query.includes("instagram.com")) {
                endpoint = `${BASE_URL}/instagram?url=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "Instagram";
            } else if (query.includes("facebook.com") || query.includes("fb.watch")) {
                endpoint = `${BASE_URL}/facebook?url=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "Facebook";
            } else if (query.includes("pinterest.com") || query.includes("pin.it")) {
                endpoint = `${BASE_URL}/pinterest?url=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "Pinterest";
            } else if (query.includes("youtube.com") || query.includes("youtu.be")) {
                endpoint = `${BASE_URL}/yt-mp4?url=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "YouTube";
            } else {
                endpoint = `${BASE_URL}/play-video?search=${encodeURIComponent(query)}&api_key=${API_KEY}`;
                platformName = "YouTube Search";
            }

            const { data } = await axios.get(endpoint);
            
            // Extração resiliente da URL
            let videoUrl = data.url || data.video_url || data.video || data.link || (data.result && data.result.url);
            
            if (!videoUrl && data.data) {
                if (data.data.play) videoUrl = data.data.play;
                else if (data.data.url) videoUrl = data.data.url;
                else if (Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) videoUrl = data.data[0].url;
            }
            if (!videoUrl && data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                videoUrl = data.urls[0].url || data.urls[0];
            }

            if (!videoUrl) {
                throw new Error("Estrutura de resposta vazia recebida do servidor.");
            }

            const captionStr = `✅ *Vídeo Processado [${platformName}]!*\n` +
                               (data.title ? `📌 *Título:* ${data.title}\n` : "") +
                               `\n📡 *Fornecido por:* Servidores de Download 🌐`;

            await sock.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption: captionStr,
                mimetype: "video/mp4"
            });

            return `Vídeo processado e enviado com sucesso pelo Motor de Downloads (${platformName}).`;
        } catch (e) {
            // Se falhou a API do SpiderX, tenta o yt-dlp local como fallback de contingência
            if (isUrl) {
                try {
                    Logger.info("baixar_videos.SpiderXFailed", `Falha na API SpiderX (${e.message}). Tentando contingência com yt-dlp...`);
                    const tempDir = path.join(__dirname, "..", "temp");
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                    
                    const tempFilePath = path.join(tempDir, `universal_${Date.now()}.mp4`);
                    await YtDlpHelper.downloadVideo(query, tempFilePath);
                    
                    if (fs.existsSync(tempFilePath)) {
                        await sock.sendMessage(from, { 
                            video: fs.readFileSync(tempFilePath), 
                            caption: `✅ *Vídeo baixado via Contingência (yt-dlp)!*\n📡 *URL:* ${query}`,
                            mimetype: "video/mp4"
                        });
                        fs.unlinkSync(tempFilePath);
                        return "Vídeo processado e enviado com sucesso via motor de contingência.";
                    }
                } catch (dlpErr) {
                    Logger.error("baixar_videos.contingencyDlp", dlpErr);
                }
            }
            return `❌ Erro ao baixar vídeo: ${e.message}. O servidor de downloads deles pode estar instável.`;
        }
    }
};

