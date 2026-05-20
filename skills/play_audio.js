const axios = require('axios');
const fs = require('fs');
const path = require('path');
const YtDlpHelper = require('../lib/ytDlpHelper');

// Logger local simples
const Logger = global.Logger || {
    info: (...args) => console.log("[INFO]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    success: (...args) => console.log("[SUCCESS]", ...args)
};

module.exports = {
    definition: {
        function: {
            name: "play_audio",
            description: "Faz o download e envia o áudio de uma música de qualquer plataforma ou pesquisando pelo nome.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "O nome da música, cantor ou link direto da música/vídeo." }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.query) return "Aviso: Nenhum nome de música foi fornecido.";

        const query = args.query.trim();
        const isUrl = query.startsWith("http://") || query.startsWith("https://");
        await sock.sendMessage(from, { text: `🎵 Conectando aos Servidores de Áudio para baixar "${query}"...` });

        try {
            const API_KEY = "glnzLoIUlvwM6YZ4ildC";
            const endpoint = `https://api.spiderx.com.br/api/downloads/play-audio?search=${encodeURIComponent(query)}&api_key=${API_KEY}`;

            const { data } = await axios.get(endpoint);

            if (!data || !data.url) {
                throw new Error("Música não encontrada nos servidores padrão.");
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
            // Fallback para download de áudio via yt-dlp
            try {
                Logger.info("play_audio", `Falha na API de Áudio (${e.message}). Iniciando contingência com yt-dlp...`);
                const tempDir = path.join(__dirname, "..", "temp");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                const tempFilePath = path.join(tempDir, `music_${Date.now()}.mp3`);
                
                // Se for termo de busca e não URL, yt-dlp suporta prefixo "ytsearch:"
                const downloadUrl = isUrl ? query : `ytsearch:${query}`;
                const finalAudioPath = await YtDlpHelper.downloadAudio(downloadUrl, tempFilePath);
                
                if (fs.existsSync(finalAudioPath)) {
                    const mimetype = finalAudioPath.endsWith(".m4a") ? "audio/x-m4a" : "audio/mpeg";
                    await sock.sendMessage(from, {
                        audio: fs.readFileSync(finalAudioPath),
                        mimetype: mimetype,
                        ptt: false
                    });
                    fs.unlinkSync(finalAudioPath);
                    return "Música processada e enviada com sucesso via motor de contingência (yt-dlp).";
                }
            } catch (dlpErr) {
                Logger.error("play_audio.contingencyDlp", dlpErr);
            }
            return `❌ Erro ao baixar música: ${e.message}. O servidor de áudio pode estar instável no momento.`;
        }
    }
};

