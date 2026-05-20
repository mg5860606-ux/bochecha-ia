const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "detetive_fake_news",
            description: "Investiga se uma notícia, afirmação ou link enviado é Fake News ou verdade com base em buscas no Google e inteligência artificial.",
            parameters: {
                type: "object",
                properties: {
                    noticia: {
                        type: "string",
                        description: "O texto ou manchete da notícia a ser investigada."
                    },
                    url: {
                        type: "string",
                        description: "A URL opcional para investigar caso o usuário tenha enviado um link."
                    }
                },
                required: ["noticia"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, sender } = ctx;
        const isCommand = args.isCommand || false;

        let targetText = "";
        let targetUrl = "";

        if (isCommand) {
            const cmdArgs = (args.arg || "").trim();
            
            // 1. Verifica se está respondendo a uma mensagem (quoted)
            const contextInfo = message.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            if (quotedMsg) {
                if (quotedMsg.conversation) targetText = quotedMsg.conversation;
                else if (quotedMsg.extendedTextMessage?.text) targetText = quotedMsg.extendedTextMessage.text;
                else if (quotedMsg.imageMessage?.caption) targetText = quotedMsg.imageMessage.caption;
                else if (quotedMsg.videoMessage?.caption) targetText = quotedMsg.videoMessage.caption;
            } else {
                targetText = cmdArgs;
            }
        } else {
            targetText = args.noticia || "";
            targetUrl = args.url || "";
        }

        // Se não houver nada para investigar
        if (!targetText.trim() && !targetUrl.trim()) {
            const err = "⚠️ *Uso incorreto:* Por favor, forneça o texto da notícia para investigar ou responda a uma mensagem com o comando */fake* / */detetive*.";
            if (isCommand) {
                await sock.sendMessage(from, { text: err }, { quoted: message });
                return;
            } else {
                return err;
            }
        }

        // Extrai link se houver no texto investigado
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const foundUrls = targetText.match(urlRegex);
        if (foundUrls && foundUrls.length > 0) {
            targetUrl = foundUrls[0];
        }

        if (isCommand) {
            await sock.sendMessage(from, { text: `🕵️‍♂️ *BOCHECHA INVESTIGAÇÕES* 🕵️‍♂️\n\nIniciando busca profunda por fatos no Google e cruzando referências com a mente central. Aguarde um instante, cria...` });
        }

        let searchResultsText = "";
        let searchQuery = targetText;

        // Se tiver URL, tenta pesquisar pelo título ou domínio + termos limpos da URL
        if (targetUrl) {
            // Tenta limpar a URL para criar uma query de busca decente
            try {
                const urlObj = new URL(targetUrl);
                const pathParts = urlObj.pathname.split('/').filter(p => p.length > 2);
                if (pathParts.length > 0) {
                    searchQuery = pathParts.join(' ').replace(/[-_]/g, ' ');
                } else {
                    searchQuery = urlObj.hostname;
                }
            } catch (e) {
                searchQuery = targetUrl;
            }
        }

        // Limita tamanho da query de busca
        searchQuery = searchQuery.substring(0, 150).trim();

        // 2. Realiza busca no Google usando a API do bot
        try {
            const res = await axios.get(`https://vyturex-api.vercel.app/api/google?query=${encodeURIComponent(searchQuery)}`, { timeout: 8000 });
            if (res.data && res.data.results && res.data.results.length > 0) {
                const results = res.data.results.slice(0, 4);
                results.forEach((r, idx) => {
                    searchResultsText += `[Fonte ${idx + 1}]:\nTítulo: ${r.title}\nLink: ${r.link}\nResumo: ${r.snippet}\n\n`;
                });
            }
        } catch (searchErr) {
            console.error("[Detetive Fake News] Erro de busca no Google:", searchErr.message);
            searchResultsText = "Não foi possível coletar dados do Google devido a um erro de conexão.";
        }

        // 3. Executa a IA para dar o veredito final
        const currentBrain = global.keyRotator;
        if (!currentBrain) {
            return "❌ Cérebros neurais offline. Impossível rodar investigação de fake news no momento.";
        }

        const factPrompt = `Você é o Bochecha-IA, detetive supremo de fake news do submundo.
Sua missão é dar um veredito real e factível sobre a seguinte notícia/link suspeito enviado pelo usuário.

[CONTEÚDO PARA INVESTIGAÇÃO]:
"${targetText}" ${targetUrl ? `\nLink original: ${targetUrl}` : ''}

[DADOS COLETADOS DO GOOGLE SEARCH]:
${searchResultsText || "Nenhum resultado relevante encontrado no Google."}

Instruções e Estrutura do Laudo Bochecha:
1. Comece estimando uma porcentagem de probabilidade irônica de ser FAKE NEWS (ex: 📊 *Nível de Fake News:* 95% [FAKE]).
2. Defina um veredito curto e debochado usando gírias do submundo carioca (ex: "Tá de K.O brabo", "Papo reto/Verdadeiro", "Exagero do caralho").
3. Apresente um resumo claro chamado "O que estão inventando?" contra "O que é real/Fatos".
4. Indique as referências encontradas na busca Google.
5. Use um tom seguro, perspicaz e sarcástico de cria.
6. **REGRA CRUCIAL SUPREMA:** Você está TERMINANTEMENTE PROIBIDO de finalizar sua resposta com perguntas ou questionamentos. Diga o que precisa dizer e encerre com uma frase direta de efeito ou uma assinatura estática. NUNCA pergunte ao usuário o que ele acha, se ele tem dúvidas ou se precisa de mais ajuda!`;

        try {
            const sysRule = "Você é o Bochecha-IA, o inquisidor safo do WhatsApp. Dê laudos de fake news diretos, cariocas e sarcásticos sem fazer perguntas no final.";
            const { response: aiRes } = await currentBrain.executeWithRotation([], factPrompt, [], sysRule, true);
            const reportText = aiRes.response.text().trim();

            const finalReport = `╔═══════════════════════════════╗\n` +
                                `   🕵️‍♂️ LAUDO PERICIAL ANTIBOATOS 🕵️‍♂️\n` +
                                `╚═══════════════════════════════╝\n\n` +
                                `${reportText}\n\n` +
                                `> *BOCHECHA FACTS CHECKER v4.5* 💀⚡🥀`;

            if (isCommand) {
                await sock.sendMessage(from, { text: finalReport }, { quoted: message });
            }
            return finalReport;

        } catch (err) {
            console.error("[Detetive Fake News] Erro ao processar laudo pela IA:", err);
            return "❌ Ocorreu um erro interno ao compilar os dados da investigação.";
        }
    }
};
