const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs"), util = require("util"), chalk = require("chalk"), path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require("child_process");
let setting = require("./key.json");
const apiKeyManager = require("./apiKeyManager");
let currentApiKey = apiKeyManager.getKey() || (setting.keys && setting.keys[0]) || "placeholder";

const AVAILABLE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-3.1-pro-preview",
    "gemini-pro"
];

async function executeGeminiWithRotation(history, messageOrParts, tools, systemInstruction) {
    let keyAttempts = 0;
    const numKeys = apiKeyManager.listKeys().length;
    const maxKeyAttempts = numKeys > 0 ? numKeys : 1;

    while (keyAttempts <= maxKeyAttempts) {
        for (const modelName of AVAILABLE_MODELS) {
            try {
                const genAI = new GoogleGenerativeAI(currentApiKey);
                const modelConfig = { model: modelName };
                if (systemInstruction) modelConfig.systemInstruction = systemInstruction;
                if (tools && tools.length > 0) modelConfig.tools = [{ functionDeclarations: tools }];

                const model = genAI.getGenerativeModel(modelConfig);
                const chat = model.startChat({ history });
                const response = await chat.sendMessage(messageOrParts);
                return { chat, response };
            } catch (e) {
                const msg = String(e.message || e);

                // Se o modelo não existir ou a cota desse modelo específico estourou (429)
                // Tentamos o próximo modelo da lista na MESMA chave
                if (msg.includes('404') || msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
                    console.log(chalk.yellow(`[AVISO] Modelo ${modelName} indisponível ou sem cota. Tentando próximo...`));
                    continue;
                }

                console.error(chalk.bgRed.white("[DEBUG GEMINI ERROR]"), msg);

                // Se for erro de chave inválida, aí sim trocamos de chave
                if (msg.includes('401') || msg.includes('API_KEY_INVALID')) {
                    break;
                } else {
                    throw e;
                }
            }
        }

        // Se nenhum modelo da lista funcionou na chave atual, rotacionamos a chave
        console.log(chalk.red(`[ROTACIONANDO] Todos os modelos falharam na chave atual. Trocando chave...`));
        currentApiKey = apiKeyManager.getKey();
        if (!currentApiKey) throw new Error("Sem chaves no sistema para rotacionar.");
        keyAttempts++;
    }
    throw new Error("Falha após rotacionar todas as chaves e modelos.");
}

function convertToolToGemini(openaiDef) {
    const fn = openaiDef.function;
    function convertType(prop) {
        const out = { ...prop };
        if (out.type) out.type = out.type.toUpperCase();
        if (out.properties) {
            for (const k in out.properties) {
                out.properties[k] = convertType(out.properties[k]);
            }
        }
        if (out.items) out.items = convertType(out.items);
        return out;
    }
    return {
        name: fn.name,
        description: fn.description,
        parameters: convertType(fn.parameters)
    };
}

// ══════════════════════════════════════════
//        ARQUITETURA MODULAR
// ══════════════════════════════════════════

// Diretórios
const MEMORY_DIR = path.join(__dirname, "memory");
const LEARNINGS_DIR = path.join(__dirname, "learnings");
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR);
if (!fs.existsSync(LEARNINGS_DIR)) fs.mkdirSync(LEARNINGS_DIR);

// Arquivos core
const SYSTEM_FILE = path.join(__dirname, "SYSTEM.md");
const AUTORIZADOS_FILE = path.join(__dirname, "autorizados.json");
const NOTAS_FILE = path.join(__dirname, "notas.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");

// Carregar settings
let settings = { isPublic: true, owners: [] };
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        settings = { ...settings, ...parsed };
    } catch (e) { }
}

let setupPin = null;
if (!settings.owners || settings.owners.length === 0) {
    setupPin = Math.floor(100000 + Math.random() * 900000).toString();
    setTimeout(() => {
        console.log(chalk.bgRed.white(`\n[⚠️ SETUP NECESSÁRIO] Nenhum dono configurado!`));
        console.log(chalk.yellow(`Envie a seguinte mensagem no WhatsApp do bot para se tornar o dono:\n`));
        console.log(chalk.green(`  /setup ${setupPin}\n`));
    }, 2000);
}

const salvarSettings = () => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

// Carregar autorizados
let autorizados = [];
if (fs.existsSync(AUTORIZADOS_FILE)) {
    autorizados = JSON.parse(fs.readFileSync(AUTORIZADOS_FILE, 'utf8'));
}
const salvarAutorizados = () => fs.writeFileSync(AUTORIZADOS_FILE, JSON.stringify(autorizados, null, 2));

// Notas/lembretes persistentes
let notas = {};
if (fs.existsSync(NOTAS_FILE)) {
    notas = JSON.parse(fs.readFileSync(NOTAS_FILE, 'utf8'));
}
const salvarNotas = () => fs.writeFileSync(NOTAS_FILE, JSON.stringify(notas, null, 2));

// Donos (Números do Marcos)
const OWNERS = ["556584770585", "176291932332072"];


const DEBOUNCE_MS = 1500;
const pendingMessages = new Map(); // chatId -> { messages: [], timer, message }

// ══════════════════════════════════════════
//  MEMÓRIA ISOLADA POR CHAT (SQLite-like em JSON)
// ══════════════════════════════════════════
const MAX_HISTORY = 100; // Manter últimas 100 mensagens para lembrar de conversas de ontem

function getMemory(chatId) {
    const safeName = chatId.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const file = path.join(MEMORY_DIR, `${safeName}.json`);
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch { return []; }
    }
    return [];
}

function saveMemory(chatId, history) {
    const safeName = chatId.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const file = path.join(MEMORY_DIR, `${safeName}.json`);
    // Auto-trim: manter só as últimas MAX_HISTORY mensagens
    if (history.length > MAX_HISTORY) {
        let cortado = history.slice(-MAX_HISTORY);
        if (cortado.length > 0 && cortado[0].role === 'assistant') {
            cortado.shift();
        }
        history = cortado;
    }
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
}


function logError(context, error) {
    const logFile = path.join(LEARNINGS_DIR, "errors.log");
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${context}: ${error?.message || error}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(chalk.red(`[ERRO] ${context}:`), error?.message || error);
}

function logEvent(event) {
    const logFile = path.join(LEARNINGS_DIR, "events.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${event}\n`);
}

// ══════════════════════════════════════════
//  CARREGADOR DE SKILLS E CHAMADA À IA
// ══════════════════════════════════════════

const SKILLS_DIR = path.join(__dirname, "skills");
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR);

const loadedSkills = {};
const groqTools = [];
const recentSentTexts = new Set();

// Carrega todas as skills na inicialização
fs.readdirSync(SKILLS_DIR).forEach(file => {
    if (file.endsWith('.js')) {
        try {
            const skill = require(path.join(SKILLS_DIR, file));
            if (skill.definition && skill.execute) {
                loadedSkills[skill.definition.function.name] = skill;
                groqTools.push(skill.definition);
                console.log(chalk.green(`[SKILL] Carregada: ${skill.definition.function.name}`));
            }
        } catch (e) {
            console.error(chalk.red(`[ERRO SKILL] Falha ao carregar ${file}:`), e.message);
        }
    }
});

async function callAI(chatId, pushname, input, isOwner, sock, from, message) {
    let history = getMemory(chatId);
    let systemPrompt = fs.readFileSync(SYSTEM_FILE, 'utf8');
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    systemPrompt += `\n\n[SISTEMA]: A data e hora atual do servidor é ${agora}.`;

    const chatNotas = notas[chatId];
    if (chatNotas && chatNotas.length > 0) {
        systemPrompt += `\n\n[Notas sobre este chat]: ${chatNotas.join(' | ')}`;
    }

    if (isOwner) {
        systemPrompt += `\n\n[SISTEMA]: Você está falando DIRETAMENTE com seu DONO (o Marcos) agora. Ele é a pessoa com quem você está conversando. Trate-o como seu mestre/patrão e use "você" para se referir a ele, pois ele é o Marcos.`;
    }

    if (history.length > MAX_HISTORY) {
        let cortado = history.slice(-MAX_HISTORY);
        if (cortado.length > 0 && cortado[0].role === 'assistant') {
            cortado.shift();
        }
        history = cortado;
    }

    // Converter history pro formato do Gemini
    const geminiHistory = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    let geminiTools = [];
    if (isOwner && groqTools.length > 0) {
        geminiTools = groqTools.map(convertToolToGemini);
    }

    let finalResponse = "";
    const promptFormatado = `[De: ${pushname}] ${input}`;

    // 📸 SUPORTE A MÍDIA (VISÃO)
    const mediaParts = [];
    const type = getContentType(message.message);
    const quotedType = message.quoted ? getContentType(message.quoted.message) : null;

    try {
        // Se a mensagem principal tiver mídia
        if (type === 'imageMessage' || type === 'videoMessage') {
            const stream = await downloadContentFromMessage(message.message[type], type === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            mediaParts.push({
                inlineData: {
                    data: buffer.toString('base64'),
                    mimeType: type === 'imageMessage' ? 'image/jpeg' : 'video/mp4'
                }
            });
        }
        // Ou se estiver respondendo a uma mensagem com mídia
        else if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
            const stream = await downloadContentFromMessage(message.quoted.message[quotedType], quotedType === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            mediaParts.push({
                inlineData: {
                    data: buffer.toString('base64'),
                    mimeType: quotedType === 'imageMessage' ? 'image/jpeg' : 'video/mp4'
                }
            });
        }

        const fullPrompt = mediaParts.length > 0 ? [promptFormatado, ...mediaParts] : promptFormatado;

        let { chat, response } = await executeGeminiWithRotation(geminiHistory, fullPrompt, geminiTools, systemPrompt);
        let result = response.response;

        const functionCalls = result.functionCalls && result.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const functionResponses = [];

            for (const call of functionCalls) {
                const funcName = call.name;
                const skill = loadedSkills[funcName];

                if (skill) {
                    console.log(chalk.blue(`[⚙️ FERRAMENTA] Executando: ${funcName}`));
                    const res = await skill.execute(call.args, { chatId, sock, from, message });
                    functionResponses.push({
                        functionResponse: {
                            name: funcName,
                            response: { result: String(res).substring(0, 4000) }
                        }
                    });
                } else {
                    functionResponses.push({
                        functionResponse: {
                            name: funcName,
                            response: { result: "Erro: Ferramenta não encontrada." }
                        }
                    });
                }
            }

            const toolResult = await executeGeminiWithRotation(chat.getHistory(), functionResponses, geminiTools, systemPrompt);
            result = toolResult.response.response;
        }

        finalResponse = result.text();
    } catch (e) {
        console.error(chalk.red("[ERRO] Gemini API:"), e);
        finalResponse = "Opa, deu um erro de conexão com a IA (Gemini). Fala de novo?";
    }

    if (!finalResponse) finalResponse = "Fiz o que pediu, mas não tenho texto pra responder.";

    // ═══════════════════════════════
    //  AÇÃO AUTÔNOMA: Executar comandos via IA
    // ═══════════════════════════════
    const cmdRegex = /\[CMD:\s*(\/\S+)(.*?)\]/g;
    let match;
    while ((match = cmdRegex.exec(finalResponse)) !== null) {
        const cmdToRun = match[1] + (match[2] || '');
        if (cmdToRun) {
            // Criar um contexto fake para execução do comando
            const fakeBudy = cmdToRun.trim();
            const args = fakeBudy.split(/ +/).slice(1);
            const command = fakeBudy.split(/ +/)[0].toLowerCase().slice(1);
            const q = args.join(' ');

            console.log(chalk.magenta(`[🤖 AUTÔNOMO] Executando comando legado via IA: ${command}`));

            // Tentar executar via legado
            await handleLegacyCommand({
                sock, from, sender: rawSender, command, args, q, info: message,
                isGroup: from.endsWith('@g.us'),
                isGroupAdmins: false, // IA assume permissão se solicitou
                isBotGroupAdmins: true,
                SoDono: true, // IA atuando como dono
                prefix: '/', pushname: "Bochecha-IA", groupName: "Grupo",
                reply: (txt) => sock.sendMessage(from, { text: txt }),
                mention: (txt, m) => sock.sendMessage(from, { text: txt, mentions: m }),
                reagir: (f, e) => sock.sendPresenceUpdate('composing', from), // Troca reação por digitando
                selo: message, nmrdn: OWNERS[0], NomeDoBot: "Bochecha-IA", budy
            });

            finalResponse = finalResponse.replace(match[0], '').trim();
        }
    }

    history.push({ role: 'user', content: promptFormatado });
    history.push({ role: 'assistant', content: finalResponse });
    saveMemory(chatId, history);

    logEvent(`AI chamada | Chat: ${chatId} | User: ${pushname}`);

    return finalResponse;
}

// ══════════════════════════════════════════
//  HANDLER PRINCIPAL
// ══════════════════════════════════════════
module.exports = sansekai = async (upsert, sock, store, message) => {
    try {
        // Ignorar se não tem mensagem (notificações, reações, etc)
        if (!message.message) return;

        let budy = (typeof message.body == 'string' ? message.body : '');
        if (!budy) return;

        // Se a mensagem contiver a marca d'água invisível, foi enviada pelo próprio bot. Ignorar para evitar loop.
        if (budy.includes('\u200B')) return;
        if (message.key.fromMe && recentSentTexts.has(budy.trim())) return;

        const pushname = message.pushName || "Usuário";
        const from = message.chat;

        const rawSender = message.sender || message.key?.participant || message.key?.remoteJid || "";
        const sender = rawSender.split('@')[0];

        if (setupPin && budy.trim() === `/setup ${setupPin}`) {
            settings.owners = [sender];
            salvarSettings();
            setupPin = null;
            await message.reply('👑 Privilégios de dono concedidos com sucesso! Você agora é o administrador deste bot.\n\nUse /addkey SUA_CHAVE para configurar a IA.');
            console.log(chalk.green(`[SETUP] Novo dono configurado: ${sender}`));
            return;
        }

        const isOwner = OWNERS.some(num => sender === num || sender.endsWith(num)) || (settings.owners && settings.owners.includes(sender)) || message.key.fromMe;
        const isAutorizado = settings.isPublic || isOwner || autorizados.includes(sender);

        if (isOwner) console.log(chalk.bgGreen.black(`[👑 DONO DETECTADO]`), chalk.green(`${pushname} (${sender})`));

        // ═══════════════════════════════
        //  ANTI-LINK (Proteção de Grupo)
        // ═══════════════════════════════
        const isGroup = from.endsWith('@g.us');
        if (isGroup && budy.includes('chat.whatsapp.com/') && !isOwner) {
            console.log(chalk.bgRed.white(`[🚫 ANTI-LINK]`), chalk.red(`Link detectado de ${pushname}`));
            try {
                await sock.sendMessage(from, { delete: message.key });
                await sock.sendMessage(from, { text: `⚠️ @${sender}, links não são permitidos neste grupo!`, mentions: [rawSender] });
                return; // Para a execução aqui para não responder com IA
            } catch (e) {
                console.error("Erro ao deletar link:", e.message);
            }
        }

        const shortText = budy.length > 60 ? budy.substring(0, 60) + "..." : budy;
        console.log(`${chalk.yellow('[💬]')} ${chalk.cyan(pushname)} ${chalk.gray(`(${sender})`)}: ${chalk.white(shortText)}`);

        if (isOwner && budy.startsWith('/addkey ')) {
            const newKey = budy.replace('/addkey', '').trim();
            if (newKey) {
                const added = apiKeyManager.addKey(newKey);
                if (added) {
                    await message.reply('✅ Chave Gemini adicionada com sucesso! O bot já pode usar a IA.');
                } else {
                    await message.reply('⚠️ Essa chave já existe ou é inválida.');
                }
            } else {
                await message.reply('Uso: /addkey SUA_CHAVE_AQUI');
            }
            return;
        }

        // ═══════════════════════════════
        //  MENSAGENS NORMAIS → IA
        // ═══════════════════════════════
        if (!isAutorizado) return;

        const myNumber = sock.user.id.split(':')[0];
        const myLid = sock.authState?.creds?.me?.lid?.split(':')[0] || "SEMLID";

        // Verificações de menção muito mais fortes (incluindo LID para grupos recentes)
        const isMentionedByTag = message.mentionedJid && message.mentionedJid.some(jid => jid.includes(myNumber) || jid.includes(myLid));
        const isMentionedByText = budy.includes('@' + myNumber);
        const isReplyToMe = message.quoted && message.quoted.sender && (message.quoted.sender.includes(myNumber) || message.quoted.sender.includes(myLid));

        const isMentioned = isMentionedByTag || isMentionedByText || isReplyToMe;


        // Mostrar digitando antes da IA responder
        await sock.sendPresenceUpdate('composing', from);

        const startsWithBochecha = budy.toLowerCase().startsWith('bochecha');

        let shouldReply = false;
        let textoLimpo = budy;

        if (isGroup) {
            // Em grupos: só responde se chamar pelo nome, marcar ou responder a ela
            if (startsWithBochecha || isMentioned) {
                shouldReply = true;
                if (startsWithBochecha) textoLimpo = budy.replace(/^bochecha\s*/i, '').trim() || "oi";
                // Limpa a menção por arroba do texto pra IA não ficar confusa
                textoLimpo = textoLimpo.replace(new RegExp(`@${myNumber}`, 'g'), '').trim() || textoLimpo;
            }
        } else {
            // Em DM: responde sempre
            shouldReply = true;
            if (startsWithBochecha) textoLimpo = budy.replace(/^bochecha\s*/i, '').trim() || "oi";
        }

        if (!shouldReply || textoLimpo.length === 0) return;

        // ═══════════════════════════════
        //  DEBOUNCE — Agrupa msgs rápidas
        //  Espera 1.5s após última msg antes de responder
        // ═══════════════════════════════
        const pendingKey = `${from}:${sender}`;

        if (pendingMessages.has(pendingKey)) {
            const pending = pendingMessages.get(pendingKey);
            pending.messages.push(textoLimpo);
            pending.pushname = pushname;
            pending.msgRef = message; // Atualizar referência pra responder à última
            clearTimeout(pending.timer);
        } else {
            pendingMessages.set(pendingKey, {
                messages: [textoLimpo],
                pushname: pushname,
                msgRef: message
            });
        }

        const pending = pendingMessages.get(pendingKey);
        pending.timer = setTimeout(async () => {
            pendingMessages.delete(pendingKey);

            // Juntar todas as mensagens acumuladas
            const textoFinal = pending.messages.join('\n');

            try {
                // Mostrar digitando
                await sock.sendPresenceUpdate('composing', from);

                const resposta = await callAI(from, isOwner ? "Marcos" : pending.pushname, textoFinal, isOwner, sock, from, message);
                recentSentTexts.add(resposta.trim());
                setTimeout(() => recentSentTexts.delete(resposta.trim()), 60000);
                await sock.sendMessage(from, { text: resposta + '\u200B' }, { quoted: pending.msgRef });


            } catch (e) {
                logError(`AI response (${from})`, e);
                // Tentar com modelo fallback
                try {
                    const fallbackRes = await executeGeminiWithRotation(
                        [],
                        `[De: ${isOwner ? "Marcos" : pending.pushname}] ${textoFinal}`,
                        [],
                        "Você é o Bochecha. Responda brevemente em português."
                    );
                    const fallbackTexto = fallbackRes.response.response.text();
                    recentSentTexts.add(fallbackTexto.trim());
                    setTimeout(() => recentSentTexts.delete(fallbackTexto.trim()), 60000);
                    await sock.sendMessage(from, { text: fallbackTexto + '\u200B' }, { quoted: pending.msgRef });
                } catch (e2) {
                    logError("AI fallback", e2);
                }
            }
        }, DEBOUNCE_MS);

    } catch (err) {
        logError("handler geral", err);
    }
};
