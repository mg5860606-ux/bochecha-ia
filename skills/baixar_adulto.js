const fs = require("fs");
const path = require("path");
const axios = require("axios");
const YtDlpHelper = require("../lib/ytDlpHelper");

const ROOT_DIR = path.join(__dirname, "..");
const TEMP_DIR = path.join(ROOT_DIR, "temp");

async function buscarVideosAdultos(query) {
    const termo = (query || "aleatorio").trim();
    const encodedQuery = encodeURIComponent(termo || "aleatorio");
    const endpoints = [
        `https://api.redtube.com/?data=redtube.Videos.searchVideos&search=${encodedQuery}&output=json`,
        `https://api.redtube.com/?data=redtube.Videos.searchVideos&search=${encodedQuery}&output=json&page=1`
    ];

    let lastError;
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(endpoint, {
                timeout: 12000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const payload = response?.data;
            const videos = payload?.videos || payload?.data?.videos || payload?.videosList || [];
            const normalizedVideos = Array.isArray(videos)
                ? videos
                : (Array.isArray(videos?.video) ? videos.video : []);

            if (normalizedVideos.length > 0) {
                return normalizedVideos;
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(lastError?.message || "Serviço de busca indisponível");
}

module.exports = {
    definition: {
        function: {
            name: "baixar_adulto",
            description: "Busca e realiza o download de um vídeo adulto (pornô) conforme uma descrição do usuário ou de forma aleatória.",
            parameters: {
                type: "object",
                properties: {
                    busca: {
                        type: "string",
                        description: "Termo de busca ou descrição do tipo de vídeo desejado (ex: 'brasileira amador', 'novinha safada'). Se omitido, busca um vídeo adulto aleatório."
                    }
                }
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx) return "Erro: Contexto inválido.";

        const sock = ctx.sock;
        if (!sock) return "Erro: O contexto de envio do WhatsApp não está disponível.";
        const from = ctx.from || ctx.chatId;
        const isOwner = ctx.isOwner;
        const isGroup = ctx.isGroup;

        // 1. Validar se o remetente é Dono ou Administrador do Grupo
        let isAdmin = false;
        if (isGroup && sock) {
            try {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];
                const senderNum = ctx.sender ? ctx.sender.split('@')[0] : "";
                const participant = participants.find(p => p.id.includes(senderNum));
                if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                    isAdmin = true;
                }
            } catch (e) {
                console.error("[baixar_adulto] Erro ao verificar permissões de admin:", e);
            }
        }

        if (!isOwner && !isAdmin) {
            return "Aviso: Habilidade restrita! Apenas o desenvolvedor Marcos ou os administradores deste grupo podem solicitar vídeos adultos.";
        }

        // Garante a existência do diretório temporário
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const query = (args.busca || args.texto || args.alvo || "").trim();
        await sock.sendMessage(from, { text: `🔞 *Bochecha Adult System* 🔞\nBuscando vídeo adulto ${query ? `sobre "${query}"` : "aleatório"}...` });

        try {
            let searchTerm = query;
            if (!searchTerm) {
                const randomTerms = ["brasileira amador", "casal brasileiro", "hentai", "simpsons parody", "cartoon parody", "anime", "safada", "engraçado"];
                searchTerm = randomTerms[Math.floor(Math.random() * randomTerms.length)];
            }

            let videosList = [];
            try {
                videosList = await buscarVideosAdultos(searchTerm);
            } catch (apiErr) {
                console.warn("[baixar_adulto] Falha na API externa:", apiErr.message);
                return "⚠️ O serviço de busca de vídeos adultos está temporariamente indisponível. Tente novamente em instantes.";
            }

            if (!videosList || videosList.length === 0) {
                return "❌ Nenhum vídeo encontrado para essa descrição. Tente usar outros termos de busca.";
            }

            // Função helper para converter duração formatada "mm:ss" ou "hh:mm:ss" em segundos
            const parseDurationToSeconds = (durationStr) => {
                if (!durationStr || typeof durationStr !== 'string') return 0;
                const parts = durationStr.split(':').map(Number);
                if (parts.some(isNaN)) return 0;
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                return parts[0] || 0;
            };

            // Filtrar vídeos com duração <= 240 segundos (4 minutos) para encaixar no limite ideal do WhatsApp
            let validVideos = videosList.filter(entry => {
                const v = entry.video || entry;
                const secs = parseDurationToSeconds(v.duration);
                return secs > 0 && secs <= 240;
            });

            // Se nenhum for menor que 240s, ordena e pega o mais curto disponível do resultado
            if (validVideos.length === 0) {
                validVideos = [...videosList].sort((a, b) => {
                    const va = a.video || a;
                    const vb = b.video || b;
                    return parseDurationToSeconds(va.duration) - parseDurationToSeconds(vb.duration);
                });
            }

            // Escolhe aleatoriamente entre os vídeos que atendem à regra de duração, ou seleciona o mais curto se todos excederem
            const selectedEntry = validVideos.length > 0 && parseDurationToSeconds((validVideos[0].video || validVideos[0]).duration) <= 240
                ? validVideos[Math.floor(Math.random() * validVideos.length)]
                : validVideos[0];
            const randVideo = selectedEntry?.video || selectedEntry;

            if (!randVideo?.url) {
                return "❌ Não foi possível obter um vídeo válido da busca.";
            }

            const videoPageUrl = randVideo.url;
            const videoTitle = randVideo.title || "Vídeo Adulto";
            const videoDuration = randVideo.duration || "N/A";
            const videoDurationSec = parseDurationToSeconds(videoDuration) || 240;

            await sock.sendMessage(from, { text: `📥 Vídeo encontrado: *"${videoTitle}"* (${videoDuration})\nIniciando download e processamento... Aguarde.` });

            const tempFileName = `adult_${Date.now()}.mp4`;
            const tempFilePath = path.join(TEMP_DIR, tempFileName);

            let downloadedPath = tempFilePath;
            try {
                // Passa o tempo máximo de duração dinâmico (com 15 segundos de margem de segurança)
                await YtDlpHelper.downloadVideo(videoPageUrl, tempFilePath, videoDurationSec + 15);
            } catch (downloadErr) {
                console.warn("[baixar_adulto] Falha no download via yt-dlp:", downloadErr.message);
                return "⚠️ Não foi possível baixar o vídeo no momento. O serviço externo ou o motor de download está indisponível.";
            }

            if (!fs.existsSync(downloadedPath)) {
                return "❌ Falha no processamento. O motor de download yt-dlp não conseguiu gerar o arquivo.";
            }

            // Verifica o tamanho do arquivo para evitar ultrapassar os limites do WhatsApp
            const stats = fs.statSync(downloadedPath);
            const fileSizeInMegabytes = stats.size / (1024 * 1024);

            if (fileSizeInMegabytes > 64) {
                fs.unlinkSync(downloadedPath);
                return `❌ O vídeo baixado é muito pesado (${fileSizeInMegabytes.toFixed(1)}MB), ultrapassando os limites de envio do WhatsApp (64MB). Tente outro termo de busca.`;
            }

            const captionText = `🔞 *Bochecha Adult-System* 🔞\n` +
                                `📌 *Título:* ${videoTitle}\n` +
                                `⏳ *Duração:* ${videoDuration}\n\n` +
                                `🔥 *Pedido por:* ${ctx.pushname || "Membro"} (Dono/Adm)`;

            await sock.sendMessage(from, {
                video: fs.readFileSync(downloadedPath),
                caption: captionText,
                mimetype: "video/mp4"
            }, { quoted: ctx.message });

            // Remove o arquivo temporário após o envio
            fs.unlinkSync(downloadedPath);

            return "Vídeo adulto enviado com sucesso.";

        } catch (err) {
            console.error("[baixar_adulto] Erro fatal:", err);
            return `❌ Falha ao processar vídeo adulto: ${err.message}`;
        }
    }
};
