const axios = require('axios');
const chalk = require('chalk');

/**
 * Função utilitária para limpar HTML e extrair apenas texto legível
 */
function cleanHtmlToText(html) {
    let text = html;
    
    // 1. Remove tags de script, estilo e cabeçalho completas
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    text = text.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "");
    text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");
    text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");
    
    // 2. Substitui quebras de bloco por quebras de linha para manter legibilidade
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<br\s*\/?>/gi, "\n");
    
    // 3. Remove todas as tags HTML restantes
    text = text.replace(/<[^>]+>/g, " ");
    
    // 4. Decodifica entidades HTML comuns
    text = text.replace(/&nbsp;/g, " ")
               .replace(/&lt;/g, "<")
               .replace(/&gt;/g, ">")
               .replace(/&amp;/g, "&")
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&mdash;/g, "—")
               .replace(/&ndash;/g, "–");
               
    // 5. Remove excesso de quebras de linha e espaços em branco
    text = text.split('\n')
               .map(line => line.trim())
               .filter(line => line.length > 0)
               .join('\n');
               
    text = text.replace(/[ \t]+/g, " ");
    
    return text.trim();
}

module.exports = {
    definition: {
        function: {
            name: "web_reader",
            description: "Acessa qualquer URL da internet, faz o scraping da página, limpa códigos HTML extras e retorna o conteúdo textual puro e legível para que você possa analisar e extrair informações completas de sites, códigos no GitHub ou documentações.",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "A URL completa do site ou arquivo a ser lido (ex: https://raw.githubusercontent.com/user/repo/main/file.js)."
                    }
                },
                required: ["url"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message } = ctx;
        const isCommand = args.isCommand || false;
        
        let url = isCommand ? (args.arg || "").trim() : args.url;

        if (!url) {
            const err = "⚠️ *Uso incorreto:* Forneça uma URL válida!\nExemplo: */read https://github.com*";
            if (isCommand) {
                await sock.sendMessage(from, { text: err }, { quoted: message });
                return;
            } else {
                return err;
            }
        }

        // Garante que a URL comece com http
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (isCommand) {
            await sock.sendMessage(from, { text: `🌐 *Navegando no link:* \`${url}\`...\nExtraindo dados neurais da página.` });
        }

        try {
            console.log(chalk.cyan(`[web_reader] Acessando URL: ${url}`));
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
                },
                timeout: 15000
            });

            const contentType = response.headers['content-type'] || '';
            let rawText = "";

            if (contentType.includes('json') || typeof response.data === 'object') {
                rawText = JSON.stringify(response.data, null, 2);
            } else {
                rawText = String(response.data);
            }

            // Se for HTML, limpa para extrair apenas texto legível
            let cleanedText = "";
            if (rawText.toLowerCase().includes('<html') || rawText.toLowerCase().includes('<!doctype')) {
                cleanedText = cleanHtmlToText(rawText);
            } else {
                // Se for código cru ou markdown, mantemos intacto
                cleanedText = rawText;
            }

            if (!cleanedText || cleanedText.length < 10) {
                return "❌ A página foi acessada com sucesso, mas não continha texto legível extraível.";
            }

            // Limita a leitura a 6000 caracteres para evitar estourar limites do prompt
            const isTruncated = cleanedText.length > 6000;
            const contentToReturn = isTruncated ? cleanedText.substring(0, 6000) + "\n\n... [CONTEÚDO TRUNCADO DEVILDO AO LIMITE DE TELA] ..." : cleanedText;

            // Se foi comando direto, chama a IA em background para resumir esteticamente a página para o Marcos
            if (isCommand) {
                await sock.sendMessage(from, { text: "📚 *Conteúdo lido com sucesso!* Gerando síntese neural de cria... ⚡" });
                
                const prompt = `Leia e resuma o seguinte conteúdo extraído da URL: ${url}.\nFaça uma síntese extremamente inteligente, prática, usando a linguagem e deboche do Bochecha. Destaque pontos importantes.\n\nConteúdo:\n${contentToReturn}`;
                const sys = "Você é o Bochecha-IA. Dê resumos diretos e inteligentes com gírias cariocas.";
                
                const { response: aiRes } = await global.keyRotator.executeWithRotation([], prompt, [], sys, true);
                const aiSummary = aiRes.response.text().trim();
                
                const report = `🌐 *SÍNTESE DE LEITURA WEB* 🥀\n\n` +
                               `🔗 *URL analisada:* ${url}\n\n` +
                               `📝 *Resumo Bochecha:*\n${aiSummary}\n\n` +
                               `> *BOCHECHA CRAWLER ENGINE* 💀⚡`;
                
                await sock.sendMessage(from, { text: report }, { quoted: message });
                return report;
            } else {
                // Chamado pela IA: Retorna o texto bruto limpo para que a IA analise ativamente
                return `[URL EXTRAÍDA COM SUCESSO: ${url}]\n\n[CONTEÚDO DA PÁGINA]:\n${contentToReturn}`;
            }

        } catch (e) {
            console.error('[ERRO] web_reader:', e.message);
            const errReport = `❌ *Erro ao acessar URL:* Não consegui navegar no link informado.\nDetecção do Host: \`${e.message}\``;
            if (isCommand) {
                await sock.sendMessage(from, { text: errReport }, { quoted: message });
            }
            return errReport;
        }
    }
};
