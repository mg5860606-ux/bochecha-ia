const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Caminho do settings.json
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

// Mapeamento de apelidos para IDs gratuitos do OpenRouter
const MODEL_ALIASES = {
    // Llama 3.3 70B
    'llama': 'meta-llama/llama-3.3-70b-instruct:free',
    'llama3': 'meta-llama/llama-3.3-70b-instruct:free',

    // Gemma 4 31B
    'gemma': 'google/gemma-4-31b-it:free',
    'gemma4': 'google/gemma-4-31b-it:free',

    // Hermes 3 Llama 3.1 405B
    'hermes': 'nousresearch/hermes-3-llama-3.1-405b:free',
    'hermes405': 'nousresearch/hermes-3-llama-3.1-405b:free',

    // GPT-OSS 120B
    'gpt': 'openai/gpt-oss-120b:free',
    'gpt-oss': 'openai/gpt-oss-120b:free',

    // Qwen 3 Coder
    'coder': 'qwen/qwen3-coder:free',
    'qwen3-coder': 'qwen/qwen3-coder:free',

    // Poolside Laguna
    'poolside': 'poolside/laguna-m.1:free',
    'laguna': 'poolside/laguna-m.1:free',

    // Nemotron Nano VL
    'nemotron': 'nvidia/nemotron-nano-12b-v2-vl:free',
    'vision': 'nvidia/nemotron-nano-12b-v2-vl:free',

    // Llama 3.2 3B
    'llama32': 'meta-llama/llama-3.2-3b-instruct:free',
    'fast': 'meta-llama/llama-3.2-3b-instruct:free',

    // Auto (roteamento automático do OpenRouter)
    'auto': 'openrouter/free',
    'free': 'openrouter/free'
};

// Nomes amigáveis para exibição
const FRIENDLY_NAMES = {
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B 🦙 (Fluido & Humano)',
    'google/gemma-4-31b-it:free': 'Gemma 4 31B 🌟 (Modelo Google SOTA)',
    'nousresearch/hermes-3-llama-3.1-405b:free': 'Hermes 3 405B 🧠 (Raciocínio & Conhecimento Gigante)',
    'openai/gpt-oss-120b:free': 'GPT-OSS 120B 🤖 (Open Source da OpenAI)',
    'qwen/qwen3-coder:free': 'Qwen 3 Coder 💻 (Novo Especialista em Código)',
    'poolside/laguna-m.1:free': 'Poolside Laguna 🏊 (Tools & Agentes)',
    'nvidia/nemotron-nano-12b-v2-vl:free': 'Nemotron Nano VL 👁️ (Visão & Imagens)',
    'meta-llama/llama-3.2-3b-instruct:free': 'Llama 3.2 3B ⚡ (Super Rápido)',
    'openrouter/free': 'OpenRouter Auto 🔄 (Roteamento Automático)'
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
                        description: "Apelido do modelo a ser definido (ex: 'r1', 'gemini', 'llama', 'coder', 'gpt'). Apenas para a ação 'alterar'."
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
        let settings = { isPublic: true, owners: [], primaryModel: "openrouter/free" };
        try {
            if (fs.existsSync(SETTINGS_PATH)) {
                settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
            }
        } catch (e) {
            console.error('[ERRO] gerenciar_ias: falha ao carregar settings.json', e.message);
        }

        const activeModelId = settings.primaryModel || "openrouter/free";
        const friendlyActive = FRIENDLY_NAMES[activeModelId] || activeModelId;

        // ═════════════════════════════════════════════════════════════════════
        // LISTAR CÉREBROS (/ias)
        // ═════════════════════════════════════════════════════════════════════
        if (!isCommand && args.acao === "listar" || (isCommand && args.command === "/ias")) {

            let panel = `╔═══════════════════════════════╗\n` +
                        `   🌌 *CÉREBROS NEURAIS DO BOCHECHA* 🌌\n` +
                        `╚═══════════════════════════════╝\n\n` +
                        `Todos os modelos abaixo são *100% GRATUITOS* via OpenRouter 🆓\n\n` +
                        `🧠 *[1] DeepSeek-R1*\n` +
                        `  ↳ Apelido: *r1* ou *deepseek*\n` +
                        `  ↳ Especialidade: Raciocínio profundo, matemática e lógica extrema.\n\n` +
                        `⚡ *[2] DeepSeek V4 Flash*\n` +
                        `  ↳ Apelido: *flash* ou *v4*\n` +
                        `  ↳ Especialidade: Velocidade + qualidade, ótimo para conversação.\n\n` +
                        `🌟 *[3] Gemini 2.5 Flash*\n` +
                        `  ↳ Apelido: *gemini* ou *gemini-flash*\n` +
                        `  ↳ Especialidade: Multimodal, rápido, suporte a imagens.\n\n` +
                        `💎 *[4] Gemini 2.5 Pro*\n` +
                        `  ↳ Apelido: *gemini-pro* ou *pro*\n` +
                        `  ↳ Especialidade: Análise de contexto gigante (2M tokens).\n\n` +
                        `🤖 *[5] GPT-OSS 120B*\n` +
                        `  ↳ Apelido: *gpt* ou *gpt-oss*\n` +
                        `  ↳ Especialidade: Open Source da OpenAI, tools avançadas.\n\n` +
                        `🏊 *[6] Poolside Laguna*\n` +
                        `  ↳ Apelido: *poolside* ou *laguna*\n` +
                        `  ↳ Especialidade: Agentes e function calling.\n\n` +
                        `🦙 *[7] Llama 3.3 70B*\n` +
                        `  ↳ Apelido: *llama*\n` +
                        `  ↳ Especialidade: Papo fluido, linguagem natural e gírias.\n\n` +
                        `🔮 *[8] Qwen 2.5 72B*\n` +
                        `  ↳ Apelido: *qwen*\n` +
                        `  ↳ Especialidade: Alta qualidade geral, multilíngue.\n\n` +
                        `💻 *[9] Qwen 2.5 Coder*\n` +
                        `  ↳ Apelido: *coder* ou *qwen-coder*\n` +
                        `  ↳ Especialidade: Escrita de código e automações.\n\n` +
                        `🔄 *[10] OpenRouter Auto*\n` +
                        `  ↳ Apelido: *auto* ou *free*\n` +
                        `  ↳ Especialidade: Roteamento automático pelo melhor disponível.\n\n` +
                        `*───────────────────────────────*\n` +
                        `🔮 *Cérebro Principal Ativo:*\n` +
                        `👉 *${friendlyActive}*\n` +
                        `*───────────────────────────────*\n\n` +
                        `⚠️ *Como alterar o cérebro:* (Apenas Criador Marcos)\n` +
                        `Digite: */setia [apelido]*\n` +
                        `Exemplo: */setia r1* ou */setia gemini*\n\n` +
                        `> *BOCHECHA AGENTIC ENGINE v4.2 — 100% FREE* 🛸🥀💀`;

            if (isCommand) {
                await sock.sendMessage(from, { text: panel }, { quoted: message });
                return;
            } else {
                return panel;
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // ALTERAR CÉREBRO ATIVO (/setia)
        // ═════════════════════════════════════════════════════════════════════
        if ((!isCommand && args.acao === "alterar") || (isCommand && args.command === "/setia")) {

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
                const helperMsg = `⚠️ *Uso incorreto:* Por favor informe qual cérebro deseja ativar!\nExemplo: */setia r1* ou */setia gemini*\n\nDigite */ias* para ver a lista de apelidos disponíveis.`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: helperMsg }, { quoted: message });
                    return;
                } else {
                    return helperMsg;
                }
            }

            let selectedModelId = MODEL_ALIASES[modelInput];
            if (!selectedModelId && modelInput.includes('/')) {
                // Aceita ID cru, mas apenas se for gratuito
                if (modelInput.endsWith(':free') || modelInput === 'openrouter/free') {
                    selectedModelId = modelInput;
                } else {
                    const paidMsg = `❌ *Modelos pagos não são permitidos!* Use apenas modelos gratuitos (terminam em *:free*).\nDigite */ias* para ver os disponíveis.`;
                    if (isCommand) {
                        await sock.sendMessage(from, { text: paidMsg }, { quoted: message });
                        return;
                    } else {
                        return paidMsg;
                    }
                }
            }

            if (!selectedModelId) {
                const notFoundMsg = `❌ *Cérebro Neural não identificado:* '${modelInput}' não consta na nossa lista. Digite */ias* para ver os nomes válidos.`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: notFoundMsg }, { quoted: message });
                    return;
                } else {
                    return notFoundMsg;
                }
            }

            settings.primaryModel = selectedModelId;
            try {
                fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));

                if (global.keyRotator) {
                    console.log(chalk.cyan(`[KeyRotationEngine] Cérebro Primário reconfigurado para: ${selectedModelId}`));
                }

                const friendlyNew = FRIENDLY_NAMES[selectedModelId] || selectedModelId;
                const successMsg = `🔮 *ATUALIZAÇÃO SINÁPTICA EXECUTADA COM SUCESSO!* 🔮\n\n` +
                                   `Reconfigurei os meus neurônios do submundo! Transição de cérebro completa:\n\n` +
                                   `⚡ *Novo Motor Principal:*\n` +
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
    },
    MODEL_ALIASES,
    FRIENDLY_NAMES
};
