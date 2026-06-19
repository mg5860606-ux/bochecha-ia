const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Caminho do settings.json
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

// Mapeamento de apelidos para IDs de modelos do OpenRouter
const MODEL_ALIASES = {
    // Gemini models
    'gemini': 'google/gemini-2.5-flash-lite',
    'gemini-lite': 'google/gemini-2.5-flash-lite',
    'gemini-flash': 'google/gemini-2.5-flash',
    'gemini25': 'google/gemini-2.5-flash',
    'gemini-pro': 'google/gemini-2.5-pro-preview',
    'gemini25-pro': 'google/gemini-2.5-pro-preview',

    // Auto (roteamento automático do OpenRouter)
    'auto': 'openrouter/free',
    'free': 'openrouter/free'
};

// Nomes amigáveis para exibição
const FRIENDLY_NAMES = {
    'google/gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite ♂ (Extremamente Rápido)',
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash ♂ (Excelente Multimodal & Tools)',
    'google/gemini-2.5-pro-preview': 'Gemini 2.5 Pro ♂ (Raciocínio Altamente Complexo)',
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
                        `Modelos ativos e confirmados ✔️\n\n` +
                        `♊ *[1] Gemini 2.5 Flash Lite*\n` +
                        `  ↳ Apelido: *gemini-lite* ou *gemini*\n` +
                        `  ↳ Especialidade: Extremamente rápido, ideal para respostas instantâneas.\n\n` +
                        `♊ *[2] Gemini 2.5 Flash*\n` +
                        `  ↳ Apelido: *gemini-flash* ou *gemini25*\n` +
                        `  ↳ Especialidade: Multimodal, suporte a tools e conversação fluida.\n\n` +
                        `♊ *[3] Gemini 2.5 Pro*\n` +
                        `  ↳ Apelido: *gemini-pro* ou *gemini25-pro*\n` +
                        `  ↳ Especialidade: Raciocínio complexo de alto nível.\n\n` +
                        `🔄 *[4] OpenRouter Auto*\n` +
                        `  ↳ Apelido: *auto* ou *free*\n` +
                        `  ↳ Especialidade: Roteamento inteligente baseado no tipo de prompt.\n\n` +
                        `*───────────────────────────────*\n` +
                        `🔮 *Cérebro Principal Ativo:*\n` +
                        `👉 *${friendlyActive}*\n` +
                        `*───────────────────────────────*\n\n` +
                        `⚠️ *Como alterar o cérebro:* (Apenas Criador Marcos)\n` +
                        `Digite: */setia [apelido]*\n` +
                        `Exemplo: */setia gemini-pro* ou */setia gemini-flash*\n\n` +
                        `> *BOCHECHA AGENTIC ENGINE v5.0 — 100% GEMINI* 🥀🛸💀`;

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
                // Aceita ID cru se for um dos modelos integrados/permitidos ou grátis/preview
                const validRawIds = Object.values(MODEL_ALIASES);
                if (validRawIds.includes(modelInput) || modelInput.endsWith(':free') || modelInput.includes('-preview') || modelInput === 'openrouter/free') {
                    selectedModelId = modelInput;
                } else {
                    const paidMsg = `❌ *Modelos pagos não são permitidos!* Use apenas os modelos listados ou gratuitos.\nDigite */ias* para ver os disponíveis.`;
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
