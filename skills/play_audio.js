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

        await sock.sendMessage(from, { text: `🎵 Conectando aos Servidores SandroHost para buscar "${args.query}"...` });

        try {
            const API_KEY = "SANDRO_MD_2005";
            const q = encodeURIComponent(args.query.trim());

            let thumbUrl = "https://files.catbox.moe/t7w3gk.jpg"; // Imagem fallback
            let textoInfo = "";
            
            // 1. Pesquisa informações do vídeo (thumbnail, tempo, etc)
            try {
                const { data } = await axios.get(`https://api.sandrohost.com.br/api-sandro/pesquisa_ytb?nome=${q}&apikey=${API_KEY}`);
                if (data && data.length > 0 && data[0]) {
                    thumbUrl = data[0].thumb || thumbUrl;
                    textoInfo = `🎵 *${data[0].titulo}*\n⏳ *Tempo:* ${data[0].tempo}\n\n📡 Baixando Áudio Original...`;
                }
            } catch (err) {
                textoInfo = `📡 Baixando Áudio direto via API Sandro...`;
            }

            // 2. Envia a Capa do Vídeo
            await sock.sendMessage(from, { image: { url: thumbUrl }, caption: textoInfo });

            // 3. Envia o Áudio puxando direto da URL Play da API
            const audioUrl = `https://api.sandrohost.com.br/api-sandro/play?nome_url=${q}&apikey=${API_KEY}`;

            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mp4',
                ptt: false // false para ser player de música (MP3)
            });

            return "A música foi processada e enviada com sucesso usando a API Legacy do SandroHost.";
        } catch (e) {
            return `Erro na API do SandroHost: ${e.message}. O servidor de áudio deles pode estar instável.`;
        }
    }
};
