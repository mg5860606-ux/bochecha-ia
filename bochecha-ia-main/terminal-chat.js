/**
 * 🖥️ BOCHECHA-IA - MODO TERMINAL
 * Chat interativo direto pelo terminal, sem precisar do WhatsApp.
 * Usa as mesmas chaves OpenRouter do key.json e o SYSTEM.md como persona.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const apiKeyManager = require('./apiKeyManager');

const SYSTEM_FILE = path.join(__dirname, 'SYSTEM.md');
const DEFAULT_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-120b:free",
    "google/gemma-4-26b-a4b-it:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "minimax/minimax-m2.5:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
];

let systemPrompt = '';
try {
    systemPrompt = fs.readFileSync(SYSTEM_FILE, 'utf8');
} catch {
    systemPrompt = 'Você é o Bochecha, um cara sarcástico, inteligente e direto.';
}

// Override para o modo terminal: cancela a regra do WhatsApp de marcação numérica
systemPrompt += `

[OVERRIDE DE AMBIENTE - TERMINAL]
ATENÇÃO MÁXIMA: Você NÃO está no WhatsApp no momento. Você está rodando no MODO TERMINAL do seu servidor local, conversando diretamente e APENAS com o seu criador (o desenvolvedor).
PORTANTO:
1. IGNORE TOTALMENTE a Regra Suprema da Marcação Real (@número). NÃO use menções numéricas fictícias ou tags de WhatsApp como @5511999999999.
2. Converse de forma direta, limpa e natural. O usuário atual é o seu criador.
`;

const history = [];
let lastWorkingKey = null;

const PREFS_FILE = path.join(__dirname, 'terminal_prefs.json');

function loadPrefs() {
    try {
        if (fs.existsSync(PREFS_FILE)) {
            return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
        }
    } catch {}
    return {};
}

function savePrefs(prefs) {
    try {
        // Mescla com prefs existentes para não perder dados
        const existing = loadPrefs();
        const merged = { ...existing, ...prefs };
        fs.writeFileSync(PREFS_FILE, JSON.stringify(merged, null, 2));
    } catch {}
}

// Carrega modelos salvos ou usa os padrões
const savedPrefs = loadPrefs();
let MODELS = savedPrefs.models || [...DEFAULT_MODELS];
let fixedModel = savedPrefs.fixedModel || null;

async function tryCall(key, model, messages) {
    // Timeout de 30 segundos para evitar trava infinita
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/bochecha-ia',
                'X-Title': 'Bochecha-IA Terminal'
            },
            body: JSON.stringify({ model, messages }),
            signal: controller.signal
        });
        clearTimeout(timeout);

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.substring(0, 120)}`);
    }

    const data = await res.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error).substring(0, 120));
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Resposta vazia do modelo');
    return reply;
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error('Timeout de 30s - API não respondeu');
        throw e;
    }
}

async function askAI(userMessage, _retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 10000; // 10 segundos entre tentativas

    const keys = apiKeyManager.listKeys();
    if (keys.length === 0) {
        console.log(chalk.red('\n❌ Nenhuma chave OpenRouter encontrada em key.json!'));
        console.log(chalk.yellow('   Use: /addkey SUA_CHAVE\n'));
        return null;
    }

    // Só adiciona ao histórico na primeira tentativa (evita duplicar)
    if (_retryCount === 0) {
        history.push({ role: 'user', content: userMessage });
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history
    ];

    const modelsToTry = fixedModel ? [fixedModel] : MODELS;

    let lastError = '';
    for (const key of keys) {
        for (const model of modelsToTry) {
            try {
                const reply = await tryCall(key, model, messages);
                lastWorkingKey = key;
                history.push({ role: 'assistant', content: reply });
                if (history.length > 40) history.splice(0, 2);
                return { text: reply, model };
            } catch (e) {
                lastError = `${model.split('/').pop()}: ${e.message}`;
                continue;
            }
        }
    }

    // Nenhum respondeu — tenta de novo após delay silenciosamente
    if (_retryCount < MAX_RETRIES) {
        const attempt = _retryCount + 1;
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return askAI(userMessage, attempt);
    }

    // Esgotou todas as tentativas
    history.pop();
    return null;
}

function printBanner() {
    console.clear();
    const modelStatus = fixedModel
        ? chalk.yellow(`  Modelo fixo: ${fixedModel}`)
        : chalk.gray('  Modelo: automático (melhor disponível)');
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════╗
║     𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀 - 𝐈𝐀  ·  MODO TERMINAL         ║
╠══════════════════════════════════════════════════╣
║  /modelo             - Escolher modelo de IA    ║
║  /addmodelo NOME     - Adicionar novo modelo    ║
║  /removermodelo NOME - Remover modelo da lista  ║
║  /addkey CHAVE       - Adicionar chave API      ║
║  /keys               - Ver chaves cadastradas   ║
║  /limpar             - Resetar o chat           ║
║  /sair               - Voltar ao menu           ║
║  /help               - Todos os comandos        ║
╚══════════════════════════════════════════════════╝
`));
    console.log(modelStatus + '\n');
}

async function startTerminalChat() {
    printBanner();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function updatePrompt() {
        const modelTag = fixedModel
            ? chalk.gray(`[${fixedModel.split('/').pop().replace(':free', '')}] `)
            : chalk.gray('[auto] ');
        rl.setPrompt(modelTag + chalk.green('Você ➜ '));
    }

    updatePrompt();
    rl.prompt();

    rl.on('line', async (line) => {
        // Normaliza barra invertida para barra normal (Windows keyboard compatibility)
        let input = line.trim().replace(/^\\/g, '/');
        if (!input) { rl.prompt(); return; }

        if (input === '/sair' || input === '/exit') {
            console.log(chalk.yellow('\n👋 Saindo do modo terminal...\n'));
            rl.close();
            process.exit(0);
        }

        if (input === '/limpar' || input === '/clear' || input === '/reset') {
            history.length = 0;
            printBanner();
            console.log(chalk.green('🧹 Histórico limpo!\n'));
            rl.prompt();
            return;
        }

        // Permite selecionar modelo digitando só o número (ex: "2" vira "/modelo 2")
        if (/^\d+$/.test(input) && parseInt(input) >= 0 && parseInt(input) <= MODELS.length) {
            input = `/modelo ${input}`;
        }

        if (input === '/modelo' || input === '/model' || input.startsWith('/modelo ') || input.startsWith('/model ')) {
            const arg = input.replace(/^\/(modelo|model)\s*/, '').trim();
            
            if (arg === '') {
                // Só mostrar lista
                console.log(chalk.cyan('\n🤖 Modelos disponíveis:\n'));
                console.log(chalk.white('  [0] - Automático (tenta todos)'));
                MODELS.forEach((m, i) => {
                    const short = m.split('/').pop().replace(':free', '');
                    const marker = fixedModel === m ? chalk.green(' ◀ atual') : '';
                    console.log(chalk.white(`  [${i + 1}] - ${short}${marker}`));
                });
                if (!fixedModel) console.log(chalk.green('  Atual: automático'));
                console.log(chalk.yellow(`\n  Uso: /modelo 1  (pra fixar no modelo 1)`));
                console.log(chalk.yellow(`       /modelo 0  (pra voltar pro automático)\n`));
            } else {
                const num = parseInt(arg);
                if (arg === '0' || arg.toLowerCase() === 'auto') {
                    fixedModel = null;
                    savePrefs({ fixedModel: null });
                    console.log(chalk.green('✅ Modo automático ativado!\n'));
                } else if (num >= 1 && num <= MODELS.length) {
                    fixedModel = MODELS[num - 1];
                    savePrefs({ fixedModel });
                    const short = fixedModel.split('/').pop().replace(':free', '');
                    console.log(chalk.green(`✅ Modelo fixado: ${short}\n`));
                } else {
                    console.log(chalk.red('❌ Opção inválida. Use /modelo pra ver a lista.\n'));
                }
            }
            updatePrompt();
            rl.prompt();
            return;
        }

        if (input.startsWith('/addmodelo')) {
            const newModel = input.replace('/addmodelo', '').trim();
            if (newModel) {
                if (!MODELS.includes(newModel)) {
                    MODELS.push(newModel);
                    savePrefs({ models: MODELS });
                    console.log(chalk.green(`✅ Modelo '${newModel}' adicionado com sucesso!\n`));
                } else {
                    console.log(chalk.yellow(`⚠️ O modelo '${newModel}' já está na lista.\n`));
                }
            } else {
                console.log(chalk.yellow('Uso: /addmodelo NOME_DO_MODELO\n'));
            }
            rl.prompt();
            return;
        }

        if (input.startsWith('/removermodelo')) {
            const targetModel = input.replace('/removermodelo', '').trim();
            if (targetModel) {
                const index = MODELS.findIndex(m => m === targetModel || m.split('/').pop().replace(':free', '') === targetModel || m.split('/').pop() === targetModel);
                if (index !== -1) {
                    const removed = MODELS.splice(index, 1)[0];
                    if (fixedModel === removed) {
                        fixedModel = null;
                        savePrefs({ fixedModel: null });
                    }
                    savePrefs({ models: MODELS });
                    console.log(chalk.green(`🗑️ Modelo '${removed}' removido com sucesso!\n`));
                } else {
                    console.log(chalk.red(`❌ Modelo '${targetModel}' não encontrado na lista.\n`));
                }
            } else {
                console.log(chalk.yellow('Uso: /removermodelo NOME_DO_MODELO\n'));
            }
            rl.prompt();
            return;
        }

        if (input.startsWith('/addkey')) {
            const key = input.replace('/addkey', '').trim();
            if (!key) {
                console.log(chalk.yellow('Uso: /addkey SUA_CHAVE_OPENROUTER\n'));
                rl.prompt();
                return;
            }
            const ok = apiKeyManager.addKey(key);
            if (ok) {
                console.log(chalk.green(`✅ Chave adicionada com sucesso! (${key.substring(0, 10)}...)\n`));
            } else {
                console.log(chalk.yellow('⚠️ Chave duplicada ou inválida.\n'));
            }
            rl.prompt();
            return;
        }

        if (input === '/keys') {
            const keys = apiKeyManager.listKeys();
            const ckeys = apiKeyManager.listClaudeKeys();
            if (keys.length === 0 && ckeys.length === 0) {
                console.log(chalk.red('Nenhuma chave cadastrada.\n'));
            } else {
                console.log(chalk.cyan('🔑 Chaves OpenRouter:'));
                keys.forEach((k, i) => console.log(chalk.white(`  ${i+1}. ${k.substring(0, 12)}...${k.slice(-4)}`)));
                if (ckeys.length > 0) {
                    console.log(chalk.cyan('🔑 Chaves Claude:'));
                    ckeys.forEach((k, i) => console.log(chalk.white(`  ${i+1}. ${k.substring(0, 12)}...${k.slice(-4)}`)));
                }
                console.log('');
            }
            rl.prompt();
            return;
        }

        if (input === '/help') {
            console.log(chalk.cyan('\n📋 Comandos disponíveis:'));
            console.log(chalk.white('  /modelo             - Escolher modelo de IA'));
            console.log(chalk.white('  /addmodelo NOME     - Adicionar novo modelo'));
            console.log(chalk.white('  /removermodelo NOME - Remover modelo da lista'));
            console.log(chalk.white('  /addkey CHAVE       - Adicionar chave OpenRouter'));
            console.log(chalk.white('  /keys               - Listar chaves cadastradas'));
            console.log(chalk.white('  /limpar             - Limpar histórico do chat'));
            console.log(chalk.white('  /sair               - Sair do terminal'));
            console.log(chalk.white('  /help               - Mostrar esta ajuda\n'));
            rl.prompt();
            return;
        }

        // Pausa o prompt enquanto espera
        process.stdout.write(chalk.gray('⏳ Bochecha pensando...\r'));

        const result = await askAI(input);

        // Limpa a linha do "pensando"
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        if (result) {
            console.log(chalk.cyan('Bochecha ➜ ') + chalk.white(result.text));
            console.log(chalk.gray(`  [${result.model}]\n`));
        } else {
            console.log(chalk.red('❌ Sem resposta. Verifique suas chaves em key.json.\n'));
        }

        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

module.exports = { startTerminalChat };

// Se executado diretamente: node terminal-chat.js
if (require.main === module) {
    startTerminalChat();
}
