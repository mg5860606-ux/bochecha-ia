const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "pesquisar_youtube",
            description: "Pesquisa vídeos no YouTube e retorna uma lista com os principais resultados, incluindo link, título e duração.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "O termo ou nome do vídeo para pesquisar no YouTube." }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.query) return "Aviso: Nenhum termo de pesquisa fornecido.";
        
        const query = args.query.trim();
        const API_KEY = "glnzLoIUlvwM6YZ4ildC";

        await sock.sendMessage(from, { text: `🔎 Vasculhando o YouTube em busca de "*${query}*"...` });

        try {
            const { data } = await axios.get(`https://api.spiderx.com.br/api/search/youtube?search=${encodeURIComponent(query)}&api_key=${API_KEY}`);
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                return `❌ Não encontrei nenhum resultado no YouTube para "${query}".`;
            }

            // Pega os 5 primeiros resultados
            const topResults = data.slice(0, 5);
            let texto = `▶️ *RESULTADOS DO YOUTUBE* ▶️\n🔎 Pesquisa: _${query}_\n\n`;

            topResults.forEach((v, index) => {
                texto += `*${index + 1}. ${v.title}*\n`;
                texto += `⏳ Duração: ${v.duration}\n`;
                texto += `👀 Visualizações: ${v.views}\n`;
                texto += `🔗 Link: ${v.url}\n\n`;
            });

            texto += `📡 *Fornecido por:* Servidores de Busca 🌐`;

            // Envia a capa do primeiro vídeo junto com a lista
            if (topResults[0].thumbnail) {
                await sock.sendMessage(from, { image: { url: topResults[0].thumbnail }, caption: texto });
            } else {
                await sock.sendMessage(from, { text: texto });
            }

            return "Pesquisa do YouTube realizada com sucesso.";
        } catch (e) {
            return `❌ Erro ao pesquisar no YouTube: ${e.message}`;
        }
    }
};
