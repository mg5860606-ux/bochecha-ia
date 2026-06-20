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
        const tema = args.tema ? args.tema.toLowerCase().trim() : "";
        
        try {
            await sock.sendMessage(from, { text: `✨ Buscando notícias positivas ${tema ? `sobre *${tema}* ` : ''}para alegrar o dia...` });
            
            const res = await axios.get('https://www.sonoticiaboa.com.br/feed/');
            const xml = res.data;
            
            const items = [];
            const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
            let match;
            while ((match = itemRegex.exec(xml)) !== null) {
                const itemContent = match[1];
                const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
                const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
                const descMatch = /<description>([\s\S]*?)<\/description>/.exec(itemContent);
                
                let title = titleMatch ? titleMatch[1].trim() : '';
                let link = linkMatch ? linkMatch[1].trim() : '';
                let desc = descMatch ? descMatch[1].trim() : '';
                
                title = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
                link = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
                desc = desc.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
                
                desc = desc.replace(/<[^>]*>/g, '').trim();
                desc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
                title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

                if (title && link) {
                    items.push({ title, link, snippet: desc });
                }
            }

            if (items.length === 0) {
                return "🌞 Parece que hoje o dia está calmo, mas lembre-se: coisas boas acontecem a todo momento! Não consegui encontrar notícias no momento.";
            }

            let filteredItems = items;
            let temaEncontrado = true;
            if (tema) {
                filteredItems = items.filter(item => 
                    item.title.toLowerCase().includes(tema) || 
                    item.snippet.toLowerCase().includes(tema)
                );
                if (filteredItems.length === 0) {
                    filteredItems = items;
                    temaEncontrado = false;
                }
            }

            const results = filteredItems.slice(0, 3);
            
            let text = `🌞 *SÓ NOTÍCIA BOA!* 🌞\n`;
            if (tema) {
                if (temaEncontrado) {
                    text += `_Aqui estão algumas notícias positivas sobre *${args.tema}*:_\n\n`;
                } else {
                    text += `_Não encontrei notícias recentes sobre *${args.tema}*, mas aqui estão as últimas de hoje para alegrar seu dia:_\n\n`;
                }
            } else {
                text += `_Aqui estão algumas coisas boas acontecendo hoje:_\n\n`;
            }
            
            results.forEach((r, idx) => {
                const cleanTitle = r.title.replace(/ - Só Notícia Boa/gi, "").trim();
                text += `*${idx + 1}. ${cleanTitle}*\n`;
                if (r.snippet) {
                    const cleanSnippet = r.snippet.replace(/\[&hellip;\]/g, "...").trim();
                    text += `📝 _${cleanSnippet}_\n`;
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
