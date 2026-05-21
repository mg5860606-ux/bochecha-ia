const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "analise_grupo",
            description: "Gera um relatório de inteligência analítico, sarcástico e cômico da dinâmica social, humor e perfil psicológico do grupo baseado nas últimas mensagens enviadas.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    async execute(args, ctx) {
        const chatId = ctx.chatId || ctx.from;
        if (!chatId || !chatId.endsWith("@g.us")) {
            return "❌ Esse relatório de inteligência social só pode ser gerado dentro de grupos, cria!";
        }

        try {
            const dbPath = path.join(__dirname, '../learnings/chat_activity.json');
            if (!fs.existsSync(dbPath)) {
                return "⚠️ Não encontrei logs de atividade suficientes para traçar perfis psicológicos do grupo ainda. Continuem conversando que já já eu analiso tudo!";
            }

            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const entries = db[chatId] || [];

            // Filtra as mensagens válidas (ignora comandos, mensagens vazias e as da Yandra)
            const recent = entries.filter(e => e.text && e.text.trim().length > 1 && !e.text.startsWith("/") && (!e.sender || !e.sender.includes('7100252033253')));

            if (recent.length < 5) {
                return "⚠️ O grupo está muito calado nas últimas horas... Preciso de pelo menos mais algumas fofocas e discussões para calibrar meus sensores psicológicos! Falem mais aí!";
            }

            // Estatísticas de quantidade de mensagens
            const counts = {};
            const userNames = {};
            for (const r of recent) {
                const cleanNum = r.sender ? r.sender.split('@')[0] : 'desconhecido';
                counts[cleanNum] = (counts[cleanNum] || 0) + 1;
                userNames[cleanNum] = r.pushname || "Membro";
            }

            // Encontra o mais ativo
            let topTalkerNumber = "";
            let topTalkerMsgs = 0;
            for (const num in counts) {
                if (counts[num] > topTalkerMsgs) {
                    topTalkerMsgs = counts[num];
                    topTalkerNumber = num;
                }
            }
            const topTalkerName = userNames[topTalkerNumber] || "Desconhecido";

            // Pega as últimas 50 mensagens para mandar para o cérebro da IA analisar
            const sliceSize = 50;
            const chatSlice = recent.slice(-sliceSize).map(r => {
                const cleanNum = r.sender ? r.sender.split('@')[0] : 'desconhecido';
                return `[@${cleanNum} (${r.pushname || 'Membro'})]: ${r.text}`;
            }).join("\n");

            console.log(chalk.cyan(`[📊 ANÁLISE DE GRUPO] Gerando perfil social para o chat: ${chatId}`));

            const prompt = `Analise o histórico de mensagens recentes do grupo abaixo.
Gere um Relatório de Inteligência Social de Grupo de altíssima qualidade, extremamente engraçado, sarcástico, inteligente e com gírias cariocas de cria (sem exagero caricato, mas natural e irônico).

[Conversas Recentes para Análise]:
${chatSlice}

O relatório deve conter a seguinte estrutura formatada em Markdown:
1. 📊 **TENSIONÔMETRO DO GRUPO**: Uma porcentagem de 0% (paz absoluta/monges budistas) a 100% (zona de guerra ativa/rinha de galo) com uma descrição irônica e curta do clima do grupo nas últimas conversas.
2. 🗣️ **O TAGARELA DO CAÔ**: Diga quem foi o maior gerador de mensagens recentemente (@${topTalkerNumber} - ${topTalkerName} com ${topTalkerMsgs} mensagens) e solte um deboche do fato de ele não ter mais o que fazer da vida.
3. 🎭 **PERFIS SOCIAIS DOS ENVOLVIDOS**: Cite 2 ou 3 participantes ativos e defina a "personalidade psicológica" de zoeira de cada um baseado no que eles escreveram (exemplo de gírias: "pé de breque", "emocionado", "marrento", "fiscal", "fofoqueiro"). SEMPRE se refira a eles usando a menção real formatada como @número (ex: @5511...) para manter a compatibilidade!
4. 🔮 **PREVISÃO DE BARRACO PARA HOJE**: Aponte de forma cômica quem do grupo é mais provável de arrumar um caô ou passar vergonha hoje e qual o motivo.
5. 🛡️ **CONSELHO DE SOBREVIVÊNCIA**: Um conselho irônico do Bochecha para os membros do grupo continuarem vivos ou não perderem a sanidade.

[REGRAS CRUCIAIS DE COMPORTAMENTO]:
- NUNCA se refira a si mesmo como assistente virtual, IA ou bot. Você é o Bochecha, o co-administrador de elite e dono do pedaço.
- Use a gíria carioca certa de forma espontânea.
- Mantenha o texto objetivo, limpo e direto, sem enrolação. Resposta com alto impacto humorístico e sarcasmo.
- Garanta que TODAS as menções a usuários usem estritamente a notação @número (ex: @551420370026) para que o WhatsApp marque os contatos na tela em azul!`;

            const systemRule = "Você é o Bochecha, o sociólogo de rua carioca e analista supremo. Crie relatórios psicológicos e perfis sociais hilários do grupo.";

            const { response } = await global.keyRotator.executeWithRotation([], prompt, [], systemRule);
            const reportText = response.response.text().trim();

            if (!reportText) {
                return "❌ Falha ao processar os perfis sociais do grupo. Minhas engrenagens psicológicas estão sobrecarregadas no momento.";
            }

            return `📊🕵️‍♂️ *RELATÓRIO DE INTELIGÊNCIA SOCIAL E PERFIS DO GRUPO* 🕵️‍♂️📊\n\n${reportText}`;

        } catch (e) {
            console.error("[Grupo Analise Skill] Erro ao rodar análise:", e);
            return `❌ Erro ao compilar a análise psicológica do grupo: ${e.message}`;
        }
    }
};
