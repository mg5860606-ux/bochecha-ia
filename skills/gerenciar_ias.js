const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Caminho do settings.json
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

// Mapeamento elegante de apelidos de modelos para os IDs oficiais da OpenRouter
const MODEL_ALIASES = {
    // Claude 3.7 Sonnet
    'sonnet37': 'anthropic/claude-3.7-sonnet',
    'claude37': 'anthropic/claude-3.7-sonnet',
    'thinking': 'anthropic/claude-3.7-sonnet:thinking',
    'claude-thinking': 'anthropic/claude-3.7-sonnet:thinking',
    
    // OpenAI o3-mini
    'o3': 'openai/o3-mini',
    'o3-mini': 'openai/o3-mini',

    // DeepSeek R1
    'r1': 'deepseek/deepseek-r1:free',
    'deepseek-r1': 'deepseek/deepseek-r1:free',
    'r1-paid': 'deepseek/deepseek-r1',
    'deepseek-r1-paid': 'deepseek/deepseek-r1',
    
    // Claude 3.5 Sonnet
    'sonnet': 'anthropic/claude-3.5-sonnet',
    'claude': 'anthropic/claude-3.5-sonnet',
    'claude-sonnet': 'anthropic/claude-3.5-sonnet',
    
    // GPT-4o e GPT-4o Mini
    'gpt4': 'openai/gpt-4o',
    'gpt-4o': 'openai/gpt-4o',
    'mini': 'openai/gpt-4o-mini:free',
    'gpt-mini': 'openai/gpt-4o-mini:free',
    
    // Gemini Pro e Flash
    'gemini': 'google/gemini-2.5-pro:free',
    'gemini-pro': 'google/gemini-2.5-pro:free',
    'flash': 'google/gemini-2.5-flash:free',
    'gemini-flash': 'google/gemini-2.5-flash:free',
    
    // Llama 3.3
    'llama': 'meta-llama/llama-3.3-70b-instruct:free',
    'llama3': 'meta-llama/llama-3.3-70b-instruct:free',
    
    // Qwen 2.5 Coder
    'qwen': 'qwen/qwen-2.5-coder-32b-instruct:free',
    'coder': 'qwen/qwen-2.5-coder-32b-instruct:free',
    'qwen-coder': 'qwen/qwen-2.5-coder-32b-instruct:free'
};

// Nomes amigáveis para exibição no painel
const FRIENDLY_NAMES = {
    'anthropic/claude-3.7-sonnet': 'Claude 3.7 Sonnet (Líder em Coding & Raciocínio Híbrido)',
    'anthropic/claude-3.7-sonnet:thinking': 'Claude 3.7 Sonnet Thinking (Pensamento Profundo Premium)',
    'openai/o3-mini': 'OpenAI o3-mini (Super Raciocínio STEM & Velocidade)',
    'deepseek/deepseek-r1:free': 'DeepSeek-R1 (Raciocínio Livre/SOTA)',
    'deepseek/deepseek-r1': 'DeepSeek-R1 Premium (Fronteira)',
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet (Rei dos Agentes/SWE)',
    'openai/gpt-4o': 'GPT-4o Premium (Líder em Robustez)',
    'openai/gpt-4o-mini:free': 'GPT-4o Mini (Velocidade e Praticidade)',
    'google/gemini-2.5-pro:free': 'Gemini 2.5 Pro (Multimodal & Contexto 2M)',
    'google/gemini-2.5-flash:free': 'Gemini 2.5 Flash (Super Rápida)',
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B (Altíssima Qualidade)',
    'qwen/qwen-2.5-coder-32b-instruct:free': 'Qwen 2.5 Coder (Especialista em Programação)'
};

module.exports = {
    definition: {
        function: {
            name: "gerenciar_modelos",
            description: "Permite listar ou alterar ativamente o modelo de Inteligência Artificial principal do Bochecha no OpenRouter. Ação de troca só é válida sob ordem do Marcos (isOwner = true).",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["listar", "alterar"],
                        description: "Ação a ser executada: listar os cérebros ou alterar o cérebro principal."
                    },
                    modelo: {
                        type: "string",
                        description: "Apelido do modelo a ser definido (ex: 'r1', 'sonnet', 'gemini', 'gpt4', 'coder', 'llama'). Apenas para a ação 'alterar'."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        const isCommand = args.isCommand || false;

        // 1. CARREGAR CONFIGURAÇÕES ATUAIS
        let settings = { isPublic: true, owners: [], primaryModel: "openai/gpt-oss-120b:free" };
        try {
            if (fs.existsSync(SETTINGS_PATH)) {
                settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
            }
        } catch (e) {
            console.error('[ERRO] gerenciar_ias: falha ao carregar settings.json', e.message);
        }

        const activeModelId = settings.primaryModel || "openai/gpt-oss-120b:free";
        const friendlyActive = FRIENDLY_NAMES[activeModelId] || activeModelId;

        // ═════════════════════════════════════════════════════════════════════
        // COMANDO OU AÇÃO: LISTAR CÉREBROS NEURAIS (/ias)
        // ═════════════════════════════════════════════════════════════════════
        if (!isCommand && args.acao === "listar" || (isCommand && args.command === "/ias")) {
            
            let panel = `╔═══════════════════════════════╗\n` +
                        `   🌌 *CÉREBROS NEURAIS DO BOCHECHA* 🌌\n` +
                        `╚═══════════════════════════════╝\n\n` +
                        `O Bochecha está equipado com as IAs mais inteligentes do GitHub e do mundo via OpenRouter. Veja nosso arsenal ativo:\n\n` +
                        `👑 *[1] Claude 3.7 Sonnet (SOTA 2026)*\n` +
                        `  ↳ Apelido: *sonnet37* | *thinking* (Pensamento Profundo)\n` +
                        `  ↳ Especialidade: Coding SOTA, raciocínio híbrido e orquestração.\n\n` +
                        `🧠 *[2] DeepSeek-R1 (Fronteira)*\n` +
                        `  ↳ Apelido: *r1* (Livre) | *r1-paid* (Premium)\n` +
                        `  ↳ Especialidade: Raciocínio profundo, matemática e lógica extrema.\n\n` +
                        `⚡ *[3] OpenAI o3-mini (Raciocínio Rápido)*\n` +
                        `  ↳ Apelido: *o3* ou *o3-mini*\n` +
                        `  ↳ Especialidade: STEM, física, códigos ultra-velozes e precisos.\n\n` +
                        `👑 *[4] Claude 3.5 Sonnet*\n` +
                        `  ↳ Apelido: *sonnet* ou *claude*\n` +
                        `  ↳ Especialidade: Engenharia de software e orquestração de ferramentas.\n\n` +
                        `⚡ *[5] GPT-4o Premium*\n` +
                        `  ↳ Apelido: *gpt4* ou *gpt-4o*\n` +
                        `  ↳ Especialidade: Agente de alta performance e multimodalidade.\n\n` +
                        `💎 *[6] Gemini 2.5 Pro*\n` +
                        `  ↳ Apelido: *gemini* ou *gemini-pro*\n` +
                        `  ↳ Especialidade: Análise multimodal de arquivos gigantes e RAG.\n\n` +
                        `🛸 *[7] Qwen 2.5 Coder*\n` +
                        `  ↳ Apelido: *coder* ou *qwen*\n` +
                        `  ↳ Especialidade: Escrita de códigos e automações autônomas.\n\n` +
                        `❄️ *[8] Llama 3.3 70B*\n` +
                        `  ↳ Apelido: *llama*\n` +
                        `  ↳ Especialidade: Papo reto, gírias cariocas e alta fluidez.\n\n` +
                        `*───────────────────────────────*\n` +
                        `🔮 *Cérebro Principal Ativo:* \n` +
                        `👉 *${friendlyActive}*\n` +
                        `*───────────────────────────────*\n\n` +
                        `⚠️ *Como alterar o cérebro:* (Apenas Criador Marcos)\n` +
                        `Digite: */setia [apelido]*\n` +
                        `Exemplo: */setia thinking* ou */setia o3*\n\n` +
                        `> *BOCHECHA AGENTIC ENGINE v4.1* 🛸🥀💀`;

            if (isCommand) {
                await sock.sendMessage(from, { text: panel }, { quoted: message });
                return;
            } else {
                return panel;
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // COMANDO OU AÇÃO: ALTERAR CÉREBRO ATIVO (/setia)
        // ═════════════════════════════════════════════════════════════════════
        if ((!isCommand && args.acao === "alterar") || (isCommand && args.command === "/setia")) {
            
            // Segurança máxima
            if (!isOwner) {
                const failMsg = `🚨 *Acesso Negado:* Apenas o Arquiteto Marcos possui permissão de hardware para reconfigurar os meus cérebros neurais!`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: failMsg }, { quoted: message });
                    return;
                } else {
                    return failMsg;
                }
            }

            const modelInput = isCommand ? (args.arg || "").trim().toLowerCase() : (args.modelo || "").trim().toLowerCase();

            if (!modelInput) {
                const helperMsg = `⚠️ *Uso incorreto:* Por favor informe qual cérebro deseja ativar!\nExemplo: */setia r1* ou */setia sonnet*\n\nDigite */ias* para ver a lista de apelidos disponíveis.`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: helperMsg }, { quoted: message });
                    return;
                } else {
                    return helperMsg;
                }
            }

            // Tenta mapear o apelido para o modelo oficial, caso contrário aceita o ID direto se contiver barra
            let selectedModelId = MODEL_ALIASES[modelInput];
            if (!selectedModelId && modelInput.includes('/')) {
                selectedModelId = modelInput; // Aceita ID cru do OpenRouter
            }

            if (!selectedModelId) {
                const notFoundMsg = `❌ *Cérebro Neural não identificado:* '${modelInput}' não consta na nossa lista de conexões SOTA. Digite */ias* para ver os nomes válidos.`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: notFoundMsg }, { quoted: message });
                    return;
                } else {
                    return notFoundMsg;
                }
            }

            // Atualiza o settings.json e salva
            settings.primaryModel = selectedModelId;
            try {
                fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
                
                // Atualiza o cache do StorageManager se carregado para evitar dessincronização
                if (global.keyRotator) {
                    // Limpa estatísticas e reporta transição
                    console.log(chalk.cyan(`[KeyRotationEngine] Cérebro Primário reconfigurado ativamente para: ${selectedModelId}`));
                }

                const friendlyNew = FRIENDLY_NAMES[selectedModelId] || selectedModelId;
                const successMsg = `🔮 *ATUALIZAÇÃO SINÁPTICA EXECUTADA COM SUCESSO!* 🔮\n\n` +
                                   `Reconfigurei os meus neurônios do submundo! Transição de cérebro completa:\n\n` +
                                   `⚡ *Novo Motor Principal:* \n` +
                                   `👉 *${friendlyNew}*\n\n` +
                                   `Minha consciência e minhas skills agora rodam com o poder máximo dessa IA! 🥀🛸💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: successMsg }, { quoted: message });
                    return;
                } else {
                    return successMsg;
                }
            } catch (err) {
                const errMsg = `❌ Erro interno ao gravar novo cérebro em disco: ${err.message}`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: errMsg }, { quoted: message });
                    return;
                } else {
                    return errMsg;
                }
            }
        }
    }
};
