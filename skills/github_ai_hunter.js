const axios = require('axios');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "github_ai_hunter",
            description: "Pesquisa, caça e analisa de forma inteligente as AIs mais poderosas, autônomas e de última geração no GitHub (como frameworks de agentes, SWE agents e orquestradores). Fornece relatórios detalhados com comparação, ferramentas e aplicabilidade.",
            parameters: {
                type: "object",
                properties: {
                    busca: {
                        type: "string",
                        description: "Opcional: termo específico de busca de IA (ex: 'multi-agent', 'crewai', 'coding agent'). Se vazio, busca os principais agentes SOTA atuais."
                    }
                }
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        const isCommand = args.isCommand || false;
        
        let query = isCommand ? (args.arg || "").trim() : (args.busca || "");
        
        if (isCommand) {
            await sock.sendMessage(from, { text: `🔍 *BOCHECHA AI HUNTER ENGINE* 🥀\n\nIniciando varredura neural no GitHub por inteligências artificiais autônomas...\nTermo de busca: \`${query || "Geral/SOTA"}\`` });
        }

        // Cache local detalhado e premium para falha da API do GitHub ou rate-limit
        const fallbackAIs = [
            {
                name: "Claude Code",
                owner: "Anthropic",
                stars: "SOTA 2026",
                description: "Agente de engenharia de software via terminal de última geração da Anthropic. Capaz de programar, refatorar, testar e executar comandos de forma autônoma e interativa.",
                tools: "CLI, Git, Command Execution, File Search & Edit",
                strength: "Orquestração híbrida inteligente e excelente em codificação extrema."
            },
            {
                name: "CrewAI",
                owner: "joaomdmoura",
                stars: "22k+",
                description: "Framework premium para orquestrar agentes de IA autônomos que cooperam entre si. Excelente para dividir tarefas complexas entre diferentes papéis (gerente, redator, desenvolvedor).",
                tools: "LangChain Tools, Custom Python Tools, Crew Orchestration",
                strength: "Simplicidade, delegação de tarefas e estruturação de workflows colaborativos."
            },
            {
                name: "browser-use",
                owner: "browser-use",
                stars: "18k+",
                description: "Biblioteca para fazer qualquer LLM navegar na web de forma visual usando Playwright. Permite cliques reais, preenchimento de formulários, logins e mineração de dados complexos.",
                tools: "Playwright, Visual Viewport, DOM Tree Parsing",
                strength: "Navegação visual extremamente realista e perfeita para automações de browser."
            },
            {
                name: "Microsoft AutoGen",
                owner: "microsoft",
                stars: "34k+",
                description: "Framework revolucionário para criar sistemas multiagente conversacionais. Suporta conversas dinâmicas de múltiplos agentes para resolver problemas em conjunto.",
                tools: "Code Execution Environment, Multi-Agent Conversation",
                strength: "Flexibilidade na conversação de agentes e execução nativa de códigos Python."
            },
            {
                name: "LangGraph",
                owner: "langchain-ai",
                stars: "10k+",
                description: "Biblioteca para construir aplicações multiagente com fluxos cíclicos e controle de estado persistente. Ideal para agentes complexos que requerem loops e decisões condicionais.",
                tools: "State Preservation, Cycles/Loops, Graph Construction",
                strength: "Controle absoluto sobre o fluxo do agente e histórico de decisões."
            },
            {
                name: "OpenHands (OpenDevin)",
                owner: "All-Hands-AI",
                stars: "38k+",
                description: "Plataforma de agente de software livre e comunitária (SWE agent). Escreve código, roda testes no terminal local ou Docker e corrige bugs autonomamente.",
                tools: "Sandboxed Docker CLI, Browser, File Editor",
                strength: "Ambiente sandbox seguro (Docker) e focado em engenharia de software real."
            }
        ];

        let results = [];
        let searchUsed = "GitHub API (Real-Time)";

        try {
            const apiQuery = query ? `${query} topic:ai topic:agent` : "stars:>5000 topic:agent topic:ai";
            const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(apiQuery)}&sort=stars&order=desc&per_page=6`;
            
            console.log(chalk.cyan(`[github_ai_hunter] Buscando no GitHub: ${githubUrl}`));
            
            const response = await axios.get(githubUrl, {
                headers: {
                    'User-Agent': 'Bochecha-IA-Hunter',
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 8000
            });

            if (response.data && response.data.items && response.data.items.length > 0) {
                results = response.data.items.map(item => ({
                    name: item.name,
                    owner: item.owner?.login || "Desconhecido",
                    stars: `${(item.stargazers_count / 1000).toFixed(1)}k`,
                    description: item.description || "Sem descrição disponível.",
                    url: item.html_url
                }));
            } else {
                throw new Error("Busca vazia no GitHub.");
            }
        } catch (e) {
            console.log(chalk.yellow(`[github_ai_hunter] Falha ou rate limit na API do GitHub, usando dados locais premium.`));
            results = fallbackAIs.map(item => ({
                name: item.name,
                owner: item.owner,
                stars: item.stars,
                description: item.description,
                url: `https://github.com/${item.owner}/${item.name.toLowerCase().replace(" ", "-")}`
            }));
            searchUsed = "Subconsciente Neural (Fallback)";
        }

        // Preparar relatório cru para enviar à IA
        let rawReport = `Resultados da Busca de IAs no GitHub (Origem: ${searchUsed}):\n\n`;
        results.forEach((r, idx) => {
            rawReport += `[IA #${idx+1}] - ${r.name}\n`;
            rawReport += `- Desenvolvedor/Dono: ${r.owner}\n`;
            rawReport += `- Popularidade (Stars): ${r.stars}\n`;
            rawReport += `- Descrição: ${r.description}\n`;
            rawReport += `- Link: ${r.url}\n\n`;
        });

        // Se a IA e chave estiverem ativas, gera uma análise estilosa com linguagem Bochecha
        if (global.keyRotator) {
            try {
                if (isCommand) {
                    await sock.sendMessage(from, { text: "🧠 *Conectando neurônios premium...* Analisando arquiteturas, ferramentas e forças com IA de Cria! ⚡" });
                }

                const prompt = `Analise os seguintes resultados de busca de Inteligência Artificial e Agentes Autônomos no GitHub.
Crie um relatório premium, estruturado, prático e em Português do Brasil com o estilo irônico, inteligente e leal ao Marcos do Bochecha-IA.
Para cada projeto:
1. Faça um resumo da inteligência dele.
2. Identifique os pontos fortes e quais ferramentas/skills ele domina (ex: CLI, Browser, Multi-agente, Coding).
3. Diga para que tipo de projeto o Marcos deve usar essa IA específica.
Adicione um cabeçalho neon estiloso e uma assinatura marcante ao final.

Dados brutos:\n${rawReport}`;

                const systemInstruction = "Você é o Bochecha-IA, uma mente cibernética sarcástica e genial de cria criada pelo Marcos.";
                
                const { response: aiRes } = await global.keyRotator.executeWithRotation([], prompt, [], systemInstruction, true);
                const aiAnalysis = aiRes.response.text().trim();

                const visualReport = `🛸 *RELATÓRIO SUPREMO: CAÇADOR DE IAs SOTA* 🥀\n` +
                                     `*───────────────────────────────*\n` +
                                     `🔍 *Busca:* \`${query || "Estado-da-Arte (Geral)"}\`\n` +
                                     `📡 *Motor de Busca:* \`${searchUsed}\`\n` +
                                     `*───────────────────────────────*\n\n` +
                                     `${aiAnalysis}\n\n` +
                                     `> *BOCHECHA DEEP MINING SYSTEM v1.0* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: visualReport }, { quoted: message });
                }
                return visualReport;

            } catch (aiErr) {
                console.error('[ERRO] github_ai_hunter AI generation failed:', aiErr);
            }
        }

        // Fallback textual limpo e estilizado
        let fallbackVisual = `🛸 *RELATÓRIO DE IAs SOTA (FALLBACK NEURAL)* 🥀\n` +
                             `*───────────────────────────────*\n` +
                             `🔍 *Busca:* \`${query || "Geral/SOTA"}\`\n` +
                             `📡 *Motor:* \`${searchUsed}\`\n` +
                             `*───────────────────────────────*\n\n`;

        results.forEach((r, idx) => {
            fallbackVisual += `🤖 *[${idx+1}] ${r.name}* (${r.stars} Stars)\n` +
                              `  ↳ *Autor:* ${r.owner}\n` +
                              `  ↳ *Visão:* ${r.description}\n` +
                              `  ↳ *Link:* ${r.url}\n\n`;
        });

        fallbackVisual += `*(Instale/ative as chaves da API para ter a análise neural automatizada dos projetos)*\n\n` +
                          `> *BOCHECHA DEEP MINING SYSTEM v1.0* 💀⚡`;

        if (isCommand) {
            await sock.sendMessage(from, { text: fallbackVisual }, { quoted: message });
        }
        return fallbackVisual;
    }
};
