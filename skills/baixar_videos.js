const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "baixar_videos",
            description: "Baixa vídeos sem marca d'água do TikTok, Instagram Reels, YouTube, Facebook e Pinterest a partir de um link. O bot detecta a plataforma automaticamente.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "O link completo do vídeo (TikTok/Instagram/YouTube/Facebook/Pinterest) ou termo de pesquisa do YouTube." }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.query) return "Aviso: Nenhum link ou pesquisa fornecido.";
        
        const query = args.query.trim();
        const API_KEY = "glnzLoIUlvwM6YZ4ildC";
        const BASE_URL = "https://api.spiderx.com.br/api/downloads";

        await sock.sendMessage(from, { text: "🎬 Conectando aos servidores Spider API para processar seu vídeo... Por favor, aguarde." });

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
            
            // Spider API Resilient Extraction (handles various response schemas)
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
                return `❌ A Spider API não conseguiu encontrar/processar o vídeo do ${platformName}. A API retornou uma estrutura vazia ou a conta é privada.`;
            }

            const captionStr = `✅ *Vídeo Processado [${platformName}]!*\n` +
                               (data.title ? `📌 *Título:* ${data.title}\n` : "") +
                               `\n📡 *Fornecido por:* Spider API 🕸️`;

            await sock.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption: captionStr,
                mimetype: "video/mp4"
            });

            return `Vídeo processado e enviado com sucesso usando a Spider API (${platformName}).`;
        } catch (e) {
            return `❌ Erro ao baixar vídeo via Spider API: ${e.message}. O servidor de downloads deles pode estar instável.`;
        }
    }
};
