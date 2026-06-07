const fs = require("fs");
const path = require("path");
const axios = require("axios");
const YtDlpHelper = require("../lib/ytDlpHelper");

const ROOT_DIR = path.join(__dirname, "..");
const TEMP_DIR = path.join(ROOT_DIR, "temp");

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
            let endpoint = "";
            if (query) {
                endpoint = `https://api.redtube.com/?data=redtube.Videos.searchVideos&search=${encodeURIComponent(query)}&output=json`;
            } else {
                // Termo aleatório para diversificação hilária de memes adultos/brasileiros/hentai/desenhos
                const randomTerms = ["brasileira amador", "casal brasileiro", "hentai", "simpsons parody", "cartoon parody", "anime", "safada", "engraçado"];
                const rTerm = randomTerms[Math.floor(Math.random() * randomTerms.length)];
                endpoint = `https://api.redtube.com/?data=redtube.Videos.searchVideos&search=${encodeURIComponent(rTerm)}&output=json`;
            }

            const response = await axios.get(endpoint);
            const data = response.data;

            if (!data || !data.videos || data.videos.length === 0) {
                return "❌ Nenhum vídeo encontrado para essa descrição. Tente usar outros termos de busca.";
            }

            // Sorteia um vídeo da lista retornada
            const videosList = data.videos;
            const randVideo = videosList[Math.floor(Math.random() * videosList.length)].video;

            const videoPageUrl = randVideo.url;
            const videoTitle = randVideo.title || "Vídeo Adulto";
            const videoDuration = randVideo.duration || "N/A";

            await sock.sendMessage(from, { text: `📥 Vídeo encontrado: *"${videoTitle}"* (${videoDuration})\nIniciando download e processamento... Aguarde.` });

            const tempFileName = `adult_${Date.now()}.mp4`;
            const tempFilePath = path.join(TEMP_DIR, tempFileName);

            // Realiza o download via yt-dlp
            await YtDlpHelper.downloadVideo(videoPageUrl, tempFilePath);

            if (!fs.existsSync(tempFilePath)) {
                return "❌ Falha no processamento. O motor de download yt-dlp não conseguiu gerar o arquivo.";
            }

            // Verifica o tamanho do arquivo para evitar ultrapassar os limites do WhatsApp
            const stats = fs.statSync(tempFilePath);
            const fileSizeInMegabytes = stats.size / (1024 * 1024);

            if (fileSizeInMegabytes > 64) {
                fs.unlinkSync(tempFilePath);
                return `❌ O vídeo baixado é muito pesado (${fileSizeInMegabytes.toFixed(1)}MB), ultrapassando os limites de envio do WhatsApp (64MB). Tente outro termo de busca.`;
            }

            const captionText = `🔞 *Bochecha Adult-System* 🔞\n` +
                                `📌 *Título:* ${videoTitle}\n` +
                                `⏳ *Duração:* ${videoDuration}\n\n` +
                                `🔥 *Pedido por:* ${ctx.pushname || "Membro"} (Dono/Adm)`;

            await sock.sendMessage(from, {
                video: fs.readFileSync(tempFilePath),
                caption: captionText,
                mimetype: "video/mp4"
            }, { quoted: ctx.message });

            // Remove o arquivo temporário após o envio
            fs.unlinkSync(tempFilePath);

            return "Vídeo adulto enviado com sucesso.";

        } catch (err) {
            console.error("[baixar_adulto] Erro fatal:", err);
            return `❌ Falha ao processar vídeo adulto: ${err.message}`;
        }
    }
};
