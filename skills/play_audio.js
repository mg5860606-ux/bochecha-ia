const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "play_audio",
            description: "Faz o download e envia o áudio de uma música do YouTube pesquisando pelo nome. O usuário DEVE informar o nome da música.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "O nome da música ou cantor." }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.query) return "Aviso: Nenhum nome de música foi fornecido.";

        const query = args.query.trim();
        await sock.sendMessage(from, { text: `🎵 Conectando aos Servidores de Áudio Premium para baixar "${query}"...` });

        try {
            const API_KEY = "glnzLoIUlvwM6YZ4ildC";
            const endpoint = `https://api.spiderx.com.br/api/downloads/play-audio?search=${encodeURIComponent(query)}&api_key=${API_KEY}`;

            const { data } = await axios.get(endpoint);

            if (!data || !data.url) {
                return "❌ A API de Áudio não encontrou música para essa pesquisa. Verifique se o nome está correto.";
            }

            const formatDuration = (sec) => {
                if (!sec) return "Indisponível";
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                return `${m}:${s < 10 ? '0' : ''}${s}`;
            };

            const thumbUrl = data.thumbnail || "https://files.catbox.moe/t7w3gk.jpg";
            const caption = `🎵 *${data.title || query}*\n` +
                            `📺 *Canal:* ${data.channel?.name || "Não informado"}\n` +
                            `⏳ *Duração:* ${formatDuration(data.total_duration_in_seconds)}\n\n` +
                            `📡 *Processado por:* Servidores Premium 🎵`;

            // 1. Envia a capa da música
            await sock.sendMessage(from, { image: { url: thumbUrl }, caption });

            // 2. Envia o áudio (Player MP3)
            await sock.sendMessage(from, {
                audio: { url: data.url },
                mimetype: 'audio/mp4',
                ptt: false // false para ser player de música (MP3)
            });

            return "A música foi processada e enviada com sucesso.";
        } catch (e) {
            return `❌ Erro ao baixar música via Servidor Premium: ${e.message}. O servidor de áudio pode estar instável no momento.`;
        }
    }
};
