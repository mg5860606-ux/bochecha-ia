const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "baixar_videos",
            description: "Baixa vídeos do TikTok ou Instagram a partir de um link. O bot detecta automaticamente a rede social.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "O link completo do vídeo do TikTok ou Reels do Instagram." }
                },
                required: ["url"]
            }
        }
    },
    async execute(args, { sock, from }) {
        const url = args.url.trim();
        const API_KEY = "SANDRO_MD_2005";
        const BASE_URL = "https://api.sandrohost.com.br/api-sandro";

        await sock.sendMessage(from, { text: "🎬 Capturando vídeo e removendo marcas d'água... Por favor, aguarde." });

        try {
            let endpoint = "";
            if (url.includes("tiktok.com")) {
                endpoint = `${BASE_URL}/tiktok?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
            } else if (url.includes("instagram.com")) {
                endpoint = `${BASE_URL}/instagram?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
            } else {
                return "❌ Link não suportado. Eu consigo baixar apenas de TikTok e Instagram (Reels/Vídeo).";
            }

            const { data } = await axios.get(endpoint);
            
            // Mapeamento dinâmico para extrair o link do vídeo da API do Sandro
            const videoUrl = data.video_url || data.video || data.url || (data.result && data.result.url) || data.link;

            if (!videoUrl) {
                return "❌ A API não conseguiu encontrar o vídeo. Verifique se o link está correto ou se o perfil é privado.";
            }

            await sock.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption: `✅ *Vídeo Processado!*\n\nOriginal: ${url}`,
                mimetype: "video/mp4"
            });

            return "Vídeo enviado com sucesso.";
        } catch (e) {
            return `Erro ao processar download: ${e.message}. Tente novamente em alguns instantes.`;
        }
    }
};
