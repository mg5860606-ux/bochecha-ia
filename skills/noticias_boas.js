const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "noticias_boas",
            description: "Busca notícias boas, positivas e inspiradoras de hoje na internet (opcionalmente sobre um tema específico).",
            parameters: {
                type: "object",
                properties: {
                    tema: { 
                        type: "string", 
                        description: "Tema específico para filtrar as notícias boas (ex: 'ciência', 'animais', 'saúde'). Opcional." 
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        const tema = args.tema || "";
        
        try {
            await sock.sendMessage(from, { text: `✨ Buscando notícias positivas ${tema ? `sobre *${tema}* ` : ''}para alegrar o dia...` });
            
            // Monta a query para o Google focada nos maiores portais de notícias boas do Brasil
            let query = "site:sonoticiaboa.com.br OR site:razoesparaacreditar.com";
            if (tema) {
                query += ` ${tema}`;
            }
            
            const res = await axios.get(`https://vyturex-api.vercel.app/api/google?query=${encodeURIComponent(query)}`);
            
            if (!res.data || !res.data.results || res.data.results.length === 0) {
                // Fallback de busca geral por notícias felizes se os sites específicos falharem ou não retornarem nada
                const fallbackQuery = tema ? `noticias boas positivas ${tema}` : "noticias boas de hoje positivas";
                const fallbackRes = await axios.get(`https://vyturex-api.vercel.app/api/google?query=${encodeURIComponent(fallbackQuery)}`);
                
                if (!fallbackRes.data || !fallbackRes.data.results || fallbackRes.data.results.length === 0) {
                    return "🌞 Parece que hoje o dia está calmo, mas lembre-se: coisas boas acontecem a todo momento! Não consegui encontrar nenhuma notícia específica agora.";
                }
                res.data.results = fallbackRes.data.results;
            }

            const results = res.data.results.slice(0, 3);
            
            let text = `🌞 *SÓ NOTÍCIA BOA!* 🌞\n`;
            text += `_Aqui estão algumas coisas boas acontecendo hoje:_\n\n`;
            
            results.forEach((r, idx) => {
                // Limpa título de marcas d'água dos sites se houver
                const cleanTitle = r.title.replace(/ - Só Notícia Boa| \| Razões para Acreditar/gi, "").trim();
                text += `*${idx + 1}. ${cleanTitle}*\n`;
                if (r.snippet) {
                    text += `📝 _${r.snippet}_\n`;
                }
                text += `🔗 ${r.link}\n\n`;
            });
            
            text += `✨ *Espalhe positividade! O mundo tem muita coisa boa acontecendo.*`;
            return text;
            
        } catch (e) {
            return "❌ Erro ao buscar notícias boas. Parece que os servidores de busca estão instáveis, mas continue com o pensamento positivo!";
        }
    }
};
