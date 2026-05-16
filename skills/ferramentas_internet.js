const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "ferramentas_internet",
            description: "Faz buscas na internet por informações (google, wiki, clima, letra).",
            parameters: {
                type: "object",
                properties: {
                    ferramenta: { 
                        type: "string", 
                        enum: ["google", "wiki", "clima", "letra"],
                        description: "Qual ferramenta de busca usar." 
                    },
                    query: { 
                        type: "string", 
                        description: "O que você deseja pesquisar." 
                    }
                },
                required: ["ferramenta", "query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        const query = args.query;
        
        try {
            if (args.ferramenta === "google") {
                await sock.sendMessage(from, { text: `🔎 Pesquisando no Google por: *${query}*...` });
                const res = await axios.get(`https://vyturex-api.vercel.app/api/google?query=${encodeURIComponent(query)}`);
                const results = res.data.results.slice(0, 3);
                
                let text = `🌐 *RESULTADOS DO GOOGLE* 🌐\n\n`;
                results.forEach(r => {
                    text += `📌 *${r.title}*\n🔗 ${r.link}\n📄 ${r.snippet}\n\n`;
                });
                return text;
            }

            if (args.ferramenta === "wiki") {
                const res = await axios.get(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                if (res.data.title === "Not found") return "❌ Não encontrei nada na Wikipedia sobre isso.";
                
                let text = `📚 *WIKIPEDIA: ${res.data.title}* 📚\n\n`;
                text += `${res.data.extract}\n\n🔗 Mais em: ${res.data.content_urls.desktop.page}`;
                return { text, image: { url: res.data.originalimage?.source || "" } };
            }

            if (args.ferramenta === "clima") {
                const res = await axios.get(`https://vyturex-api.vercel.app/api/clima?cidade=${encodeURIComponent(query)}`);
                const { cidade, temperatura, condicao, umidade, vento } = res.data;
                
                let text = `☁️ *PREVISÃO DO TEMPO: ${cidade}* ☁️\n\n`;
                text += `🌡️ *Temperatura:* ${temperatura}\n`;
                text += `🌤️ *Condição:* ${condicao}\n`;
                text += `💧 *Umidade:* ${umidade}\n`;
                text += `💨 *Vento:* ${vento}\n`;
                return text;
            }

            if (args.ferramenta === "letra") {
                const res = await axios.get(`https://vyturex-api.vercel.app/api/letra?musica=${encodeURIComponent(query)}`);
                const { musica, artista, letra, thumb } = res.data;
                
                let text = `🎶 *LETRA: ${musica} - ${artista}* 🎶\n\n`;
                text += `${letra.slice(0, 1000)}${letra.length > 1000 ? '...' : ''}`;
                return { text, image: { url: thumb } };
            }

        } catch (e) {
            return `❌ Erro ao buscar ${args.ferramenta}: Verifique se o termo está correto.`;
        }
    }
};
