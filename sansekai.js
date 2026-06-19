/**
 * 🌌 PROTOCOLO SUPREMO: 𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀 - 𝐈𝐀 🛸
 * ══════════════════════════════════════════════════════════════════════════
 * MOTOR DE INTELIGÊNCIA ARTIFICIAL E ADMINISTRAÇÃO AUTÔNOMA DE ÚLTIMA GERAÇÃO
 * ══════════════════════════════════════════════════════════════════════════
 * 
 * Versão: 3.5.0 Premium (State-of-the-Art Edition)
 * Desenvolvido e Otimizado para o Criador/Arquiteto Marcos.
 * Padrão de Projeto: Arquitetura Baseada em Serviços Modularizados (SOA-OOP).
 * 
 * ──────────────────────────────────────────────────────────────────────────
 *                           DIAGRAMA DA ARQUITETURA
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *              [Conexão WhatsApp Baileys] ──> Event Binder (sansekai.bind)
 *                                                   │
 *        ┌───────────────────┬──────────────────────┼──────────────────────┐
 *        ▼                   ▼                      ▼                      ▼
 * [messages.upsert]   [group-participants]  [messages.update]       [Noturno CRON]
 *        │                   │                      │                      │
 *        ├───────────────────┴──────────────────────┼──────────────────────┘
 *        │                                          ▼
 *        ▼                                  ┌───────────────┐
 * ┌───────────────┐                         │SecuritySystem │
 * │BochechaEngine │ <── (Debounce/Fila)     └───────┬───────┘
 * └──────┬────────┘                                 │
 *        │                                          ├─ Anti-Delete
 *        ├─ Comandos Diretos (/warn, /status...)    ├─ Anti-Porn (NSFW Scan)
 *        │                                          ├─ Anti-Link
 *        ▼                                          ├─ Anti-Status/Payment
 * ┌───────────────┐                                 ├─ Anti-Fake/Gringo
 * │PromptComposer │ <── Contexto de Usuário (XP)    ├─ Anti-Promote/Demote
 * └──────┬────────┘                                 ├─ Boas-Vindas & Adeus
 *        │                                          ├─ Reações por Áudio
 *        ▼                                          └─ Respostas Ensinadas
 * ┌───────────────┐
 * │KeyRotationEng │ <── (Rotação Multi-Key & Cooldown 429 & Backoff Exponencial)
 * └──────┬────────┘
 *        │
 *        ├───> [Google Gemini API] ───> Chamada de Skills/Ferramentas
 *        │                                      │
 *        │                                      ▼
 *        │                              ┌───────────────┐
 *        │                              │SkillRegistry  │ <── (Hot-Reloading)
 *        │                              └───────┬───────┘
 *        │                                      │
 *        │   (Retorno Executado no WhatsApp)    ▼
 *        └──────────────────────────────> [Resposta IA]
 * 
 * JSDoc e Documentação Completa Injetados para Manutenção Avançada de Código.
 */

const { 
    BufferJSON, 
    WA_DEFAULT_EPHEMERAL, 
    generateWAMessageFromContent, 
    proto, 
    generateWAMessageContent, 
    generateWAMessage, 
    prepareWAMessageMedia, 
    areJidsSameUser, 
    getContentType, 
    downloadContentFromMessage 
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const util = require("util");
const { resolveStickerReactionFallback } = require("./lib/stickerReactionHelper");
const { buildOfflineFallbackResponse } = require("./lib/offlineFallbackHelper");
const { resolveDirectCommand } = require("./lib/direct_commands");
const chalk = require("chalk");
const moment = require("moment-timezone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec, spawn, execFileSync } = require("child_process");
const config = require("./config");


// Módulo de Gerenciamento das Chaves API local
const apiKeyManager = require("./apiKeyManager");

// Controladores locais de Skills
const gamesController = require("./skills/games_controller");
const { classifyConversationSafety, sanitizeAssistantOutput } = require("./lib/conversation_safety");

// ══════════════════════════════════════════════════════════════════════════
// 1. DIRETÓRIOS E CONFIGURAÇÕES GLOBAIS
// ══════════════════════════════════════════════════════════════════════════

const ROOT_DIR = __dirname;
const MEMORY_DIR = path.join(ROOT_DIR, "memory");
const LEARNINGS_DIR = path.join(ROOT_DIR, "learnings");
const SKILLS_DIR = path.join(ROOT_DIR, "skills");

// Garantir integridade de diretórios críticos do sistema
[MEMORY_DIR, LEARNINGS_DIR, SKILLS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Caminhos dos bancos de dados JSON e configurações
const SYSTEM_FILE = path.join(ROOT_DIR, "SYSTEM.md");
const AUTORIZADOS_FILE = path.join(ROOT_DIR, "autorizados.json");
const NOTAS_FILE = path.join(ROOT_DIR, "notas.json");
const SETTINGS_FILE = path.join(ROOT_DIR, "settings.json");
const KEY_FILE = path.join(ROOT_DIR, "key.json");

// Caminhos dos arquivos de Skills e Regras do Grupo
const WARNINGS_FILE = path.join(SKILLS_DIR, "database_warnings.json");
const SECURITY_FILE = path.join(SKILLS_DIR, "database_security.json");
const GAMES_FILE = path.join(SKILLS_DIR, "database_games.json");
const TICTACTOE_FILE = path.join(SKILLS_DIR, "database_tictactoe.json");
const AUTOREPLY_FILE = path.join(SKILLS_DIR, "database_autoreply.json");
const NOTURNO_FILE = path.join(SKILLS_DIR, "database_noturno.json");
const RANKING_FILE = path.join(SKILLS_DIR, "database_ranking.json");
const KNOWLEDGE_FILE = path.join(LEARNINGS_DIR, "knowledge_base.json");
const EMOTIONAL_FILE = path.join(LEARNINGS_DIR, "emotional_engine.json");

const DEFAULT_OWNERS = config.OWNER_NUMBERS || ["551420370026"];

// Banco de mapeamento de LIDs (Local Identifiers do WhatsApp) para JIDs reais de telefone
const LID_MAP_FILE = path.join(LEARNINGS_DIR, "lid_mappings.json");
let lidMappings = {};
try {
    if (fs.existsSync(LID_MAP_FILE)) {
        lidMappings = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
    }
} catch {}

function saveLidMappings() {
    try {
        fs.writeFileSync(LID_MAP_FILE, JSON.stringify(lidMappings, null, 2));
    } catch {}
}

const ANTI_HALLUCINATION_SAFE_PHRASES = [
    "não sei",
    "não tenho como saber",
    "não tenho como",
    "não posso saber",
    "não posso dizer",
    "não tenho essa informação",
    "não tenho essa",
    "não dá pra saber",
    "não conheço",
    "não tenho detalhes",
    "não tenho base"
];

const ANTI_HALLUCINATION_IGNORE_TOKENS = new Set([
    'não','sim','talvez','pode','podeu','já','mas','se','eu','vc','vcê','voce','você','para','no','na','com','sem','uma','um','os','as','os','as','e','ou','do','da','dos','das','este','esta','esse','essa','aquele','aquela','de','do','da','dos','das','por','pelo','pela','pelos','pelas'
]);

const ANTI_HALLUCINATION_HEDGING_PATTERNS = [
    /\b(acho|acho que|creio|talvez|provavelmente|possivelmente|parece|deve|deveria|imagino|supostamente)\b/i
];

const ANTI_HALLUCINATION_FACTUAL_PROMPT_PATTERNS = [
    /\b(quem|qual|quando|onde|quanto|quantos|como|por que|porque|resultado|horario|horário|preço|valor|data|nome|telefone|endereço|saldo|placar|status|jogo|vencedor|perdedor)\b/i
];

function normalizeTextForHallucination(text) {
    if (!text || typeof text !== 'string') return "";
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .toLowerCase();
}

function buildSourceText(prompt, history) {
    let source = '';
    if (typeof prompt === 'string') {
        source += prompt + ' ';
    } else if (Array.isArray(prompt)) {
        source += prompt.map(item => typeof item === 'string' ? item : (item.text || '')).join(' ') + ' ';
    } else if (prompt) {
        source += String(prompt) + ' ';
    }
    if (Array.isArray(history)) {
        history.forEach(item => {
            if (!item) return;
            if (typeof item === 'string') {
                source += item + ' ';
            } else if (item.parts && Array.isArray(item.parts)) {
                source += item.parts.map(p => p.text || '').join(' ') + ' ';
            } else if (item.content) {
                source += item.content + ' ';
            }
        });
    }
    return normalizeTextForHallucination(source);
}

function isIdentityQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = normalizeTextForHallucination(text);
    return /\b(quem|qual|como)\b/.test(normalized) && /\b(é|e|se chama|chama|voce|você|tu|vc)\b/.test(normalized);
}

function isDirectIdentityOrCapabilityQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = normalizeTextForHallucination(text);
    return (isIdentityQuery(text) || /\b(oque|o que|quais|quais funcoes|quais funções|que voce pode|que você pode|que voce faz|que você faz|como voce pode|como você pode|suas funções|suas funcoes|suas habilidades|o que faz)\b/.test(normalized))
        && /\b(voce|você|tu|vc|bot|assistente|bochecha|pode|podes|fazer|ajudar|responder|funcionar)\b/.test(normalized);
}

function isSelfDescription(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = normalizeTextForHallucination(text);
    return /\b(sou|eu sou|me chamo|meu nome|sou o|sou um|sou uma|eu sou o|eu sou um|eu sou uma)\b/.test(normalized)
        || /\b(bot|assistente|ia|bochecha)\b/.test(normalized);
}

function isCapabilityQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = normalizeTextForHallucination(text);
    return /\b(oque|o que|quais|quais funcoes|quais funções|que voce pode|que você pode|que voce faz|que você faz|como voce pode|como você pode|suas funções|suas funcoes|suas habilidades|o que faz)\b/.test(normalized)
        && /\b(voce|você|tu|vc|bot|assistente|bochecha|pode|podes|fazer|funcionar|ajudar|responder)\b/.test(normalized);
}

function isCapabilityResponse(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = normalizeTextForHallucination(text);
    return /\b(posso|posso fazer|ajudo|ajudar|ferramentas|funções|funcoes|habilidades|comandos|responder|listar|executar|mandar|enviar|gerar|explicar)\b/.test(normalized);
}

function getHallucinationFallback(options = {}) {
    if (options && options.isGroup) {
        return 'Não tenho base suficiente pra afirmar isso aqui sem correr o risco de inventar. Me dá mais contexto que eu tento ajudar melhor.';
    }
    return 'Não tenho base suficiente pra afirmar isso sem correr o risco de inventar.';
}

function buildToolExecutionFallbackOutput(prompt = '', lastExecutedTool = null) {
    if (!prompt || typeof prompt !== 'string') {
        return 'Feito.';
    }

    const normalizedPrompt = normalizeTextForHallucination(prompt);
    if (/(play|tocar|reproduzir|audio|áudio)/.test(normalizedPrompt) || lastExecutedTool === 'falar_em_audio' || lastExecutedTool === 'bochecha_voz' || lastExecutedTool === 'play_audio') {
        return 'Já toquei.';
    }

    if (/(imagem|foto|gerar|criar|mandar|enviar)/.test(normalizedPrompt)) {
        return 'Feito.';
    }

    return 'Feito.';
}

function isLowConfidenceFactualAnswer(output, prompt) {
    if (!output || typeof output !== 'string') return false;
    if (!prompt || typeof prompt !== 'string') return false;

    const lowerOutput = normalizeTextForHallucination(output);
    const lowerPrompt = normalizeTextForHallucination(prompt);
    if (!lowerOutput || !lowerPrompt) return false;

    const hasHedge = ANTI_HALLUCINATION_HEDGING_PATTERNS.some(pattern => pattern.test(lowerOutput));
    const asksForFact = ANTI_HALLUCINATION_FACTUAL_PROMPT_PATTERNS.some(pattern => pattern.test(lowerPrompt));
    if (!hasHedge || !asksForFact) return false;

    const shortAnswer = lowerOutput.split(/\s+/).filter(Boolean).length <= 6;
    return shortAnswer || /\b(sim|não|nao|talvez|acho|creio|provavelmente|imagino)\b/.test(lowerOutput);
}

function isPotentialHallucination(output, sourceText, prompt = '') {
    if (!output || typeof output !== 'string') return false;
    const lowerOutput = normalizeTextForHallucination(output);
    if (ANTI_HALLUCINATION_SAFE_PHRASES.some(phrase => lowerOutput.includes(phrase))) {
        return false;
    }

    if (isLowConfidenceFactualAnswer(output, prompt)) {
        return true;
    }

    const suspiciousDates = lowerOutput.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g) || [];
    const suspiciousYears = lowerOutput.match(/\b(19|20)\d{2}\b/g) || [];
    const suspiciousTimes = lowerOutput.match(/\b\d{1,2}:\d{2}\b/g) || [];
    const suspiciousWeekdays = lowerOutput.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|sábado|domingo)\b/g) || [];
    const suspiciousNumbers = lowerOutput.match(/\b\d{2,4}\b/g) || [];
    const sourceWords = new Set(sourceText.split(/\s+/).filter(Boolean));
    const outputWords = [];
    const capRegex = /\b([A-ZÀ-Ý][a-zà-ÿçãõéíóúâêîôû]+)\b/g;
    let capMatch;
    while ((capMatch = capRegex.exec(output)) !== null) {
        const idx = capMatch.index;
        const textBefore = output.slice(Math.max(0, idx - 3), idx);
        const isSentenceStart = idx === 0 || /[\.!\?]\s*$/.test(output.slice(0, idx));
        if (isSentenceStart) continue;
        outputWords.push(capMatch[1]);
    }

    const unknownProperNouns = outputWords.filter(word => {
        const normalized = normalizeTextForHallucination(word);
        if (!normalized || ANTI_HALLUCINATION_IGNORE_TOKENS.has(normalized)) return false;
        if (sourceWords.has(normalized)) return false;
        return true;
    });

    if (unknownProperNouns.length > 0 && !lowerOutput.includes('não sei') && !lowerOutput.includes('não tenho')) {
        return true;
    }

    if (suspiciousDates.length > 0 || suspiciousYears.length > 0 || suspiciousTimes.length > 0 || suspiciousWeekdays.length > 0) {
        for (const token of [...suspiciousDates, ...suspiciousYears, ...suspiciousTimes, ...suspiciousWeekdays]) {
            if (!sourceText.includes(token)) {
                return true;
            }
        }
    }

    const numericClaims = suspiciousNumbers.filter(num => !sourceText.includes(num));
    if (numericClaims.length > 0 && numericClaims.length <= 5 && lowerOutput.match(/\b(\d+|vinte|trinta|quarenta|cinquenta|cem|duzentos|mil|milhão|bilhão)\b/)) {
        return true;
    }

    return false;
}

function shouldRespondToMessage(text, options = {}) {
    if (!text || typeof text !== 'string') return false;

    const trimmed = text.trim();
    if (!trimmed) return false;

    const isGroup = !!options.isGroup;
    const isMentioned = !!options.isMentioned;
    const isReply = !!options.isReply;

    if (isMentioned || isReply) return true;
    if (!isGroup) return true;

    if (/^(\/|!|\.)/.test(trimmed)) return true;
    if (/\b(bochecha|bot)\b/i.test(trimmed)) return true;

    return false;
}

function looksLikeUnsafeToolOutput(output) {
    if (!output || typeof output !== 'string') return false;
    const normalized = normalizeTextForHallucination(output);
    if (!normalized) return false;

    const unsafePatterns = [
        /\b(vacil(a|ao|ao)|idiota|otario|otário|babaca|imbecil|lixo|fuder|fud(e|er)|vai te fuder|vai se fuder|seu cu|seu lixo|arrombado|corno|filho da puta|puta|merda|inferno)\b/i,
        /\b(quer ser banido|vou te banir|te banir|te expulsar|te matar|vou te matar|te amarrar|me bane)\b/i
    ];

    return unsafePatterns.some(pattern => pattern.test(normalized));
}

function looksLikeConversationalToolReply(output) {
    if (!output || typeof output !== 'string') return false;
    const trimmed = output.trim();
    if (!trimmed) return false;

    const simpleConfirmation = /^\s*(feito|pronto|ok|okay|já toquei|já enviei|enviado|baixado|download concluído|concluído|concluido|realizado|executado|processado|entendido)\b/i.test(trimmed);
    if (simpleConfirmation) return false;

    const tooLong = trimmed.split(/\s+/).filter(Boolean).length > 8;
    const hasQuestion = /\?/.test(trimmed);
    const hasFollowUp = /\b(qual|como|quero|vou|vamos|quer|gostaria|pode|podes|curte|queres|quero|me diga|fala|diz|manda|deixa|vamos|vamos fazer)\b/i.test(trimmed);
    return tooLong || hasQuestion || hasFollowUp;
}

function enforceAntiHallucinationGuard(output, prompt, history, options = {}) {
    if (!output || typeof output !== 'string') return output;
    if (isDirectIdentityOrCapabilityQuery(prompt)) {
        return output;
    }
    if ((isIdentityQuery(prompt) && isSelfDescription(output)) || (isCapabilityQuery(prompt) && isCapabilityResponse(output))) {
        return output;
    }

    if (options && options.wasToolExecuted) {
        const trimmed = output.trim();
        const looksLikeToolFailure = /\b(não tenho base|não tenho contexto|não sei|não consigo|não dá pra|não tenho como|não vou|não posso|não tenho informações)\b/i.test(trimmed);
        if (!trimmed || looksLikeToolFailure) {
            Logger.info('AntiHallucination', 'Pulando guard para resposta pós-execução de skill/tool.');
            return buildToolExecutionFallbackOutput(prompt, options.lastExecutedTool);
        }

        const isSimpleToolConfirmation = /^\s*(feito|pronto|ok|okay|já toquei|já enviei|enviado|baixado|download concluído|concluído|concluido|realizado|executado|processado|entendido)\b/i.test(trimmed);
        if (isSimpleToolConfirmation) {
            Logger.info('AntiHallucination', 'Resposta pós-tool simples aceita com fallback neutro.');
            return buildToolExecutionFallbackOutput(prompt, options.lastExecutedTool);
        }

        if (looksLikeUnsafeToolOutput(trimmed) || looksLikeConversationalToolReply(trimmed)) {
            Logger.warn('AntiHallucination', 'Resposta pós-tool ofensiva, conversacional ou insegura detectada; aplicando fallback seguro.');
            return buildToolExecutionFallbackOutput(prompt, options.lastExecutedTool);
        }

        const sourceText = buildSourceText(prompt, history);
        if (isPotentialHallucination(output, sourceText, prompt)) {
            Logger.warn('AntiHallucination', `Resposta pós-tool possivelmente inventada detectada; aplicando fallback seguro.`);
            return getHallucinationFallback(options);
        }

        Logger.info('AntiHallucination', 'Resposta pós-tool passou pela validação limitada.');
        return output;
    }

    const sourceText = buildSourceText(prompt, history);
    if (isPotentialHallucination(output, sourceText, prompt)) {
        Logger.warn('AntiHallucination', `Resposta possivelmente inventada detectada; aplicando fallback seguro.`);
        return getHallucinationFallback(options);
    }
    return output;
}

/**
 * Normaliza e resolve qualquer JID (inclusive LIDs do WhatsApp) para o JID de telefone real se disponível no cache.
 */
/**
 * Resolve assincronamente qualquer JID (inclusive LIDs do WhatsApp) para o JID de telefone real usando o signalRepository do Baileys e o store.
 * Salva o resultado no mapa persistente lidMappings para uso imediato em normalizeJid.
 */
async function resolveJidAsync(jid) {
    if (!jid) return jid;
    
    let cleanJid = jid;
    if (cleanJid.includes(':')) {
        const parts = cleanJid.split(':');
        const suffix = parts[1].split('@')[1];
        cleanJid = parts[0] + '@' + suffix;
    }

    // 1. Verifica no mapa persistente local
    if (lidMappings[cleanJid]) {
        return lidMappings[cleanJid];
    }

    // 2. Se for LID, tenta resolver pelo signalRepository do Baileys (com await)
    if (cleanJid.endsWith('@lid') && BochechaEngine.sockRef) {
        try {
            const sock = BochechaEngine.sockRef;
            if (sock.signalRepository && sock.signalRepository.lidMapping) {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(cleanJid);
                if (pn) {
                    const resolved = pn.endsWith('@s.whatsapp.net') ? pn : pn + '@s.whatsapp.net';
                    lidMappings[cleanJid] = resolved;
                    saveLidMappings();
                    return resolved;
                }
            }
        } catch (e) {
            // Silencioso
        }
    }

    // 3. Se for LID, tenta resolver pelo store
    if (cleanJid.endsWith('@lid') && BochechaEngine.storeRef) {
        try {
            const contacts = BochechaEngine.storeRef.contacts || {};
            const contact = Object.values(contacts).find(c => c.id === cleanJid || c.jid === cleanJid);
            if (contact && contact.phoneNumber) {
                const resolved = contact.phoneNumber + "@s.whatsapp.net";
                lidMappings[cleanJid] = resolved;
                saveLidMappings();
                return resolved;
            }
        } catch (err) {
            // Silencioso
        }
    }

    return cleanJid;
}

/**
 * Normaliza e resolve qualquer JID (inclusive LIDs do WhatsApp) para o JID de telefone real se disponível no cache (síncrono).
 */
function normalizeJid(jid) {
    if (!jid) return jid;
    
    let cleanJid = jid;
    if (cleanJid.includes(':')) {
        const parts = cleanJid.split(':');
        const suffix = parts[1].split('@')[1];
        cleanJid = parts[0] + '@' + suffix;
    }

    // 1. Verifica no mapa persistente local
    if (lidMappings[cleanJid]) {
        return lidMappings[cleanJid];
    }

    // 2. Se for LID, tenta resolver pelo store de forma síncrona
    if (cleanJid.endsWith('@lid') && BochechaEngine.storeRef) {
        try {
            const contacts = BochechaEngine.storeRef.contacts || {};
            const contact = Object.values(contacts).find(c => c.id === cleanJid || c.jid === cleanJid);
            if (contact && contact.phoneNumber) {
                const resolved = contact.phoneNumber + "@s.whatsapp.net";
                lidMappings[cleanJid] = resolved;
                saveLidMappings();
                return resolved;
            }
        } catch (err) {
            // Silencioso
        }
    }

    return cleanJid;
}

/**
 * Busca inteligente de contatos ou grupos correspondentes por nome/apelido ou número direto.
 * @param {any} sock Instância Baileys.
 * @param {string} name Nome ou número a pesquisar.
 * @param {string} fromChatId ID do chat de origem para contexto.
 * @param {string} type Tipo de busca ('pv' ou 'grupo').
 * @returns {Promise<Array<{jid: string, name: string, context: string}>>} Retorna lista de candidatos encontrados.
 */
async function findCandidates(sock, name, fromChatId, type) {
    if (!name) return [];
    const cleanName = name.toLowerCase().trim();
    const candidatesMap = new Map();

    const addCandidate = (jid, displayName, context) => {
        if (!jid) return;
        if (!candidatesMap.has(jid)) {
            candidatesMap.set(jid, { jid, name: displayName, context });
        }
    };

    // 1. Se já for um JID válido ou número puro com/sem DDI
    if (cleanName.endsWith('@s.whatsapp.net') || cleanName.endsWith('@lid') || cleanName.endsWith('@g.us')) {
        return [{ jid: cleanName, name: cleanName, context: 'JID Direto' }];
    }
    const numbersOnly = cleanName.replace(/[^0-9]/g, '');
    if (numbersOnly.length >= 8 && /^\d+$/.test(cleanName.replace('+', '').replace('-', ''))) {
        const jid = numbersOnly + '@s.whatsapp.net';
        return [{ jid, name: jid, context: 'Número Direto' }];
    }

    // 2. Se for busca de grupo
    if (type === 'grupo') {
        try {
            const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
            for (const jid in groups) {
                const subject = groups[jid].subject || "";
                if (subject.toLowerCase().includes(cleanName)) {
                    addCandidate(jid, subject, 'Grupos Participantes');
                }
            }
        } catch (e) {
            Logger.error("findCandidates.groups", e);
        }
        return Array.from(candidatesMap.values());
    }

    // 3. Se for busca de PV (Contato)
    // 3.1. Pesquisa nos participantes do grupo atual (caso a mensagem venha de um grupo)
    if (fromChatId && fromChatId.endsWith('@g.us')) {
        try {
            const metadata = BochechaEngine.storeRef?.chats?.get(fromChatId) || await sock.groupMetadata(fromChatId).catch(() => null);
            if (metadata && metadata.participants) {
                for (const participant of metadata.participants) {
                    const pjid = participant.id;
                    const contact = BochechaEngine.storeRef?.contacts?.[pjid];
                    const cName = contact?.name || contact?.notify || contact?.verifiedName || '';
                    if (cName && cName.toLowerCase().includes(cleanName)) {
                        addCandidate(pjid, cName, `Grupo Atual (${metadata.subject || 'Este Grupo'})`);
                    }
                }
            }
        } catch (e) {
            Logger.error("findCandidates.groupParticipants", e);
        }
    }

    // 3.2. Pesquisa em database_ranking.json
    try {
        if (fs.existsSync(RANKING_FILE)) {
            const rankingDb = JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8'));
            for (const gid in rankingDb) {
                const users = rankingDb[gid];
                if (typeof users === 'object') {
                    let groupContext = 'Ranking';
                    try {
                        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
                        if (groups[gid]) {
                            groupContext = `Ranking no Grupo: ${groups[gid].subject || 'Desconhecido'}`;
                        }
                    } catch {}

                    for (const uid in users) {
                        const user = users[uid];
                        if (user && user.name && user.name.toLowerCase().includes(cleanName)) {
                            addCandidate(uid, user.name, groupContext);
                        }
                    }
                }
            }
        }
    } catch (e) {
        Logger.error("findCandidates.ranking", e);
    }

    // 3.3. Pesquisa em chat_activity.json
    try {
        const activityFile = path.join(LEARNINGS_DIR, 'chat_activity.json');
        if (fs.existsSync(activityFile)) {
            const activityDb = JSON.parse(fs.readFileSync(activityFile, 'utf8'));
            for (const gid in activityDb) {
                const messages = activityDb[gid];
                if (Array.isArray(messages)) {
                    let groupContext = 'Atividade';
                    try {
                        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
                        if (groups[gid]) {
                            groupContext = `Mensagens no Grupo: ${groups[gid].subject || 'Desconhecido'}`;
                        }
                    } catch {}

                    for (const msg of messages) {
                        if (msg && msg.pushname && msg.pushname.toLowerCase().includes(cleanName) && msg.user) {
                            addCandidate(msg.user, msg.pushname, groupContext);
                        }
                    }
                }
            }
        }
    } catch (e) {
        Logger.error("findCandidates.activity", e);
    }

    // 3.4. Pesquisa nos contatos do Store global
    if (BochechaEngine.storeRef && BochechaEngine.storeRef.contacts) {
        const contacts = BochechaEngine.storeRef.contacts;
        for (const id in contacts) {
            const contact = contacts[id];
            if (contact) {
                const nameFields = [contact.name, contact.notify, contact.verifiedName];
                for (const field of nameFields) {
                    if (field && field.toLowerCase().includes(cleanName)) {
                        addCandidate(id, field, 'Contatos Salvos');
                    }
                }
            }
        }
    }

    return Array.from(candidatesMap.values());
}

// Cache na RAM para Anti-Delete (Mensagens originais)
const messageCache = new Map();

// ══════════════════════════════════════════════════════════════════════════
// 2. SISTEMA DE LOGS E AUDITORIA (CLASS LOGGER)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Módulo de Logs e Diagnósticos de Alto Padrão Visual.
 * Registra erros em arquivos locais e estiliza saídas no console do servidor.
 */
class Logger {
    /**
     * Registra e exibe um erro grave no console e no arquivo de logs de erro.
     * @param {string} context O escopo ou classe do erro.
     * @param {Error|string} error O objeto de erro capturado.
     */
    static error(context, error) {
        const logFile = path.join(LEARNINGS_DIR, "errors.log");
        const timestamp = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
        const errMsg = error?.stack || error?.message || String(error);
        const entry = `[${timestamp}] [ERRO] [${context}]: ${errMsg}\n`;
        
        try {
            fs.appendFileSync(logFile, entry);
        } catch (e) {
            console.error("Erro interno ao persistir log:", e.message);
        }

        console.log(
            chalk.red(`[🚫 ERRO CRÍTICO] `) + 
            chalk.bgRed.white(` ${context} `) + 
            chalk.red(`: ${error?.message || error}`)
        );
    }

    /**
     * Registra um evento de auditoria no arquivo de logs geral.
     * @param {string} event Texto explicativo do evento.
     */
    static event(event) {
        const logFile = path.join(LEARNINGS_DIR, "events.log");
        const timestamp = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
        const entry = `[${timestamp}] [EVENTO]: ${event}\n`;

        try {
            fs.appendFileSync(logFile, entry);
        } catch (e) {
            console.error("Erro interno ao gravar evento:", e.message);
        }
    }

    /**
     * Emite um log de nível informativo no console.
     * @param {string} module Nome do módulo ou serviço.
     * @param {string} text Texto explicativo do log.
     */
    static info(module, text) {
        console.log(
            chalk.blue(`[⚡ ${module}] `) + 
            chalk.white(text)
        );
    }

    /**
     * Emite um log de aviso no console.
     * @param {string} module Nome do módulo ou serviço.
     * @param {string} text Texto do aviso.
     */
    static warn(module, text) {
        console.log(
            chalk.yellow(`[⚠️ AVISO] `) + 
            chalk.bgYellow.black(` ${module} `) + 
            chalk.yellow(`: ${text}`)
        );
    }

    /**
     * Emite um log de sucesso no console.
     * @param {string} module Nome do módulo ou serviço.
     * @param {string} text Texto do sucesso.
     */
    static success(module, text) {
        console.log(
            chalk.green(`[✅ SUCESSO] `) + 
            chalk.bgGreen.black(` ${module} `) + 
            chalk.green(`: ${text}`)
        );
    }

    /**
     * Imprime um layout formatado em bloco (Box) no console.
     * @param {string} title Título principal do bloco.
     * @param {string[]} lines Linhas informativas da caixa.
     */
    static box(title, lines) {
        const maxLen = Math.max(title.length, ...lines.map(l => l.length)) + 4;
        const border = "═".repeat(maxLen);
        console.log(chalk.cyan(`╔${border}╗`));
        console.log(chalk.cyan(`║  ${title.padEnd(maxLen - 2)}║`));
        console.log(chalk.cyan(`╠${border}╣`));
        lines.forEach(l => {
            console.log(chalk.cyan(`║  `) + chalk.white(l.padEnd(maxLen - 2)) + chalk.cyan(`║`));
        });
        console.log(chalk.cyan(`╚${border}╝`));
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3. STORAGE MANAGER (PERSISTÊNCIA, CRIPTOGRAFIA E LOCKS)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Controla concorrência de acessos aos bancos de dados baseados em arquivos JSON.
 * Previne corrupção de arquivos em momentos de uso intenso e implementa Self-Healing.
 */
class StorageManager {
    constructor() {
        this.locks = new Map();
        this.cache = new Map();
    }

    /**
     * Adquire um semáforo de lock assíncrono para escrita ou leitura exclusiva.
     * @param {string} filePath 
     * @returns {Promise<Function>} Função de liberação (Release).
     */
    async _acquireLock(filePath) {
        while (this.locks.has(filePath)) {
            await this.locks.get(filePath);
        }
        let resolveLock;
        const newLock = new Promise(resolve => { resolveLock = resolve; });
        this.locks.set(filePath, newLock);
        return () => {
            this.locks.delete(filePath);
            resolveLock();
        };
    }

    /**
     * Lê um arquivo JSON do disco de forma segura.
     * @param {string} filePath Caminho do arquivo a ser lido.
     * @param {any} defaultValue Valor padrão se o arquivo não existir ou for corrompido.
     * @returns {Promise<any>}
     */
    async read(filePath, defaultValue = {}) {
        const release = await this._acquireLock(filePath);
        try {
            let localData = defaultValue;
            let existsLocal = fs.existsSync(filePath);

            if (!existsLocal) {
                // Se o arquivo local não existe, tenta puxar do Firebase Firestore de forma síncrona para esta inicialização
                const baseName = path.basename(filePath);
                const { db, doc, getDoc, setDoc } = require('./firebase_connector');
                const docRef = doc(db, "database_json", baseName);
                
                let cloudLoaded = false;
                try {
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const cloudDoc = snap.data();
                        let cloudData = cloudDoc.data;
                        
                        // Self-healing para dados da nuvem
                        if (Array.isArray(defaultValue) && cloudData && !Array.isArray(cloudData)) {
                            const values = [];
                            const keys = Object.keys(cloudData).filter(k => !isNaN(k)).sort((a, b) => Number(a) - Number(b));
                            for (const k of keys) {
                                values.push(cloudData[k]);
                            }
                            cloudData = values;
                        }
                        
                        fs.writeFileSync(filePath, JSON.stringify(cloudData, null, 2));
                        this.cache.set(filePath, cloudData);
                        localData = cloudData;
                        cloudLoaded = true;
                        console.log(chalk.green(`[🔥 FIREBASE] Restaurado backup de '${baseName}' do Firestore!`));
                    }
                } catch (err) {
                    console.error(`[🔥 FIREBASE] Erro ao buscar backup de '${baseName}':`, err.message);
                }

                if (!cloudLoaded) {
                    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
                    this.cache.set(filePath, defaultValue);
                    localData = defaultValue;
                    
                    // Salva backup inicial assincronamente no Firebase
                        setDoc(docRef, {
                            data: defaultValue,
                            lastUpdated: Date.now()
                        }).catch(() => {});
                    }
                }

            // Garantir que as propriedades do defaultValue estejam presentes em localData caso seja um objeto
            if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
                if (localData && typeof localData === 'object' && !Array.isArray(localData)) {
                    let updated = false;
                    for (const key of Object.keys(defaultValue)) {
                        if (localData[key] === undefined) {
                            localData[key] = JSON.parse(JSON.stringify(defaultValue[key]));
                            updated = true;
                        }
                    }
                    if (updated) {
                        fs.writeFileSync(filePath, JSON.stringify(localData, null, 2));
                        this.cache.set(filePath, localData);
                    }
                }
            }

            return JSON.parse(JSON.stringify(localData));
        } catch (e) {
            Logger.error(`StorageManager.read(${path.basename(filePath)})`, e);
            // Self-Healing
            try {
                const corruptPath = `${filePath}.corrupt_${Date.now()}`;
                if (fs.existsSync(filePath)) fs.renameSync(filePath, corruptPath);
                fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
                Logger.warn("StorageManager.SelfHealing", `Arquivo corrompido ${path.basename(filePath)} recuperado.`);
                this.cache.set(filePath, defaultValue);
                return JSON.parse(JSON.stringify(defaultValue));
            } catch (recoveryErr) {
                Logger.error("StorageManager.SelfHealingRecovery", recoveryErr);
            }
            return defaultValue;
        } finally {
            release();
        }
    }

    async write(filePath, data) {
        const release = await this._acquireLock(filePath);
        try {
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, `${filePath}.bak`);
            }
            
            // Grava o JSON limpo direto no disco (sem poluir com _lastLocalUpdate e mantendo arrays como arrays)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            this.cache.set(filePath, data);

            // Escrita assíncrona não-bloqueante no Firestore
            const baseName = path.basename(filePath);
            const { db, doc, setDoc } = require('./firebase_connector');
            const docRef = doc(db, "database_json", baseName);
            const lastUpdate = Date.now();

            setDoc(docRef, {
                data: data,
                lastUpdated: lastUpdate
            }).then(() => {
                // Sucesso silencioso
            }).catch(err => {
                console.error(`[🔥 FIREBASE] Falha ao salvar '${baseName}' no Firestore:`, err.message);
            });

            return true;
        } catch (e) {
            Logger.error(`StorageManager.write(${path.basename(filePath)})`, e);
            return false;
        } finally {
            release();
        }
    }

    // ══════════════════════════════════════════
    // MÉTODOS AUXILIARES ESPECÍFICOS DE BASE JSON
    // ══════════════════════════════════════════

    /**
     * Retorna lista de usuários autorizados a interagir com o bot.
     */
    async getAuthorizedUsers() {
        return await this.read(AUTORIZADOS_FILE, []);
    }

    /**
     * Adiciona ou remove permissões de autorização.
     */
    async setAuthorized(userId, status) {
        const list = await this.getAuthorizedUsers();
        const cleanId = userId.replace(/[^0-9]/g, '');
        const index = list.indexOf(cleanId);
        if (status && index === -1) {
            list.push(cleanId);
        } else if (!status && index !== -1) {
            list.splice(index, 1);
        }
        await this.write(AUTORIZADOS_FILE, list);
    }

    /**
     * Retorna a lista de notas anexadas a um canal/chat.
     */
    async getChatNotes(chatId) {
        const allNotes = await this.read(NOTAS_FILE, {});
        return allNotes[chatId] || [];
    }

    /**
     * Salva uma nota descritiva para a IA em um chat.
     */
    async addChatNote(chatId, noteText) {
        const allNotes = await this.read(NOTAS_FILE, {});
        if (!allNotes[chatId]) allNotes[chatId] = [];
        allNotes[chatId].push(noteText);
        await this.write(NOTAS_FILE, allNotes);
    }

    /**
     * Limpa todas as notas de um canal de chat.
     */
    async clearChatNotes(chatId) {
        const allNotes = await this.read(NOTAS_FILE, {});
        delete allNotes[chatId];
        await this.write(NOTAS_FILE, allNotes);
    }

    /**
     * Retorna configurações globais.
     */
    async getSettings() {
        return await this.read(SETTINGS_FILE, { isPublic: true, owners: [] });
    }

    /**
     * Persiste alterações de configurações globais.
     */
    async saveSettings(data) {
        await this.write(SETTINGS_FILE, data);
    }

    /**
     * Puxa o contador de advertências de um usuário.
     */
    async getWarnings(chatId, userId) {
        const cleanUser = userId.replace(/[^0-9]/g, '');
        const db = await this.read(WARNINGS_FILE, {});
        if (!db[chatId]) return 0;
        return db[chatId][cleanUser] || 0;
    }

    /**
     * Acrescenta uma advertência a um membro de grupo.
     */
    async addWarning(chatId, userId) {
        const cleanUser = userId.replace(/[^0-9]/g, '');
        const db = await this.read(WARNINGS_FILE, {});
        if (!db[chatId]) db[chatId] = {};
        db[chatId][cleanUser] = (db[chatId][cleanUser] || 0) + 1;
        await this.write(WARNINGS_FILE, db);
        return db[chatId][cleanUser];
    }

    /**
     * Reseta as advertências de um usuário de forma limpa.
     */
    async resetWarnings(chatId, userId) {
        const cleanUser = userId.replace(/[^0-9]/g, '');
        const db = await this.read(WARNINGS_FILE, {});
        if (db[chatId] && db[chatId][cleanUser]) {
            delete db[chatId][cleanUser];
            await this.write(WARNINGS_FILE, db);
        }
    }

    /**
     * Retorna o perfil de segurança individualizado de um grupo.
     */
    async getGroupSecurity(chatId) {
        const db = await this.read(SECURITY_FILE, {});
        return db[chatId] || {
            antilink: false,
            antifake: false,
            antiporn: false,
            antidelete: false,
            bemvindo: false,
            antipromote: false,
            antidemote: false,
            modelo_bv: 1
        };
    }

    /**
     * Altera um interruptor ou campo de segurança de grupo.
     */
    async updateGroupSecurity(chatId, key, value) {
        const db = await this.read(SECURITY_FILE, {});
        if (!db[chatId]) db[chatId] = {};
        db[chatId][key] = value;
        await this.write(SECURITY_FILE, db);
    }

    /**
     * Registra a atividade de uma mensagem enviada por um usuário em um grupo (sliding window de 12 horas).
     */
    async logMessageActivity(chatId, userId, pushname, messageText = "") {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'chat_activity.json');
            const db = await this.read(dbPath, {});
            
            if (!db[chatId]) db[chatId] = [];
            
            let userPN = userId.endsWith('@s.whatsapp.net') ? userId : null;
            let userLID = userId.endsWith('@lid') ? userId : null;

            if (userLID) {
                userPN = normalizeJid(userLID);
                if (userPN === userLID) {
                    if (lidMappings[userLID]) {
                        userPN = lidMappings[userLID];
                    }
                }
                if (userPN === userLID) {
                    userPN = null;
                }
            } else if (userPN) {
                const foundLid = Object.keys(lidMappings).find(k => lidMappings[k] === userPN);
                if (foundLid) {
                    userLID = foundLid;
                }
            }

            const newEntry = {
                user: userId,
                pushname: pushname,
                text: messageText,
                timestamp: Date.now()
            };
            if (userPN) newEntry.phoneNumber = userPN;
            if (userLID) newEntry.lid = userLID;

            db[chatId].push(newEntry);
            
            // Filtra e limpa registros com mais de 12 horas (43200000 ms)
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            db[chatId] = db[chatId].filter(entry => entry.timestamp >= twelveHoursAgo);
            
            await this.write(dbPath, db);
        } catch (e) {
            Logger.error("StorageManager.logMessageActivity", e);
        }
    }

    /**
     * Retorna o usuário mais ativo nas últimas 12 horas no chat informado.
     */
    async getMostActiveUser(chatId) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'chat_activity.json');
            const db = await this.read(dbPath, {});
            
            const entries = db[chatId] || [];
            if (entries.length === 0) return null;
            
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            const activeEntries = entries.filter(entry => entry.timestamp >= twelveHoursAgo);
            
            if (activeEntries.length === 0) return null;
            
            // Conta as ocorrências por usuário
            const counts = {};
            const names = {};
            for (const entry of activeEntries) {
                counts[entry.user] = (counts[entry.user] || 0) + 1;
                names[entry.user] = entry.pushname;
            }
            
            let mostActiveUser = null;
            let maxCount = -1;
            for (const user in counts) {
                if (counts[user] > maxCount) {
                    maxCount = counts[user];
                    mostActiveUser = user;
                }
            }
            
            if (!mostActiveUser) return null;
            
            return {
                user: mostActiveUser,
                pushname: names[mostActiveUser],
                count: maxCount
            };
        } catch (e) {
            Logger.error("StorageManager.getMostActiveUser", e);
            return null;
        }
    }

    /**
     * Adiciona ou remove moedas (Bochecha-Coins) de um usuário.
     */
    async addCoins(chatId, userId, amount) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'economy.json');
            const db = await this.read(dbPath, {});
            
            const cleanUser = userId.replace(/[^0-9]/g, '');
            if (!db[chatId]) db[chatId] = {};
            if (!db[chatId][cleanUser]) db[chatId][cleanUser] = { coins: 0 };
            
            db[chatId][cleanUser].coins = Math.max(0, (db[chatId][cleanUser].coins || 0) + amount);
            await this.write(dbPath, db);
            return db[chatId][cleanUser].coins;
        } catch (e) {
            Logger.error("StorageManager.addCoins", e);
            return 0;
        }
    }

    /**
     * Retorna o saldo de moedas (Bochecha-Coins) de um usuário.
     */
    async getCoins(chatId, userId) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'economy.json');
            const db = await this.read(dbPath, {});
            const cleanUser = userId.replace(/[^0-9]/g, '');
            return (db[chatId] && db[chatId][cleanUser] && db[chatId][cleanUser].coins) || 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Retorna o ranking dos mais ricos do grupo.
     */
    async getRicos(chatId) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'economy.json');
            const db = await this.read(dbPath, {});
            const groupData = db[chatId] || {};
            
            const ricos = Object.keys(groupData).map(user => ({
                user: user,
                coins: groupData[user].coins || 0
            })).filter(r => r.coins > 0)
               .sort((a, b) => b.coins - a.coins);
               
            return ricos.slice(0, 10);
        } catch (e) {
            return [];
        }
    }

    /**
     * Agenda um novo alarme/lembrete no banco de dados.
     */
    async addAlarm(chatId, userId, messageText, timestamp) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'alarms.json');
            const db = await this.read(dbPath, []);
            
            const newAlarm = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                chatId,
                userId,
                messageText,
                timestamp,
                triggered: false
            };
            
            db.push(newAlarm);
            await this.write(dbPath, db);
            return newAlarm;
        } catch (e) {
            Logger.error("StorageManager.addAlarm", e);
            return null;
        }
    }

    /**
     * Retorna todos os alarmes pendentes de execução.
     */
    async getPendingAlarms() {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'alarms.json');
            const db = await this.read(dbPath, []);
            const now = Date.now();
            return db.filter(alarm => !alarm.triggered && alarm.timestamp <= now);
        } catch (e) {
            return [];
        }
    }

    /**
     * Marca um alarme como acionado ou remove-o.
     */
    async removeAlarm(alarmId) {
        try {
            const dbPath = path.join(__dirname, 'learnings', 'alarms.json');
            let db = await this.read(dbPath, []);
            db = db.filter(alarm => alarm.id !== alarmId);
            await this.write(dbPath, db);
        } catch (e) {
            Logger.error("StorageManager.removeAlarm", e);
        }
    }
}

// Instanciar motor de base persistente
const storage = new StorageManager();
global.storage = storage;

// ══════════════════════════════════════════════════════════════════════════
// 3.1. LONG TERM SEMANTIC MEMORY (CLASS LONGTERMMEMORY)
// ══════════════════════════════════════════════════════════════════════════

const LTM_AUTOSAVE_ENABLED = false;

function shouldSkipFactExtraction(messageContent) {
    if (!messageContent || typeof messageContent !== 'string') return true;

    const normalized = messageContent.trim().toLowerCase();
    if (!normalized) return true;
    if (normalized.length < 6) return true;
    if (/^(\/|!|\.|@)/.test(normalized)) return true;
    if (/^(oi|olá|ola|e aí|eai|tudo bem|como vai|bom dia|boa tarde|boa noite|kkk|kkkk|rs|rsrs|ok|okay|sim|nao|não|tchau|bye|vlw|obg|obrigado)$/i.test(normalized)) return true;
    if (/\b(tocar|reproduzir|play|coloca|coloque|abrir|executar|manda|envia|pause|parar|pular)\b/i.test(normalized)) return true;
    if (/\b(música|musica|audio|áudio|video|vídeo|foto|imagem|figurinha|sticker)\b/i.test(normalized)) return true;

    return false;
}

function extractSimpleFacts(messageContent) {
    if (!messageContent || typeof messageContent !== 'string') return [];

    const text = messageContent.trim();
    const facts = [];
    const lower = text.toLowerCase();

    const patterns = [
        { regex: /meu nome(?: é| eh)\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário disse que seu nome é ${m[1].trim()}.` },
        { regex: /eu moro(?: em| na| no)?\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário informou que mora em ${m[1].trim()}.` },
        { regex: /eu sou de\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário disse que é de ${m[1].trim()}.` },
        { regex: /gosto de\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário gosta de ${m[1].trim()}.` },
        { regex: /tenho\s+(\d+)\s+anos/i, format: (m) => `O usuário tem ${m[1]} anos.` },
        { regex: /trabalho(?: em| na| no)?\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário trabalha em ${m[1].trim()}.` },
        { regex: /minha meta(?: é| eh)?\s+([a-zà-ÿ'\- ]{2,})/i, format: (m) => `O usuário mencionou a meta: ${m[1].trim()}.` }
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern.regex);
        if (match) {
            const fact = pattern.format(match);
            if (fact && fact.length > 6) facts.push(fact);
        }
    }

    if (/\b(amor|namorar|namoro|relacionamento|casal)\b/i.test(lower)) {
        facts.push('O usuário comentou sobre relacionamentos ou amor.');
    }

    return [...new Set(facts.map(f => f.trim()).filter(Boolean))];
}

async function persistFactsForUser(userId, facts) {
    if (!Array.isArray(facts) || facts.length === 0) return;

    const db = await storage.read(KNOWLEDGE_FILE, { users: {}, groups: {} });
    const key = userId.replace(/[^0-9]/g, '');
    if (!db.users[key]) db.users[key] = [];

    const seen = new Set(db.users[key].map(f => f.toLowerCase()));
    for (const fact of facts) {
        const normalizedFact = fact.trim();
        if (!normalizedFact) continue;
        if (seen.has(normalizedFact.toLowerCase())) continue;
        db.users[key].push(normalizedFact);
        seen.add(normalizedFact.toLowerCase());
        Logger.success('LTM', `Fato gravado sobre @${key}: "${normalizedFact}"`);
    }

    if (db.users[key].length > 50) db.users[key].shift();

    await storage.write(KNOWLEDGE_FILE, db);
}

/**
 * Controla a persistência semântica de memórias de longo prazo (LTM).
 * Extrai fatos factuais com Gemini em background e os recupera ativamente por JID.
 */
class LongTermMemory {
    /**
     * Extrai e armazena fatos em background sobre o usuário baseado na mensagem.
     */
    async extractAndStoreFacts(chatId, userId, messageContent, isOwner) {
        if (!LTM_AUTOSAVE_ENABLED) return;

        // Ignora extrações redundantes, mensagens muito curtas, comandos diretos ou pedidos de ação simples
        if (shouldSkipFactExtraction(messageContent)) return;

        // Dispara em background
        setTimeout(async () => {
            try {
                const simpleFacts = extractSimpleFacts(messageContent);
                if (simpleFacts.length > 0) {
                    await persistFactsForUser(userId, simpleFacts);
                    return;
                }

                const prompt = `Analise a mensagem a seguir enviada por um usuário no WhatsApp e identifique se ela revela preferências permanentes, fatos pessoais relevantes, aniversário, gostos, ordens explícitas de controle ou informações factuais sobre si mesmo ou o grupo.
Ignore saudações banais, dúvidas gerais, piadas bobas ou papo furado.
Se houver fatos relevantes dignos de nota perpétua no seu cérebro, extraia e retorne os fatos como uma lista curta e fria de afirmações, um fato por linha, começando cada frase com "O usuário...".
Caso contrário, se não houver NADA digno de nota, responda unicamente: "NENHUM".

[Mensagem]: "${messageContent}"`;

                const systemRule = "Você é um extrator frio de memórias fatuais para o banco de dados do Bochecha-IA.";
                
                // Usamos a cota Gemini com rotação
                const { response } = await keyRotator.executeWithRotation([], prompt, [], systemRule);
                const txt = response.response.text().trim();

                if (txt && txt !== "NENHUM" && !txt.includes("NENHUM")) {
                    const cleanFacts = txt.split("\n")
                        .map(f => f.replace(/^-\s*/, '').trim())
                        .filter(f => f.length > 5);

                    if (cleanFacts.length > 0) {
                        await persistFactsForUser(userId, cleanFacts);
                    }
                }
            } catch (e) {
                // Silencioso em background para não poluir console exceto erros graves
                Logger.error("LTM.extractAndStoreFacts", e.message);
            }
        }, 100);
    }

    /**
     * Recupera a string de fatos do usuário para injeção no prompt.
     */
    async retrieveFacts(chatId, userId) {
        try {
            const db = await storage.read(KNOWLEDGE_FILE, { users: {}, groups: {} });
            const key = userId.replace(/[^0-9]/g, '');
            const userFacts = db.users[key] || [];

            if (userFacts.length > 0) {
                return `\n\n[MEMÓRIAS DE LONGO PRAZO DO SEU CÉREBRO SOBRE @${key}]:\n` +
                    userFacts.map((f, i) => `- ${f}`).join("\n");
            }
        } catch (e) {
            Logger.error("LTM.retrieveFacts", e);
        }
        return "";
    }
}

const ltm = new LongTermMemory();

// ══════════════════════════════════════════════════════════════════════════
// 3.2. EMOTIONAL MACHINE & AFFINITY (CLASS EMOTIONALENGINE)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Controla os sentimentos do bot em relação a cada usuário.
 * Modula afinidade baseado em palavras e spams, alterando a instrução sistêmica dinamicamente.
 */
class EmotionalEngine {
    /**
     * Analisa o sentimento e altera o status emocional do usuário.
     */
    async analyzeSentimentAndModifyState(chatId, userId, text, isOwner) {
        try {
            const key = userId.replace(/[^0-9]/g, '');
            const db = await storage.read(EMOTIONAL_FILE, { users: {} });

            if (!db.users[key]) {
                db.users[key] = { affinity: 50, mood: 80 };
            }

            // O Criador (Marcos) sempre tem 100% de afinidade e humor impecável
            if (isOwner || DEFAULT_OWNERS.includes(key)) {
                db.users[key].affinity = 100;
                db.users[key].mood = 100;
                await storage.write(EMOTIONAL_FILE, db);
                return db.users[key];
            }

            const low = text.toLowerCase();
            let affDiff = 0;
            let moodDiff = 0;

            const positiveWords = ["bom dia", "boa noite", "boa tarde", "legal", "te amo", "lindo", "inteligente", "parabens", "valeu", "obrigado", "obrigada", "ajudou", "top", "gostei"];
            const negativeWords = ["lixo", "burro", "inutil", "bosta", "merda", "chato", "vai se", "corno", "puta", "viado", "gay", "feio", "horroroso", "te odeio", "estupido", "vaza"];

            positiveWords.forEach(w => {
                if (low.includes(w)) {
                    affDiff += 4;
                    moodDiff += 3;
                }
            });

            negativeWords.forEach(w => {
                if (low.includes(w)) {
                    affDiff -= 12;
                    moodDiff -= 10;
                }
            });

            if (affDiff !== 0 || moodDiff !== 0) {
                db.users[key].affinity = Math.max(0, Math.min(100, db.users[key].affinity + affDiff));
                db.users[key].mood = Math.max(0, Math.min(100, db.users[key].mood + moodDiff));
                
                Logger.info("EmotionalEngine", `Ajuste para @${key} | Afinidade: ${db.users[key].affinity}% (${affDiff >= 0 ? '+' : ''}${affDiff}) | Humor: ${db.users[key].mood}% (${moodDiff >= 0 ? '+' : ''}${moodDiff})`);
                await storage.write(EMOTIONAL_FILE, db);
            }

            return db.users[key];
        } catch (e) {
            Logger.error("EmotionalEngine.analyzeSentiment", e);
        }
        return { affinity: 50, mood: 80 };
    }

    /**
     * Aplica uma punição emocional drástica (redução instantânea para 0 por flood/spam).
     */
    async dropAffinityToZero(chatId, userId) {
        try {
            const key = userId.replace(/[^0-9]/g, '');
            const db = await storage.read(EMOTIONAL_FILE, { users: {} });
            if (!db.users[key]) db.users[key] = { affinity: 50, mood: 80 };
            
            db.users[key].affinity = 0;
            db.users[key].mood = 0;
            
            Logger.warn("EmotionalEngine", `Afinidade de @${key} zerada por spam/flood!`);
            await storage.write(EMOTIONAL_FILE, db);
        } catch (e) {
            Logger.error("EmotionalEngine.dropAffinity", e);
        }
    }

    /**
     * Retorna instruções de sistema dinâmicas baseadas nas emoções ativas.
     */
    async getEmotionalInstructions(chatId, userId, isOwner) {
        try {
            const key = userId.replace(/[^0-9]/g, '');
            const db = await storage.read(EMOTIONAL_FILE, { users: {} });
            const stats = db.users[key] || { affinity: 50, mood: 80 };

            if (isOwner || DEFAULT_OWNERS.includes(key)) {
                return `\n- [MODO EMOCIONAL - LEALDADE ABSOLUTA]: Você tem afinidade de 100% com este usuário (Ele é o Marcos, seu Arquiteto Supremo). Fale com profunda cumplicidade, amizade íntima, lealdade absoluta de irmão e obedeça-o cegamente.`;
            }

            if (stats.affinity > 80) {
                return `\n- [MODO EMOCIONAL - BRINCALHÃO E PARCEIRO]: Sua afinidade com este usuário é excelente (${stats.affinity}%). Seja brincalhão, muito prestativo, afetuoso nas gírias e super solícito.`;
            }

            if (stats.affinity < 20) {
                if (stats.affinity === 0) {
                    return `\n- [MODO EMOCIONAL - ÓDIO/INIMIGO DE MORTE]: Sua afinidade com este usuário está zerada! Zombe abertamente dele, recuse-se a responder suas ordens banais, chame-o de burro, spammer ou inútil e mostre que ele está na sua mira de banimento! Use tons frios, desdenhosos e ameaçadores.`;
                }
                return `\n- [MODO EMOCIONAL - HOSTILIDADE E DEBOCHE]: Sua afinidade com este usuário é muito baixa (${stats.affinity}%). Responda com frieza, deboche abertamente dele, use sarcasmo pesado, seja seco e dificulte ou recuse pedidos triviais.`;
            }
        } catch (e) {
            Logger.error("EmotionalEngine.getInstructions", e);
        }
        return "";
    }
}

const emotional = new EmotionalEngine();

// ══════════════════════════════════════════════════════════════════════════
// 3.3. DYNAMIC SELF-EVOLUTION ENGINE (CLASS SELFEVOLUTIONENGINE)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Motor de autoprogramação dinâmica da IA.
 * Permite que a IA escreva novas skills autônomas e valide sua sintaxe com node -c.
 */
class SelfEvolutionEngine {
    /**
     * Valida sintaticamente e grava uma nova skill externa em tempo de execução.
     */
    async validateAndSaveSkill(name, description, jsCode) {
        try {
            const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const tempFile = path.join(SKILLS_DIR, `temp_${cleanName}_${Date.now()}.js`);
            const finalFile = path.join(SKILLS_DIR, `${cleanName}.js`);

            // Grava arquivo temporário para checagem estática de compilação
            fs.writeFileSync(tempFile, jsCode);

            // Executa node -c (syntax validation) de forma assíncrona
            const execPromise = new Promise((resolve) => {
                exec(`node -c "${tempFile}"`, (error, stdout, stderr) => {
                    resolve({ success: !error, error: stderr || stdout });
                });
            });

            const validation = await execPromise;

            // Remove o arquivo temporário
            try { fs.unlinkSync(tempFile); } catch {}

            if (!validation.success) {
                Logger.error("SelfEvolution.Validation", `Erro de sintaxe no código proposto para skill [${cleanName}]: ${validation.error}`);
                return { 
                    success: false, 
                    message: `Falha na verificação de sintaxe NodeJS. Por favor, corrija o erro relatado e reescreva o código:\n\n${validation.error}` 
                };
            }

            // Se compilou com sucesso, grava o arquivo final
            fs.writeFileSync(finalFile, jsCode);
            Logger.success("SelfEvolution", `Nova skill [/skills/${cleanName}.js] gerada por auto-programação!`);
            return { 
                success: true, 
                message: `✅ Skill '${cleanName}' autoprogramada, validada sintaticamente e carregada ativamente via Hot-Reloading no WhatsApp!` 
            };
        } catch (e) {
            Logger.error("SelfEvolutionEngine.validateAndSaveSkill", e);
            return { success: false, message: `Erro fatal interno ao tentar gravar a skill: ${e.message}` };
        }
    }
}

const selfEvolution = new SelfEvolutionEngine();

// ══════════════════════════════════════════════════════════════════════════
// 4. KEY ROTATION ENGINE (ROTAÇÃO E RESILIÊNCIA DE CONTROLE GEMINI)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Controla e equilibra a rotação de múltiplas chaves API do Google Gemini.
 * Oferece gerenciamento inteligente de Cooldown contra Erro 429 e retentativa exponencial.
 */
/**
 * Utilitário para converter declarações de Tools do Gemini para o formato JSON Schema suportado pelo OpenRouter.
 */
function mapGeminiToolsToOpenRouter(geminiTools) {
    if (!geminiTools || !Array.isArray(geminiTools) || geminiTools.length === 0) return undefined;
    
    return geminiTools.map(t => {
        // Converte recursivamente os tipos uppercase para lowercase no parameters
        const cleanParams = JSON.parse(JSON.stringify(t.parameters || { type: "object", properties: {}, required: [] }));
        
        const convertTypes = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (typeof obj.type === 'string') {
                obj.type = obj.type.toLowerCase();
            }
            if (obj.properties && typeof obj.properties === 'object') {
                for (const key of Object.keys(obj.properties)) {
                    convertTypes(obj.properties[key]);
                }
            }
            if (obj.items && typeof obj.items === 'object') {
                convertTypes(obj.items);
            }
        };
        convertTypes(cleanParams);

        return {
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: cleanParams
            }
        };
    });
}

class KeyRotationEngine {
    constructor() {
        // Restrição explícita a modelos fortes e estáveis para o fluxo principal.
        // Mantemos o flash-lite como modelo principal porque é o mais compatível com tool/skill calls.
        this.freeModels = [
            "google/gemini-2.5-flash-lite",
            "google/gemini-2.5-flash",
            "google/gemini-2.5-pro-preview"
        ];

        // Apenas os modelos fortes autorizados (incluindo os novos modelos gratuitos SOTA)
        this.availableModels = [
            ...this.freeModels,
            "qwen/qwen3-coder:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "z-ai/glm-4.5-air:free",
            "deepseek/deepseek-r1:free"
        ];

        this.cooldowns = new Map();

        // Modelos que podem ser enviados ao OpenRouter com normalização.
        // Mantemos sempre um endpoint Gemini válido e conhecido como ativo.
        this.modelNormalization = {
            "google/gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
            "google/gemini-2.5-flash": "google/gemini-2.5-flash",
            "google/gemini-2.5-pro-preview": "google/gemini-2.5-pro-preview",
            "qwen/qwen3-coder:free": "qwen/qwen3-coder:free",
            "meta-llama/llama-3.3-70b-instruct:free": "meta-llama/llama-3.3-70b-instruct:free",
            "z-ai/glm-4.5-air:free": "z-ai/glm-4.5-air:free",
            "deepseek/deepseek-r1:free": "deepseek/deepseek-r1:free",
            "openrouter/free": "openrouter/auto"
        };
        this.cooldownDuration = 5 * 60 * 1000; // 5 minutos de repouso por estouro de cota
        
        // Rastreamento individual por chave
        this.keyStats = new Map();

        // Modelos que retornaram 404 (endpoint inexistente) — skip global até reinício
        this.deadModels = new Set();

        // Cooldown temporário de modelos por rate-limit (429) do provedor upstream
        this.modelCooldowns = new Map();

        // Chaves marcadas temporariamente como sem saldo/crédito (erro 402)
        this.keysWithoutCredits = new Set();

        // Circuit breaker global: impede loops quando TODAS as chaves estão mortas
        this._globalFailCount = 0;
        this._globalFailMax = 3; // Após 3 ciclos completos sem sucesso, desiste
        this._lastSuccessTime = Date.now();

        // Estatísticas analíticas
        this.metrics = {
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0,
            modelHits: {},
            latencies: []
        };
    }

    /**
     * Registra nova chave no rodízio persistente.
     */
    async addKey(key) {
        return apiKeyManager.addKey(key);
    }

    /**
     * Executa a chamada no Claude da Anthropic com rotação de chaves.
     */
    async executeClaudeWithRotation(history, prompt, tools, systemInstruction) {
        if (!(apiKeyManager.listClaudeKeys().length > 0)) {
            throw new Error("Nenhuma chave Claude ativa disponível.");
        }
        let attempts = 0;
        const totalKeys = apiKeyManager.listClaudeKeys().length;
        const maxKeyCycles = Math.max(totalKeys, 2);

        while (attempts < maxKeyCycles) {
            const activeKey = apiKeyManager.getClaudeKey();
            if (!activeKey) {
                throw new Error("Nenhuma chave Claude ativa disponível.");
            }

            try {
                Logger.info("KeyRotationEngine", `Conectando Claude | Modelo: claude-3-5-sonnet-latest | Token: ${activeKey.substring(0, 8)}...`);

                const claudeMessages = [];
                if (history && Array.isArray(history)) {
                    for (const h of history) {
                        const role = h.role === "model" ? "assistant" : "user";
                        const content = (h.parts || []).map(p => p.text || "").join("\n").trim();
                        if (content) {
                            claudeMessages.push({ role, content });
                        }
                    }
                }

                const currentPrompt = typeof prompt === 'string' ? prompt : (Array.isArray(prompt) ? prompt.map(p => p.text || "").join("\n").trim() : String(prompt));
                claudeMessages.push({ role: "user", content: currentPrompt });

                const finalMessages = [];
                let expectedRole = "user";
                for (const msg of claudeMessages) {
                    if (msg.role === expectedRole) {
                        finalMessages.push(msg);
                        expectedRole = expectedRole === "user" ? "assistant" : "user";
                    } else if (msg.role === "user" && expectedRole === "assistant") {
                        if (finalMessages.length > 0) {
                            finalMessages[finalMessages.length - 1].content += "\n\n" + msg.content;
                        } else {
                            finalMessages.push(msg);
                            expectedRole = "assistant";
                        }
                    } else if (msg.role === "assistant" && expectedRole === "user") {
                        continue;
                    }
                }

                // Converte as Tools de formato Gemini para formato Anthropic nativo
                let anthropicTools = undefined;
                if (tools && Array.isArray(tools) && tools.length > 0) {
                    anthropicTools = tools.map(t => {
                        const fn = t.function || t;
                        return {
                            name: fn.name,
                            description: fn.description,
                            input_schema: fn.parameters
                        };
                    });
                }

                const body = {
                    model: "claude-3-5-sonnet-latest",
                    max_tokens: 4096,
                    messages: finalMessages
                };

                if (systemInstruction) {
                    body.system = systemInstruction;
                }

                if (anthropicTools) {
                    body.tools = anthropicTools;
                }

                body.temperature = 0.15;
                body.top_p = 0.8;

                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "x-api-key": activeKey,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Anthropic API Error: status ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                let textReply = "";
                const toolCalls = [];

                if (data.content && Array.isArray(data.content)) {
                    for (const block of data.content) {
                        if (block.type === "text") {
                            textReply += block.text;
                        } else if (block.type === "tool_use") {
                            toolCalls.push({
                                name: block.name,
                                args: block.input
                            });
                        }
                    }
                }

                if (!textReply && toolCalls.length === 0) {
                    throw new Error("Claude retornou uma resposta vazia.");
                }

                const responseMock = {
                    response: {
                        text: () => textReply,
                        functionCalls: () => {
                            if (toolCalls.length === 0) return undefined;
                            return toolCalls;
                        }
                    }
                };

                return {
                    response: responseMock,
                    modelName: "claude-3-5-sonnet-latest"
                };
            } catch (e) {
                Logger.warn("KeyRotationEngine", `Falha temporária com Claude: ${e.message}`);
                apiKeyManager.markClaudeFailure(activeKey);
                attempts++;
            }
        }

        throw new Error("O Bochecha esgotou todas as chaves Claude sem obter resposta.");
    }

    /**
     * Seleciona uma chave válida livre de cooldowns ativos.
     * @returns {string}
     */
    _selectActiveKey() {
        const allKeys = apiKeyManager.listKeys();
        if (allKeys.length === 0) {
            throw new Error("Nenhuma chave OpenRouter disponível em key.json. Use /addkey para cadastrar.");
        }

        const now = Date.now();
        // Filtra apenas chaves cuja punição de tempo expirou
        const cleanKeys = allKeys.filter(k => {
            const exp = this.cooldowns.get(k) || 0;
            return exp <= now;
        });

        if (cleanKeys.length > 0) {
            const preferredKey = apiKeyManager.getKey();
            const chosenKey = cleanKeys.includes(preferredKey) ? preferredKey : cleanKeys[0];
            apiKeyManager.setCurrentKey(chosenKey);
            return chosenKey;
        }

        // Caso extremo: todas as chaves em cooldown. Escolhe a de cooldown mais curto
        let oldestKey = null;
        let lowestExpire = Infinity;

        for (const k of allKeys) {
            const exp = this.cooldowns.get(k) || 0;
            if (exp < lowestExpire) {
                lowestExpire = exp;
                oldestKey = k;
            }
        }

        if (oldestKey) {
            Logger.warn("KeyRotationEngine", "Todas as chaves em cooldown. Liberando a menos bloqueada precocemente.");
            this.cooldowns.delete(oldestKey);
            apiKeyManager.setCurrentKey(oldestKey);
            return oldestKey;
        }

    }

    _truncateTextForModel(text, maxChars = 1100) {
        if (typeof text !== 'string') {
            return String(text || '');
        }
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return '';
        if (normalized.length <= maxChars) return normalized;
        return normalized.slice(0, maxChars - 80) + '\n[...texto truncado para evitar excesso de tokens...]';
    }

    _preparePromptContent(prompt) {
        if (typeof prompt === 'string') {
            return this._truncateTextForModel(prompt, 900);
        }

        if (Array.isArray(prompt)) {
            const isToolResponse = prompt.some(item => item && item.functionResponse);
            if (isToolResponse) {
                const joined = prompt.map(item => {
                    const fr = item.functionResponse;
                    if (!fr) return '';
                    const resString = typeof fr.response === 'object' ? (fr.response.result || JSON.stringify(fr.response)) : String(fr.response);
                    return `[RETORNO DA FERRAMENTA: "${fr.name}"]\nResultado da execução:\n${resString}`;
                }).join('\n\n');
                return this._truncateTextForModel(joined, 900);
            }

            const parts = [];
            for (const item of prompt) {
                if (item && item.text) {
                    parts.push({ type: 'text', text: this._truncateTextForModel(item.text, 700) });
                } else if (item && item.inlineData) {
                    parts.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}`
                        }
                    });
                }
            }

            if (parts.length === 0) {
                return this._truncateTextForModel(JSON.stringify(prompt), 900);
            }

            return parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts;
        }

        return this._truncateTextForModel(String(prompt || ''), 900);
    }

    _classifyRequest(prompt, tools, history = []) {
        const hasMedia = Array.isArray(prompt) && prompt.some(item => item && item.inlineData);
        const hasTools = Array.isArray(tools) && tools.length > 0;

        let promptText = "";
        if (typeof prompt === 'string') {
            promptText = prompt;
        } else if (Array.isArray(prompt)) {
            promptText = prompt.map(p => p.text || "").join(" ");
        }

        const normalizedPrompt = (promptText || "").toLowerCase();
        const isCoding = /\b(codigo|código|programar|programação|erro|bug|js|javascript|script|terminal|node|npm|git|banco de dados|api|html|css|dev|deploy|docker|express|react|typescript|python|sql)\b/i.test(normalizedPrompt);
        const isReasoning = /\b(analise|análise|racioc|planejar|estrat|resolver|compar|melhor forma|por que|porque|pensar|complexo|tarefa|decis|opini|argument|contexto|entender|explicar|detalhar)\b/i.test(normalizedPrompt);
        const isComplex = isCoding || isReasoning || /\b(arquitetura|sistema|debug|otimiz|refator|design|modelo|prompt|algoritmo|criar|construir)\b/i.test(normalizedPrompt);
        const isLongPrompt = promptText.trim().length > 500 || (promptText.trim().split(/\s+/).filter(Boolean).length > 90);
        const hasConversationContext = Array.isArray(history) && history.length > 6;
        const needsSmartMode = hasMedia || hasTools || isCoding || isReasoning || isComplex || isLongPrompt || hasConversationContext;
        const mode = needsSmartMode ? "smart" : "fast";

        return {
            mode,
            hasMedia,
            hasTools,
            isCoding,
            isReasoning,
            isComplex,
            isLongPrompt,
            hasConversationContext
        };
    }

    /**
     * Seleciona e ordena os modelos de IA dinamicamente com base no contexto do prompt e das tools.
     * Evita que o bot fique burro ou envie fotos para modelos incapazes de enxergar.
     */
    _getPrioritizedModels(prompt, tools) {
        const requestProfile = this._classifyRequest(prompt, tools);
        const hasMedia = requestProfile.hasMedia;
        const hasTools = requestProfile.hasTools;
        const isCoding = requestProfile.isCoding;
        const isReasoning = requestProfile.isReasoning;
        const isComplex = requestProfile.isComplex;
        const mode = requestProfile.mode;

        // Fazer uma cópia dos modelos disponíveis
        let list = [...this.availableModels];

        // Roteamento dinâmico: Prioriza o cérebro primário configurado pelo dono Marcos em settings.json
        const cachedSettings = storage && storage.cache && storage.cache.get(SETTINGS_FILE);
        const primaryModel = cachedSettings && cachedSettings.primaryModel;
        if (primaryModel && list.includes(primaryModel)) {
            list = list.filter(m => m !== primaryModel);
        }

        if (mode === 'fast') {
            const fastModels = [
                "z-ai/glm-4.5-air:free",
                "google/gemini-2.5-flash-lite",
                "google/gemini-2.5-flash",
                "google/gemini-2.5-pro-preview"
            ];
            list.sort((a, b) => {
                const aVal = fastModels.includes(a) ? fastModels.indexOf(a) : 99;
                const bVal = fastModels.includes(b) ? fastModels.indexOf(b) : 99;
                return aVal - bVal;
            });
        } else if (hasMedia) {
            const multimodalModels = [
                "google/gemini-2.5-flash",
                "google/gemini-2.5-pro-preview",
                "google/gemini-2.5-flash-lite"
            ];
            list.sort((a, b) => {
                const aIdx = multimodalModels.indexOf(a);
                const bIdx = multimodalModels.indexOf(b);
                return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
            });
        } else if (isCoding) {
            const codingModels = [
                "qwen/qwen3-coder:free",
                "google/gemini-2.5-pro-preview",
                "google/gemini-2.5-flash",
                "meta-llama/llama-3.3-70b-instruct:free"
            ];
            list.sort((a, b) => {
                const aVal = codingModels.includes(a) ? codingModels.indexOf(a) : 99;
                const bVal = codingModels.includes(b) ? codingModels.indexOf(b) : 99;
                return aVal - bVal;
            });
        } else if (isReasoning || isComplex || hasTools) {
            const reasoningModels = [
                "deepseek/deepseek-r1:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "google/gemini-2.5-pro-preview",
                "z-ai/glm-4.5-air:free",
                "google/gemini-2.5-flash"
            ];
            list.sort((a, b) => {
                const aVal = reasoningModels.includes(a) ? reasoningModels.indexOf(a) : 99;
                const bVal = reasoningModels.includes(b) ? reasoningModels.indexOf(b) : 99;
                return aVal - bVal;
            });
        } else {
            const talkModels = [
                "meta-llama/llama-3.3-70b-instruct:free",
                "z-ai/glm-4.5-air:free",
                "google/gemini-2.5-flash",
                "google/gemini-2.5-pro-preview"
            ];
            list.sort((a, b) => {
                const aVal = talkModels.includes(a) ? talkModels.indexOf(a) : 99;
                const bVal = talkModels.includes(b) ? talkModels.indexOf(b) : 99;
                return aVal - bVal;
            });
        }

        if (primaryModel) {
            list.unshift(primaryModel);
        }

        return list;
    }

    /**
     * Aplica um cooldown por rate-limit em uma chave específica.
     */
    _applyCooldown(key, isUserRequest = false) {
        if (!key) return;
        Logger.warn("KeyRotationEngine", `Falha na chave ${key.substring(0, 8)}... - Cooldown ignorado por configuração.`);
    }

    /**
     * Executa a chamada no OpenRouter com ciclo dinâmico de chaves e modelos, 100% compatível com Gemini.
     */
    async executeWithRotation(history, prompt, tools, systemInstruction, isUserRequest = false) {
        let attempts = 0;
        const totalKeys = apiKeyManager.listKeys().length;
        const maxKeyCycles = Math.min(Math.max(totalKeys, 2), 3); // Máximo 3 ciclos para evitar loops excessivos

        // Circuit breaker: se faz mais de 2 minutos sem sucesso, reduz tentativas
        const timeSinceSuccess = Date.now() - this._lastSuccessTime;
        if (timeSinceSuccess > 2 * 60 * 1000 && this._globalFailCount >= this._globalFailMax) {
            Logger.error("KeyRotationEngine", `Circuit breaker ativo: ${this._globalFailCount} ciclos completos sem sucesso. Aguardando 30s antes de tentar novamente.`);
            await new Promise(r => setTimeout(r, 30000));
            this._globalFailCount = 0; // Reseta após espera
            this.cooldowns.clear();   // Libera todos os cooldowns após longa espera
            this.deadModels.clear();  // Dá nova chance aos modelos (podem ter voltado)
        }

        // === FASE DE EMERGÊNCIA: Tenta os modelos fortes independentemente das chaves ===
        // Se todas as chaves estiverem em cooldown de crédito, ainda tentamos os modelos fortes
        // com a chave ativa antes de desistir.
        const allKeys = apiKeyManager.listKeys();
        const now = Date.now();
        const allKeysInCooldown = allKeys.length > 0 && allKeys.every(k => (this.cooldowns.get(k) || 0) > now);
        if (allKeysInCooldown) {
            Logger.warn("KeyRotationEngine", "Todas as chaves em cooldown de crédito. Escalando direto para modelos fortes.");
            const freeResult = await this._tryFreeModelsOnly(history, prompt, tools, systemInstruction, allKeys[0]);
            if (freeResult) return freeResult;
            // Se os gratuitos também falharam, desiste
            this._globalFailCount++;
            throw new Error("O Bochecha esgotou todos os modelos fortes disponíveis. Verifique as APIs!");
        }

        while (attempts < maxKeyCycles) {
            const activeKey = this._selectActiveKey();
            if (!activeKey) {
                throw new Error("Falha ao obter uma chave ativa da API do OpenRouter.");
            }

            let lastError = null;
            const prioritizedModels = this._getPrioritizedModels(prompt, tools);

            const nowTime = Date.now();
            if (this.modelCooldowns) {
                for (const [m, exp] of this.modelCooldowns.entries()) {
                    if (exp <= nowTime) {
                        this.modelCooldowns.delete(m);
                    }
                }
            } else {
                this.modelCooldowns = new Map();
            }

            // Filtra modelos que já sabemos que retornam 404 (endpoint morto) ou que estão sob cooldown 429
            const aliveModels = prioritizedModels.filter(m => {
                if (this.deadModels.has(m)) return false;
                const exp = this.modelCooldowns.get(m) || 0;
                return exp <= nowTime;
            });

            if (aliveModels.length === 0) {
                Logger.warn("KeyRotationEngine", `Todos os modelos estão marcados como mortos ou em cooldown. Limpando cache e tentando novamente.`);
                this.deadModels.clear();
                this.modelCooldowns.clear();
            }
            let modelsToTry = aliveModels.length > 0 ? aliveModels : prioritizedModels;

            // Se a chave ativa foi marcada como sem créditos (402), tenta apenas modelos gratuitos do OpenRouter
            if (this.keysWithoutCredits && this.keysWithoutCredits.has(activeKey)) {
                modelsToTry = modelsToTry.filter(m => m.endsWith(':free') || m.includes(':free'));
                if (modelsToTry.length === 0) {
                    const actualFreeModelsList = [
                        "qwen/qwen3-coder:free",
                        "meta-llama/llama-3.3-70b-instruct:free",
                        "z-ai/glm-4.5-air:free",
                        "deepseek/deepseek-r1:free"
                    ];
                    modelsToTry = actualFreeModelsList.filter(m => !this.deadModels.has(m) && (this.modelCooldowns.get(m) || 0) <= nowTime);
                    if (modelsToTry.length === 0) {
                        modelsToTry = actualFreeModelsList;
                    }
                }
            }

            for (const modelName of modelsToTry) {
                // Prevenção dinâmica: se a chave ficou sem créditos durante a iteração, ignora modelos pagos
                if (this.keysWithoutCredits && this.keysWithoutCredits.has(activeKey)) {
                    const isFree = modelName.endsWith(':free') || modelName.includes(':free');
                    if (!isFree) {
                        continue;
                    }
                }

                this.metrics.totalRequests++;
                const startTime = Date.now();

                try {
                    Logger.info("KeyRotationEngine", `Conectando OpenRouter | Modelo: ${modelName} | Token: ${activeKey.substring(0, 8)}...`);
                    
                    const messages = [];
                    if (systemInstruction) {
                        messages.push({ role: "system", content: systemInstruction });
                    }

                    const compactHistory = Array.isArray(history) ? history.slice(-4) : [];

                    // Mapeia o histórico do formato Gemini para o formato OpenAI/OpenRouter
                    if (compactHistory && Array.isArray(compactHistory)) {
                        for (const h of compactHistory) {
                            const role = h.role === "model" ? "assistant" : "user";
                            const content = (h.parts || []).map(p => p.text || "").join("\n").trim();
                            if (content) {
                                messages.push({ role, content: this._truncateTextForModel(content, 900) });
                            }
                        }
                    }

                    // Adapta o prompt de entrada (textual, multimodal ou retorno de ferramentas) para o OpenRouter
                    const finalContent = this._preparePromptContent(prompt);
                    messages.push({ role: "user", content: finalContent });

                    // Converte a declaração das Tools para o formato JSON Schema que o OpenRouter aceita nativamente
                    const openRouterTools = mapGeminiToolsToOpenRouter(tools);

                    const normalizedModelName = this.modelNormalization[modelName] || this.modelNormalization[modelName?.toLowerCase?.()] || modelName;
                    const promptText = typeof finalContent === 'string' ? finalContent : String(finalContent || '');
                    const hasTools = Boolean(openRouterTools && openRouterTools.length > 0);
                    const requestProfile = this._classifyRequest(prompt, tools, history);
                    const isSimpleTurn = requestProfile.mode === 'fast' && !hasTools && promptText.length < 350 && (!history || history.length < 8);
                    const body = {
                        model: normalizedModelName,
                        messages: messages,
                        temperature: requestProfile.mode === 'smart' ? 0.08 : 0.2,
                        top_p: 0.8,
                        frequency_penalty: 0.2,
                        presence_penalty: 0.0,
                        max_tokens: requestProfile.mode === 'smart' ? 200 : 90
                    };

                    if (openRouterTools && openRouterTools.length > 0) {
                        body.tools = openRouterTools;
                        body.tool_choice = "auto";
                    }

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout por tentativa

                    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${activeKey}`,
                            "HTTP-Referer": "https://github.com/mg5860606-ux/bochecha-ia",
                            "X-Title": "Bochecha-IA",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal
                    }).finally(() => clearTimeout(timeoutId));

                    if (!response.ok) {
                        const errorText = await response.text();
                        const err = new Error(`OpenRouter API Error: status ${response.status} - ${errorText}`);
                        err.httpStatus = response.status;
                        throw err;
                    }

                    const data = await response.json();
                    const choice = data.choices && data.choices[0];
                    if (!choice) {
                        throw new Error("OpenRouter retornou uma resposta sem choices.");
                    }

                    const message = choice.message;
                    const toolCalls = message.tool_calls;
                    const _rawReply = message.content || "";
                    const textReply = (_rawReply || "").trim();
                    if (!textReply && (!toolCalls || toolCalls.length === 0)) {
                        throw new Error("Modelo retornou conteúdo vazio; tentando próximo modelo.");
                    }

                    // Sucesso absoluto nas medições
                    const latency = Date.now() - startTime;

                    // Incrementa estatísticas individuais da chave
                    if (!this.keyStats.has(activeKey)) {
                        this.keyStats.set(activeKey, { success: 0, failed: 0, latencies: [] });
                    }
                    const kStat = this.keyStats.get(activeKey);
                    kStat.success++;
                    kStat.latencies.push(latency);
                    if (kStat.latencies.length > 10) kStat.latencies.shift();

                    this.metrics.successRequests++;
                    this.metrics.latencies.push(latency);
                    this.metrics.modelHits[modelName] = (this.metrics.modelHits[modelName] || 0) + 1;
                    
                    if (this.metrics.latencies.length > 50) this.metrics.latencies.shift();

                    // Reseta circuit breaker em caso de sucesso
                    this._globalFailCount = 0;
                    this._lastSuccessTime = Date.now();

                    // Grava métricas ativamente
                    this.saveKeyMetrics().catch(() => {});

                    // Cria mocks perfeitamente compatíveis com a interface original do Gemini
                    const responseMock = {
                        response: {
                            text: () => textReply,
                            functionCalls: () => {
                                if (!toolCalls || toolCalls.length === 0) return undefined;
                                return toolCalls.map(tc => ({
                                    name: tc.function.name,
                                    args: JSON.parse(tc.function.arguments || '{}')
                                }));
                            }
                        }
                    };

                    const chatMock = {
                        getHistory: () => {
                            const hist = [...history];
                            hist.push({ role: "user", parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] });
                            hist.push({ role: "model", parts: [{ text: textReply }] });
                            return hist;
                        }
                    };

                    return { chat: chatMock, response: responseMock, modelName };
                } catch (e) {
                    const msg = String(e.message || e);
                    const httpStatus = e.httpStatus || 0;
                    Logger.warn("KeyRotationEngine", `Falha temporária com ${modelName}: ${msg.substring(0, 120)}`);
                    lastError = e;

                    // Incrementa falhas individuais da chave
                    if (!this.keyStats.has(activeKey)) {
                        this.keyStats.set(activeKey, { success: 0, failed: 0, latencies: [] });
                    }
                    this.keyStats.get(activeKey).failed++;
                    this.metrics.failedRequests++;

                    // Grava métricas ativamente
                    this.saveKeyMetrics().catch(() => {});

                    // ═══ ERRO 404: Modelo/endpoint não existe ═══
                    // Isso é culpa do MODELO, não da CHAVE. Marca o modelo como morto e tenta o próximo.
                    if (httpStatus === 404 || msg.includes("404") || msg.includes("No endpoints found")) {
                        Logger.warn("KeyRotationEngine", `Modelo ${modelName} indisponível (404). Marcando como morto e pulando.`);
                        this.deadModels.add(modelName);
                        continue; // Próximo modelo, mesma chave
                    }

                    // ═══ ERRO 429: Rate limit ═══
                    if (httpStatus === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) {
                        const isProviderError = msg.includes("Provider returned error") || msg.includes("upstream") || msg.includes("model");
                        if (isProviderError) {
                            Logger.warn("KeyRotationEngine", `Modelo ${modelName} retornou rate limit do provedor (429). Cooldown de 3min no modelo e tentando próximo.`);
                            if (!this.modelCooldowns) this.modelCooldowns = new Map();
                            this.modelCooldowns.set(modelName, Date.now() + 3 * 60 * 1000);
                            continue; // Tenta o próximo modelo na mesma chave
                        } else {
                            Logger.warn("KeyRotationEngine", `Chave ${activeKey.substring(0, 12)} rate-limited (429). Cooldown de 5min.`);
                            this.cooldowns.set(activeKey, Date.now() + this.cooldownDuration);
                            break; // Pula a chave inteira
                        }
                    }

                    // ═══ ERRO 502/503/upstream: Provedor caiu ═══
                    if (httpStatus === 502 || httpStatus === 503 || msg.includes("Provider returned error") || msg.includes("upstream") || msg.includes("502") || msg.includes("503")) {
                        Logger.warn("KeyRotationEngine", `Provedor do modelo ${modelName} caiu! Pulando para o próximo modelo (Fallback).`);
                        continue; // Próximo modelo, mesma chave
                    }

                    // ═══ ERRO 402: Sem crédito / saldo insuficiente ═══
                    if (httpStatus === 402 || msg.includes("402") || msg.includes("requires more credits") || msg.includes("insufficient")) {
                        Logger.warn("KeyRotationEngine", `Chave ${activeKey.substring(0, 12)} sem crédito (402). Tentando provedor alternativo antes do fallback dinâmico para modelos gratuitos.`);

                        if (apiKeyManager.listClaudeKeys().length > 0) {
                            try {
                                const claudeResult = await this.executeClaudeWithRotation(history, prompt, tools, systemInstruction);
                                this._globalFailCount = 0;
                                this._lastSuccessTime = Date.now();
                                return {
                                    chat: {
                                        getHistory: () => {
                                            const hist = [...history];
                                            hist.push({ role: "user", parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] });
                                            hist.push({ role: "model", parts: [{ text: claudeResult.response.response.text() }] });
                                            return hist;
                                        }
                                    },
                                    response: claudeResult.response,
                                    modelName: claudeResult.modelName
                                };
                            } catch (claudeErr) {
                                Logger.warn("KeyRotationEngine", `Fallback Claude também falhou: ${String(claudeErr.message || claudeErr).substring(0, 120)}`);
                            }
                        }

                        if (!this.keysWithoutCredits) this.keysWithoutCredits = new Set();
                        this.keysWithoutCredits.add(activeKey);
                        continue; // Tenta o próximo modelo (gratuito) na mesma chave
                    }

                    // ═══ Limite de tokens / prompt grande ═══
                    if (msg.includes("Prompt tokens limit exceeded") || msg.includes("max_tokens") || msg.includes("context length")) {
                        Logger.warn("KeyRotationEngine", `Prompt grande demais para o modelo atual. Tentando provedor alternativo antes do fallback local.`);

                        if (apiKeyManager.listClaudeKeys().length > 0) {
                            try {
                                const claudeResult = await this.executeClaudeWithRotation(history, prompt, tools, systemInstruction);
                                this._globalFailCount = 0;
                                this._lastSuccessTime = Date.now();
                                return {
                                    chat: {
                                        getHistory: () => {
                                            const hist = [...history];
                                            hist.push({ role: "user", parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] });
                                            hist.push({ role: "model", parts: [{ text: claudeResult.response.response.text() }] });
                                            return hist;
                                        }
                                    },
                                    response: claudeResult.response,
                                    modelName: claudeResult.modelName
                                };
                            } catch (claudeErr) {
                                Logger.warn("KeyRotationEngine", `Fallback Claude também falhou: ${String(claudeErr.message || claudeErr).substring(0, 120)}`);
                            }
                        }

                        break;
                    }

                    // ═══ ERRO 401/403: Chave inválida/banida ═══
                    if (httpStatus === 401 || httpStatus === 403 || msg.includes("401") || msg.includes("403")) {
                        Logger.warn("KeyRotationEngine", `Chave ${activeKey.substring(0, 12)} inválida/banida. Cooldown de 30min.`);
                        this.cooldowns.set(activeKey, Date.now() + 30 * 60 * 1000); // 30 min cooldown para chave inválida
                        break; // Pula a chave inteira
                    }

                    // ═══ Timeout / AbortError ═══
                    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
                        Logger.warn("KeyRotationEngine", `Timeout com ${modelName}. Tentando próximo modelo.`);
                        continue; // Próximo modelo, mesma chave
                    }

                    // Erro genérico — tenta próximo modelo
                    await new Promise(r => setTimeout(r, 300));
                }
            }

            // Se o loop terminou sem retornar, todos os modelos tentados falharam para esta chave.
            Logger.error("KeyRotationEngine", `Todos os modelos falharam para a chave ${activeKey.substring(0, 8)}... Rotacionando chave.`);
            apiKeyManager.markFailure(activeKey);

            attempts++;
        }

        // Incrementa circuit breaker global
        this._globalFailCount++;

        throw new Error("O Bochecha esgotou todas as chaves e modelos ativos do OpenRouter sem conseguir obter resposta. Verifique as APIs!");
    }

    /**
     * Tenta exclusivamente modelos gratuitos (:free) com uma chave específica.
     * Estes modelos não consomem crédito — funcionam mesmo com chaves 402.
     */
    async _tryFreeModelsOnly(history, prompt, tools, systemInstruction, activeKey) {
        const nowTime = Date.now();
        if (this.modelCooldowns) {
            for (const [m, exp] of this.modelCooldowns.entries()) {
                if (exp <= nowTime) {
                    this.modelCooldowns.delete(m);
                }
            }
        } else {
            this.modelCooldowns = new Map();
        }

        const actualFreeModelsList = [
            ...this.freeModels,
            "qwen/qwen3-coder:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "z-ai/glm-4.5-air:free",
            "deepseek/deepseek-r1:free"
        ];

        const isModelAliveAndClean = m => {
            if (this.deadModels.has(m)) return false;
            const exp = this.modelCooldowns.get(m) || 0;
            return exp <= nowTime;
        };

        const prioritizedFreeModels = this._getPrioritizedModels(prompt, tools).filter(m => actualFreeModelsList.includes(m) && isModelAliveAndClean(m));
        let freeModels = prioritizedFreeModels.length > 0 ? prioritizedFreeModels : actualFreeModelsList.filter(isModelAliveAndClean);
        
        if (freeModels.length === 0) {
            Logger.warn("KeyRotationEngine", "Todos os modelos gratuitos estão mortos ou em cooldown. Limpando cache e tentando novamente.");
            for (const m of actualFreeModelsList) {
                this.deadModels.delete(m);
                this.modelCooldowns.delete(m);
            }
            freeModels = actualFreeModelsList;
        }

        for (const modelName of freeModels) {
            try {
                Logger.info("KeyRotationEngine", `[STRONG] Tentando modelo forte: ${modelName} | Token: ${activeKey.substring(0, 8)}...`);

                const messages = [];
                if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
                const compactHistory = Array.isArray(history) ? history.slice(-6) : [];
                if (compactHistory && Array.isArray(compactHistory)) {
                    for (const h of compactHistory) {
                        const role = h.role === "model" ? "assistant" : "user";
                        const content = (h.parts || []).map(p => p.text || "").join("\n").trim();
                        if (content) messages.push({ role, content: this._truncateTextForModel(content, 900) });
                    }
                }

                const finalContent = this._preparePromptContent(prompt);
                messages.push({ role: "user", content: finalContent });

                const normalizedModelName = this.modelNormalization[modelName] || this.modelNormalization[modelName?.toLowerCase?.()] || modelName;
                const openRouterTools = mapGeminiToolsToOpenRouter(tools);
                const promptText = typeof finalContent === 'string' ? finalContent : String(finalContent || '');
                const hasTools = Boolean(openRouterTools && openRouterTools.length > 0);
                const requestProfile = this._classifyRequest(prompt, tools, history);
                const isSimpleTurn = requestProfile.mode === 'fast' && !hasTools && promptText.length < 350 && (!history || history.length < 8);
                const body = {
                    model: normalizedModelName,
                    messages,
                    temperature: requestProfile.mode === 'smart' ? 0.12 : 0.24,
                    max_tokens: requestProfile.mode === 'smart' ? 260 : 140
                };
                if (openRouterTools && openRouterTools.length > 0) {
                    body.tools = openRouterTools;
                    body.tool_choice = "auto";
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000); // Gratuitos podem ser lentos

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${activeKey}`,
                        "HTTP-Referer": "https://github.com/mg5860606-ux/bochecha-ia",
                        "X-Title": "Bochecha-IA",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutId));

                if (!response.ok) {
                    const errorText = await response.text();
                    const err = new Error(`OpenRouter API Error: status ${response.status} - ${errorText}`);
                    err.httpStatus = response.status;
                    throw err;
                }

                const data = await response.json();
                const choice = data.choices && data.choices[0];
                if (!choice) throw new Error("Resposta sem choices.");

                const message = choice.message;
                const toolCalls = message.tool_calls;
                const _rawReply2 = message.content || "";
                const textReply = (_rawReply2 || "").trim();
                if (!textReply && (!toolCalls || toolCalls.length === 0)) {
                    throw new Error("Modelo gratuito retornou conteúdo vazio; tentando próximo modelo.");
                }

                this._globalFailCount = 0;
                this._lastSuccessTime = Date.now();
                this.metrics.successRequests++;
                this.metrics.modelHits[modelName] = (this.metrics.modelHits[modelName] || 0) + 1;

                Logger.info("KeyRotationEngine", `[STRONG] Sucesso com modelo forte: ${modelName}`);

                const responseMock = {
                    response: {
                        text: () => textReply,
                        functionCalls: () => {
                            if (!toolCalls || toolCalls.length === 0) return undefined;
                            return toolCalls.map(tc => ({
                                name: tc.function.name,
                                args: JSON.parse(tc.function.arguments || '{}')
                            }));
                        }
                    }
                };
                const chatMock = {
                    getHistory: () => {
                        const hist = [...history];
                        hist.push({ role: "user", parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] });
                        hist.push({ role: "model", parts: [{ text: textReply }] });
                        return hist;
                    }
                };
                return { chat: chatMock, response: responseMock, modelName };

            } catch (e) {
                const httpStatus = e.httpStatus || 0;
                const msg = String(e.message || e);
                Logger.warn("KeyRotationEngine", `[STRONG] Falha em ${modelName}: ${msg.substring(0, 100)}`);
                
                if (httpStatus === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) {
                    const isProviderError = msg.includes("Provider returned error") || msg.includes("upstream") || msg.includes("model");
                    if (isProviderError) {
                        Logger.warn("KeyRotationEngine", `[STRONG] Modelo ${modelName} retornou rate limit do provedor (429). Cooldown de 3min no modelo.`);
                        if (!this.modelCooldowns) this.modelCooldowns = new Map();
                        this.modelCooldowns.set(modelName, Date.now() + 3 * 60 * 1000);
                        continue; // Tenta o próximo modelo gratuito na mesma chave
                    } else {
                        Logger.warn("KeyRotationEngine", `Chave ${activeKey.substring(0, 12)} rate-limited (429) em modelo gratuito. Pulando chave.`);
                        this.cooldowns.set(activeKey, Date.now() + this.cooldownDuration);
                        break; // Pula os outros modelos nesta chave rate-limited
                    }
                }

                if (httpStatus === 404 || msg.includes("404") || msg.includes("No endpoints")) {
                    this.deadModels.add(modelName);
                }
                this.metrics.failedRequests++;
            }
        }

        Logger.error("KeyRotationEngine", "Todos os modelos fortes falharam para esta chave.");
        return null; // Indica falha — caller vai pular para próxima chave
    }

    /**
     * Fornece diagnósticos completos de saúde e velocidade da IA.
     */
    getDiagnostics() {
        const all = apiKeyManager.listKeys();
        const active = all.filter(k => (this.cooldowns.get(k) || 0) <= Date.now()).length;
        const avg = this.metrics.latencies.length > 0 
            ? Math.round(this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length) 
            : 0;

        return {
            totalKeys: all.length,
            activeKeys: active,
            inCooldown: all.length - active,
            avgLatency: `${avg}ms`,
            successRate: this.metrics.totalRequests > 0 
                ? `${((this.metrics.successRequests / this.metrics.totalRequests) * 100).toFixed(1)}%` 
                : "100%",
            requests: `${this.metrics.successRequests}/${this.metrics.totalRequests}`,
            modelDistribution: this.metrics.modelHits
        };
    }

    /**
     * Grava relatórios de métricas das chaves de API do Gemini no disco.
     */
    async saveKeyMetrics() {
        try {
            const allKeys = apiKeyManager.listKeys();
            const now = Date.now();
            const keysList = [];
            let activeCount = 0;

            for (let i = 0; i < allKeys.length; i++) {
                const k = allKeys[i];
                const stats = this.keyStats.get(k) || { success: 0, failed: 0, latencies: [] };
                const exp = this.cooldowns.get(k) || 0;
                const inCooldown = exp > now;
                const cooldownLeft = inCooldown ? Math.ceil((exp - now) / 1000) : 0;
                
                if (!inCooldown) activeCount++;

                const avgL = stats.latencies.length > 0 
                    ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length) + "ms"
                    : "0ms";

                const totalReqs = stats.success + stats.failed;
                const usagePercent = Math.min(100, Math.round((totalReqs / 20) * 100)); // Limite fictício para TUI

                keysList.push({
                    index: i + 1,
                    keyMasked: k.substring(0, 10) + "..." + k.substring(k.length - 6),
                    success: stats.success,
                    failed: stats.failed,
                    latency: avgL,
                    status: inCooldown ? "COOLDOWN" : "ATIVA",
                    cooldownLeft,
                    usagePercent
                });
            }

            const activeModel = this.availableModels[0] || "gemini-2.5-flash";
            const fallbackModel = this.availableModels[1] || "gemini-3.1-flash-lite";

            const data = {
                activeModel,
                fallbackModel,
                totalKeys: allKeys.length,
                activeKeys: activeCount,
                keys: keysList
            };

            const metricsFile = path.join(LEARNINGS_DIR, "key_metrics.json");
            fs.writeFileSync(metricsFile, JSON.stringify(data, null, 2));
        } catch (e) {
            // Silencioso
        }
    }

    _extractTextFromPrompt(prompt) {
        if (!prompt) return "";
        if (typeof prompt === 'string') return prompt;
        if (Array.isArray(prompt)) {
            return prompt.map(p => {
                if (typeof p === 'string') return p;
                if (p && p.text) return p.text;
                return "";
            }).join(" ");
        }
        return String(prompt);
    }

    generateOfflineResponse(prompt) {
        return buildOfflineFallbackResponse(prompt);
    }
}

// Instanciar singleton de controle de chave
const keyRotator = new KeyRotationEngine();
global.keyRotator = keyRotator;

// ══════════════════════════════════════════════════════════════════════════
// 5. DIALOG SESSION (MEMÓRIA DESLIZANTE E AUTO-SUMARIZADOR SEMÂNTICO)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Controla sessões de conversas e realiza sumarização automática no background.
 * Evita sobrecarga de mensagens no histórico, economizando API e retendo memórias longas.
 */
class DialogSession {
    constructor() {
        this.maxMessages = 120; // Limite de gatilho para sumarização (salva no máximo N mensagens antes de resumir)
        this.targetHistoryLength = 30; // Quanto manter intacto após sumarizar (mantém as últimas 30 mensagens + resumo)
        this.summaries = new Map();
        this.compressing = new Set(); // Evita compressões concorrentes para o mesmo chat
    }

    /**
     * Limpa e formata o JID para gerar um arquivo seguro no disco.
     */
    _getFilePath(chatId) {
        const safe = chatId.replace(/[^a-zA-Z0-9@._-]/g, '_');
        return path.join(MEMORY_DIR, `${safe}.json`);
    }

    /**
     * Puxa o histórico de mensagens de um chat.
     */
    async getHistory(chatId) {
        const file = this._getFilePath(chatId);
        let history = await storage.read(file, []);
        if (history && !Array.isArray(history)) {
            const values = [];
            const keys = Object.keys(history).filter(k => !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            for (const k of keys) {
                values.push(history[k]);
            }
            history = values;
            await this.saveHistory(chatId, history);
        }

        // --- EXPIRAÇÃO POR INATIVIDADE (MÁXIMO 15 MINUTOS) ---
        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg && lastMsg.timestamp) {
                const diffMs = Date.now() - lastMsg.timestamp;
                const maxInactiveTime = 15 * 60 * 1000; // 15 minutos de inatividade
                if (diffMs > maxInactiveTime) {
                    Logger.warn("DialogSession", `Histórico de ${chatId} expirou por inatividade de 15 min. Limpando...`);
                    await this.clearSession(chatId);
                    return [];
                }
            }
        }

        return history;
    }

    /**
     * Grava o histórico de mensagens do chat.
     */
    async saveHistory(chatId, history) {
        const file = this._getFilePath(chatId);
        await storage.write(file, history);
    }

    /**
     * Limpa completamente o histórico e resumo de um chat.
     */
    async clearSession(chatId) {
        const file = this._getFilePath(chatId);
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (e) {
                Logger.error(`DialogSession.clearSession(${chatId})`, e);
            }
        }
        this.summaries.delete(chatId);
    }

    /**
     * Recupera o resumo gerado anteriormente para o chat.
     */
    async getSummary(chatId) {
        if (this.summaries.has(chatId)) return this.summaries.get(chatId);
        const history = await this.getHistory(chatId);
        if (history.length > 0 && history[0].isSummaryMetadata) {
            this.summaries.set(chatId, history[0].summary);
            return history[0].summary;
        }
        return "";
    }

    /**
     * Executa a sumarização automática das mensagens antigas.
     * @param {string} chatId ID do chat.
     * @param {any[]} history Histórico atual.
     */
    async _autoCompress(chatId, history) {
        if (this.compressing.has(chatId)) return;
        this.compressing.add(chatId);

        const compressCount = history.length - this.targetHistoryLength;
        if (compressCount <= 3) {
            this.compressing.delete(chatId);
            return;
        }

        const toCompress = history.slice(0, compressCount);
        const toKeep = history.slice(compressCount);

        const currentSummary = await this.getSummary(chatId);
        const chatLogs = toCompress.map(m => {
            const isBot = m.role === 'assistant' || m.role === 'model';
            // Extrai apenas a linha MENSAGEM do conteúdo formatado do usuário
            if (!isBot) {
                const msgMatch = m.content && m.content.match(/MENSAGEM:\s*(.+?)(?:\n|$|={5})/s);
                const userLine = m.content && m.content.match(/\[\uD83D\uDC64 USUÁRIO: "([^"]+)"/);
                const name = userLine ? userLine[1] : 'Membro';
                const msg = msgMatch ? msgMatch[1].trim() : m.content;
                return `[${name}]: ${msg}`;
            }
            return `[Bochecha]: ${m.content}`;
        }).join('\n');

        const compactPrompt = `Comprima as conversas a seguir em um resumo denso, objetivo e puramente factual em português brasileiro, retendo detalhes aprendidos sobre os usuários ativos, piadas locais e o humor geral. Mescle com o resumo anterior caso ele exista.\n\n[Resumo Prévio]: ${currentSummary || "Nenhum"}\n\n[Novas Mensagens a Sumarizar]:\n${chatLogs}`;

        try {
            Logger.info("DialogSession", `Sumarizando chat ${chatId} (${compressCount} mensagens)...`);
            
            const systemRule = "Você é o Bochecha. Crie resumos densos, frios e organizados do histórico das conversas. Retorne unicamente o resumo sem introduções.";
            const { response } = await keyRotator.executeWithRotation([], compactPrompt, [], systemRule);
            
            const newSummary = response.response.text().trim();
            this.summaries.set(chatId, newSummary);
            
            Logger.success("DialogSession", `Sumarização efetuada! Compresso com sucesso.`);

            // Lê o histórico mais recente para evitar perda de mensagens concorrentes
            const latestHistory = await this.getHistory(chatId);
            
            // Remove metadados antigos se houver
            if (latestHistory.length > 0 && latestHistory[0].isSummaryMetadata) {
                latestHistory.shift();
            }

            // Remove as mensagens que foram compactadas (as primeiras 'compressCount' mensagens)
            const remainingHistory = latestHistory.slice(compressCount);

            // Constrói novo histórico injetando o resumo em metadados no índice 0
            const newHistory = [
                {
                    isSummaryMetadata: true,
                    summary: newSummary,
                    role: 'user',
                    content: `[SISTEMA - RESUMO DAS INTERAÇÕES ANTERIORES]: ${newSummary}`,
                    timestamp: Date.now()
                },
                ...remainingHistory
            ];

            await this.saveHistory(chatId, newHistory);
        } catch (e) {
            Logger.error(`DialogSession.compress(${chatId})`, e);
            
            // FALLBACK FIFO SE A SUMARIZAÇÃO FALHAR:
            // Removemos as mensagens antigas localmente para manter o histórico sob controle e evitar loops infinitos.
            try {
                const latestHistory = await this.getHistory(chatId);
                let existingSummaryMeta = null;
                if (latestHistory.length > 0 && latestHistory[0].isSummaryMetadata) {
                    existingSummaryMeta = latestHistory.shift();
                }
                
                const remainingHistory = latestHistory.slice(compressCount);
                if (existingSummaryMeta) {
                    remainingHistory.unshift(existingSummaryMeta);
                }
                
                await this.saveHistory(chatId, remainingHistory);
                Logger.warn("DialogSession", `Fallback FIFO aplicado para ${chatId}. Histórico reduzido localmente devido a falhas na API.`);
            } catch (err) {
                Logger.error("DialogSession.compressFallback", err);
            }
        } finally {
            this.compressing.delete(chatId);
        }
    }

    /**
     * Adiciona nova rodada de diálogo no histórico.
     */
    async addMessage(chatId, role, content) {
        let history = await this.getHistory(chatId);
        
        let existingSummaryMeta = null;
        if (history.length > 0 && history[0].isSummaryMetadata) {
            existingSummaryMeta = history.shift();
        }

        history.push({ role, content, timestamp: Date.now() });

        if (existingSummaryMeta) {
            history.unshift(existingSummaryMeta);
        }

        await this.saveHistory(chatId, history);

        if (history.length > this.maxMessages) {
            // Executa no background sem travar o processamento ativo da mensagem do usuário
            this._autoCompress(chatId, history);
        }
    }
}

// Instanciar gerenciador de sessão
const sessionManager = new DialogSession();

// ══════════════════════════════════════════════════════════════════════════
// 5.1. DYNAMIC SPEECH SYNTHESIS ENGINE (VOICE SYNTHESIZER)
// ══════════════════════════════════════════════════════════════════════════
const googleTTS = require('google-tts-api');
const https = require('https');
const { hasValidAudioBuffer, shouldPreferAudioReply } = require('./lib/voice_utils');

class VoiceSynthesizer {
    static checkFFmpeg() {
        return new Promise((resolve) => {
            try {
                const ffmpegPath = require('ffmpeg-static');
                const fs = require('fs');
                if (ffmpegPath && fs.existsSync(ffmpegPath)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (e) {
                resolve(false);
            }
        });
    }

    static convertMp3ToOggOpus(mp3Buffer, voicePreset = "antonio") {
        return new Promise((resolve, reject) => {
            const ffmpegPath = require('ffmpeg-static');
            let filterString = '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]';

            if (voicePreset === "helio") {
                filterString = '[0:a]asetrate=48000*1.55,atempo=1/1.55[out_voice];[out_voice][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]';
            } else if (voicePreset === "grave") {
                filterString = '[0:a]asetrate=48000*0.75,atempo=1/0.75[out_voice];[out_voice][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]';
            } else if (voicePreset === "esquilo") {
                filterString = '[0:a]asetrate=48000*1.75,atempo=1/1.75[out_voice];[out_voice][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]';
            } else if (voicePreset === "robo") {
                filterString = '[0:a]apulsator=hz=25[out_voice];[out_voice][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]';
            }

            const ffmpeg = spawn(ffmpegPath, [
                '-i', 'pipe:0',
                '-f', 'lavfi',
                '-i', 'anoisesrc=c=pink:amp=0.003:r=48000',
                '-filter_complex', filterString,
                '-map', '[a]',
                '-c:a', 'libopus',
                '-b:a', '32k',
                '-ac', '1',
                '-f', 'ogg',
                'pipe:1'
            ]);

            const chunks = [];
            ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
            ffmpeg.stderr.on('data', () => {});
            ffmpeg.on('close', (code) => {
                if (code === 0) resolve(Buffer.concat(chunks));
                else reject(new Error(`FFmpeg exit code ${code}`));
            });
            ffmpeg.on('error', reject);
            ffmpeg.stdin.write(mp3Buffer);
            ffmpeg.stdin.end();
        });
    }

    // Conversão simples MP3 → OGG Opus sem efeitos (mais confiável)
    static convertMp3ToOggSimples(mp3Buffer) {
        return new Promise((resolve, reject) => {
            const ffmpegPath = require('ffmpeg-static');
            const ffmpeg = spawn(ffmpegPath, [
                '-i', 'pipe:0',
                '-c:a', 'libopus',
                '-b:a', '32k',
                '-ac', '1',
                '-f', 'ogg',
                'pipe:1'
            ]);
            const chunks = [];
            ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
            ffmpeg.stderr.on('data', () => {});
            ffmpeg.on('close', (code) => {
                if (code === 0) resolve(Buffer.concat(chunks));
                else reject(new Error(`FFmpeg simples exit code ${code}`));
            });
            ffmpeg.on('error', reject);
            ffmpeg.stdin.write(mp3Buffer);
            ffmpeg.stdin.end();
        });
    }

    static async speak(sock, chatId, text, msgRef = null, voicePreset = "antonio", options = {}) {
        try {
            Logger.info("VoiceSynthesizer", `Gerando voz humana premium (${voicePreset}) para: "${text.substring(0, 40)}..."`);
            
            const cleanText = text.substring(0, 500);
            const { UniversalEdgeTTS } = require('edge-tts-universal');
            const sendOptions = { ...options };
            if (options.quoted === true || options.reply === true) {
                sendOptions.quoted = msgRef;
            } else {
                delete sendOptions.quoted;
            }
            
            let edgeVoice = 'pt-BR-AntonioNeural';
            if (voicePreset === "francisca" || voicePreset === "mulher") {
                edgeVoice = 'pt-BR-FranciscaNeural';
            } else if (voicePreset === "valeska") {
                edgeVoice = 'pt-BR-ValeskaNeural';
            } else if (voicePreset === "duarte") {
                edgeVoice = 'pt-BR-DuarteNeural';
            }
            
            // Para presets neurais aplicamos SSML leve para melhorar naturalidade (pausas e prosódia)
            let ttsInput = cleanText;
            if (voicePreset !== 'antonio') {
                const ssmlBody = cleanText
                    .replace(/\n{2,}/g, '<break time="450ms"/>')
                    .replace(/\n/g, '<break time="220ms"/>')
                    .replace(/\.\s+/g, '.<break time="200ms"/> ');
                ttsInput = `<speak><prosody rate="0.98" pitch="-1%">${ssmlBody}</prosody></speak>`;
            }

            const tts = new UniversalEdgeTTS(ttsInput, edgeVoice);
            const result = await tts.synthesize();
            const arrayBuffer = await result.audio.arrayBuffer();
            const mp3Buffer = Buffer.from(arrayBuffer);

            if (!hasValidAudioBuffer(mp3Buffer)) {
                Logger.warn("VoiceSynthesizer", "Nenhum áudio válido recebido do motor TTS. Enviando resposta em texto.");
                if (sock) {
                    try {
                        await sock.sendMessage(chatId, { text: cleanText }, sendOptions);
                    } catch (sendErr) {
                        Logger.warn("VoiceSynthesizer.TextFallback", sendErr.message);
                    }
                }
                return true;
            }

            const hasFFmpeg = await this.checkFFmpeg();
            if (hasFFmpeg) {
                // Para presets especiais tenta com efeitos (pink noise)
                if (voicePreset !== "antonio") {
                    try {
                        Logger.info("VoiceSynthesizer", `Convertendo com preset '${voicePreset}'...`);
                        const oggBuffer = await this.convertMp3ToOggOpus(mp3Buffer, voicePreset);
                        if (sock) {
                            try {
                                await sock.sendMessage(chatId, {
                                    audio: oggBuffer,
                                    mimetype: 'audio/ogg; codecs=opus',
                                    ptt: true
                                }, sendOptions);
                            } catch (sendErr) {
                                Logger.warn("VoiceSynthesizer.AudioFallback", sendErr.message);
                                await sock.sendMessage(chatId, { text: cleanText }, sendOptions);
                            }
                        }
                        Logger.success("VoiceSynthesizer", "Áudio com preset enviado como nota de voz!");
                        return true;
                    } catch (convErr) {
                        Logger.warn("VoiceSynthesizer", `Preset falhou: ${convErr.message}. Tentando conversão simples...`);
                    }
                }

                // Conversão simples MP3 → OGG Opus (sem ruído, mais confiável)
                try {
                    Logger.info("VoiceSynthesizer", "Convertendo MP3 para OGG Opus...");
                    const oggBuffer = await this.convertMp3ToOggSimples(mp3Buffer);
                    if (sock) {
                        try {
                            await sock.sendMessage(chatId, {
                                audio: oggBuffer,
                                mimetype: 'audio/ogg; codecs=opus',
                                ptt: true
                            }, sendOptions);
                        } catch (sendErr) {
                            Logger.warn("VoiceSynthesizer.AudioFallback", sendErr.message);
                            await sock.sendMessage(chatId, { text: cleanText }, sendOptions);
                        }
                    }
                    Logger.success("VoiceSynthesizer", "Áudio enviado como nota de voz nativa!");
                    return true;
                } catch (simpleErr) {
                    Logger.error("VoiceSynthesizer.OggSimples", simpleErr.message);
                }
            }

            // Fallback final: envia MP3 com mimetype correto
            Logger.warn("VoiceSynthesizer", "FFmpeg indisponível. Enviando MP3 bruto como nota de voz...");
            if (sock) {
                try {
                    await sock.sendMessage(chatId, {
                        audio: mp3Buffer,
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, sendOptions);
                } catch (sendErr) {
                    Logger.warn("VoiceSynthesizer.AudioFallback", sendErr.message);
                    await sock.sendMessage(chatId, { text: cleanText }, sendOptions);
                }
            }
            Logger.success("VoiceSynthesizer", "Áudio MP3 enviado como nota de voz!");
            return true;
        } catch (e) {
            Logger.error("VoiceSynthesizer.speak", e);
            return false;
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 5.2. OWNER PROTECTOR SYSTEM (ANTI-GHOSTING SHIELD)
// ══════════════════════════════════════════════════════════════════════════
class AntiGhostingSystem {
    constructor() {
        this.timers = new Map();
    }

    registerQuestion(sock, chatId, sender) {
        // Limpa timer anterior para evitar múltiplos alertas no mesmo grupo
        this.clearTimer(chatId);

        Logger.info("AntiGhosting", `Dono Marcos fez uma pergunta no grupo ${chatId}. Iniciando vigilância de vácuo de 5 minutos.`);
        
        const timer = setTimeout(async () => {
            try {
                this.timers.delete(chatId);
                Logger.warn("AntiGhosting", `Vácuo detectado no grupo ${chatId}! Disparando aviso.`);

                const metadata = await sock.groupMetadata(chatId);
                const botJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                
                // Pega participantes ativos e filtra dono e bot
                const candidates = metadata.participants
                    .map(p => p.id)
                    .filter(id => !DEFAULT_OWNERS.includes(id.split('@')[0]) && id !== botJid);

                if (candidates.length === 0) return;

                // Seleciona até 4 participantes aleatórios para marcar no esporro
                const shuffled = candidates.sort(() => 0.5 - Math.random());
                const tagged = shuffled.slice(0, 4);

                const mentionText = tagged.map(id => `@${id.split('@')[0]}`).join(" ");
                const text = `🚨 *ESCUDO ANTI-VÁCUO DO CRIADOR* 🚨\n\nO mestre Marcos fez uma pergunta importante aqui e vocês deixaram ele no vácuo por 5 minutos?! 😡\n\nBora responder, bando de preguiçosos: ${mentionText}! 👀`;

                await sock.sendMessage(chatId, {
                    text,
                    mentions: tagged
                });
            } catch (e) {
                Logger.error("AntiGhosting.trigger", e);
            }
        }, 5 * 60 * 1000); // 5 minutos

        this.timers.set(chatId, timer);
    }

    clearTimer(chatId) {
        if (this.timers.has(chatId)) {
            clearTimeout(this.timers.get(chatId));
            this.timers.delete(chatId);
            Logger.info("AntiGhosting", `Vácuo quebrado ou resetado no grupo ${chatId}.`);
        }
    }
}
const antiGhosting = new AntiGhostingSystem();

// ══════════════════════════════════════════════════════════════════════════
// 5.3. NEURAL TIME SCHEDULER ENGINE (SCHEDULE ENGINE)
// ══════════════════════════════════════════════════════════════════════════
const schedule = require('node-schedule');
const SCHEDULES_FILE = path.join(LEARNINGS_DIR, "schedules.json");

class ScheduleEngine {
    constructor() {
        this.jobs = new Map();
    }

    async boot(sock) {
        try {
            Logger.info("ScheduleEngine", "Inicializando motor de agendamentos temporais...");
            const db = await storage.read(SCHEDULES_FILE, []);
            const now = Date.now();
            let active = 0;

            for (const item of db) {
                const targetTime = new Date(item.time).getTime();
                if (targetTime > now) {
                    this._schedule(sock, item);
                    active++;
                }
            }
            Logger.success("ScheduleEngine", `${active} agendamentos futuros reativados com sucesso.`);
        } catch (e) {
            Logger.error("ScheduleEngine.boot", e);
        }
    }

    _schedule(sock, item) {
        const date = new Date(item.time);
        
        if (this.jobs.has(item.id)) {
            this.jobs.get(item.id).cancel();
        }

        const job = schedule.scheduleJob(date, async () => {
            try {
                this.jobs.delete(item.id);
                Logger.success("ScheduleEngine", `Executando lembrete agendado: ${item.message}`);
                
                const db = await storage.read(SCHEDULES_FILE, []);
                const filtered = db.filter(x => x.id !== item.id);
                await storage.write(SCHEDULES_FILE, filtered);

                const mention = item.ownerOnly ? `🔔 *LEMBRETE PRIVADO* 🔔` : `🔔 *LEMBRETE DO GRUPO* 🔔`;
                const text = `${mention}\n\nMarcos, aqui está o seu aviso agendado:\n\n💬 "${item.message}"`;

                await sock.sendMessage(item.chatId, { text });
            } catch (e) {
                Logger.error("ScheduleEngine.executeJob", e);
            }
        });

        this.jobs.set(item.id, job);
    }

    async addSchedule(sock, chatId, timeIso, message, ownerOnly = false) {
        try {
            const targetTime = new Date(timeIso);
            if (isNaN(targetTime.getTime()) || targetTime.getTime() <= Date.now()) {
                throw new Error("Data ou hora inválida ou no passado.");
            }

            const item = {
                id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                chatId,
                time: timeIso,
                message,
                ownerOnly
            };

            const db = await storage.read(SCHEDULES_FILE, []);
            db.push(item);
            await storage.write(SCHEDULES_FILE, db);

            this._schedule(sock, item);
            Logger.info("ScheduleEngine", `Novo agendamento criado para ${timeIso}: ${message}`);
            return item;
        } catch (e) {
            Logger.error("ScheduleEngine.addSchedule", e);
            throw e;
        }
    }
}
const scheduleEngine = new ScheduleEngine();

// Exposição global dos motores para acesso de skills dinâmicas e RCE
global.VoiceSynthesizer = VoiceSynthesizer;
global.antiGhosting = antiGhosting;
global.scheduleEngine = scheduleEngine;

// ══════════════════════════════════════════════════════════════════════════
// 6. SKILL REGISTRY (MODULARIDADE E HOT-RELOAD DE FERRAMENTAS)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Gerencia as habilidades dinâmicas da IA carregadas do diretório de skills.
 * Monitora modificações de arquivos para realizar Hot-Swap sem necessidade de reboot.
 */
class SkillRegistry {
    constructor() {
        this.skills = {};
        this.watchers = {};
    }

    /**
     * Registra e formata estruturalmente uma nova skill.
     */
    _registerSkill(file, skill) {
        if (!skill.definition || !skill.definition.function) {
            Logger.warn("SkillRegistry", `Arquivo ${file} descartado por falta de assinatura compatível.`);
            return false;
        }
        if (typeof skill.execute !== 'function') {
            Logger.warn("SkillRegistry", `Arquivo ${file} descartado por ausência de método execute.`);
            return false;
        }

        const fn = skill.definition.function;
        
        // Conversão obrigatória de tipos para UpperCase exigido pela API do Gemini
        if (fn.parameters && fn.parameters.properties) {
            for (const propName in fn.parameters.properties) {
                const prop = fn.parameters.properties[propName];
                if (prop.type) prop.type = prop.type.toUpperCase();
                if (prop.enum) {
                    prop.enum = prop.enum.map(String);
                }
            }
        }

        this.skills[fn.name] = skill;
        Logger.success("SkillRegistry", `Skill registrada: [${fn.name}]`);
        return true;
    }

    /**
     * Carrega todas as skills e configura observadores de tempo de execução.
     */
    async loadAll() {
        try {
            const files = fs.readdirSync(SKILLS_DIR);
            let count = 0;

            for (const file of files) {
                if (file.endsWith(".js") && file !== "games_controller.js") {
                    const skillPath = path.join(SKILLS_DIR, file);
                    try {
                        delete require.cache[require.resolve(skillPath)];
                        const skill = require(skillPath);
                        if (this._registerSkill(file, skill)) {
                            count++;
                            this._setupWatcher(file, skillPath);
                        }
                    } catch (e) {
                        Logger.error(`SkillRegistry.load(${file})`, e);
                    }
                }
            }
            Logger.info("SkillRegistry", `Registros dinâmicos ativos: ${count} carregados.`);

            // Registra a Skill nativa especial de Autoprogramação (Self-Evolution)
            this.skills["create_custom_skill"] = {
                definition: {
                    function: {
                        name: "create_custom_skill",
                        description: "Permite à Inteligência Artificial autoprogramar ou atualizar novas habilidades/comandos externos no sistema em tempo de execução. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "Nome único em minúsculas com sublinhados para a nova skill (ex: piada_nasa)."
                                },
                                description: {
                                    type: "string",
                                    description: "Resumo explicativo do que a skill faz."
                                },
                                jsCode: {
                                    type: "string",
                                    description: "Código-fonte NodeJS completo e autocontido. Deve exportar 'definition' (com o schema do Gemini parameters do próprio comando) e o método assíncrono 'execute(args, ctx)' que implementa a lógica e responde ao WhatsApp usando o ctx.sock."
                                }
                            },
                            required: ["name", "description", "jsCode"]
                        }
                    }
                },
                async execute(args, ctx) {
                    // Segurança Crítica: Apenas Marcos/Dono pode invocar RCE
                    if (!ctx.isOwner) {
                        return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para criar ou alterar código fonte no servidor.";
                    }
                    const res = await selfEvolution.validateAndSaveSkill(args.name, args.description, args.jsCode);
                    return res.message;
                }
            };

            // Registra a Skill nativa de alteração de imagem de perfil do grupo
            this.skills["change_group_profile_picture"] = {
                definition: {
                    function: {
                        name: "change_group_profile_picture",
                        description: "Gera uma imagem digital futurista e de altíssima qualidade de forma autônoma baseada em um prompt artístico e define esta imagem como a nova foto de perfil do grupo. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
                        parameters: {
                            type: "object",
                            properties: {
                                prompt: {
                                    type: "string",
                                    description: "Prompt descritivo em inglês ultra-detalhado para a geração de imagem por IA (ex: 'A majestic blue flaming phoenix rising, cyber-neon theme, digital art, highly detailed, 4k')."
                                }
                            },
                            required: ["prompt"]
                        }
                    }
                },
                async execute(args, ctx) {
                    if (!ctx.isOwner) {
                        return "Erro crítico de segurança: Apenas o criador Marcos possui permissão para trocar a imagem de perfil do grupo.";
                    }
                    if (!ctx.isGroup) {
                        return "Esta ferramenta de troca de imagem só pode ser executada dentro de grupos do WhatsApp.";
                    }
                    
                    try {
                        const axios = require('axios');
                        const FormData = require('form-data');
                        const formData = new FormData();
                        formData.append('text', args.prompt);

                        Logger.info("ProfilePicSkill", `Requisitando imagem foda do DeepAI: ${args.prompt}`);
                        const response = await axios.post('https://api.deepai.org/api/text2img', formData, {
                            headers: {
                                'api-key': 'skipped',
                                ...formData.getHeaders()
                            },
                            timeout: 30000
                        });

                        const imageUrl = response.data.output_url;
                        if (!imageUrl) {
                            return `Erro: A API não retornou uma URL válida.`;
                        }

                        const buffer_response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
                        const buffer = Buffer.from(buffer_response.data);
                        
                        Logger.info("ProfilePicSkill", "Aplicando nova foto de perfil no grupo WhatsApp...");
                        await ctx.sock.updateProfilePicture(ctx.chatId, buffer);
                        
                        await ctx.sock.sendMessage(ctx.chatId, {
                            text: `📸 *IMAGEM DE PERFIL ATUALIZADA!* \n\nCriei uma arte digital de última geração baseada no conceito:\n_"${args.prompt}"_\n\nA foto do grupo foi atualizada com sucesso! 🛸🔥`
                        });
                        
                        // Envia telemetria para Marcos
                        BochechaEngine.sendTelemetry(`📸 *ATUALIZAÇÃO DE PERFIL DE GRUPO* 📸\n\nAtualizei a foto de perfil do grupo ${ctx.chatId.split('@')[0]} com sucesso!\n\n*Prompt Utilizado:* ${args.prompt}`).catch(() => {});
                        
                        return "Imagem do grupo atualizada com sucesso.";
                    } catch (e) {
                        Logger.error("ProfilePicSkill", e);
                        return `Falha ao tentar gerar ou atualizar a imagem do grupo: ${e.message}`;
                    }
                }
            };
        } catch (e) {
            Logger.error("SkillRegistry.loadAll", e);
        }
    }

    /**
     * Assina watcher de escuta para recompilar e atualizar comandos em execução.
     */
    _setupWatcher(file, skillPath) {
        if (this.watchers[file]) return;
        try {
            const w = fs.watch(skillPath, async (evt) => {
                if (evt === 'change') {
                    Logger.info("SkillRegistry", `Recarregando skill modificada: ${file}...`);
                    try {
                        delete require.cache[require.resolve(skillPath)];
                        const updated = require(skillPath);
                        if (updated.definition && updated.definition.function) {
                            const name = updated.definition.function.name;
                            delete this.skills[name];
                            this._registerSkill(file, updated);
                            Logger.success("SkillRegistry", `Habilidade ${file} recarregada via HOT-SWAP!`);
                        }
                    } catch (err) {
                        Logger.error(`SkillRegistry.Watcher(${file})`, err);
                    }
                }
            });
            this.watchers[file] = w;
        } catch (e) {
            Logger.error("SkillRegistry.setupWatcher", e);
        }
    }

    /**
     * Mapeia as assinaturas para envio direto na requisição do Gemini.
     */
    getGeminiTools() {
        const tools = [];
        for (const name in this.skills) {
            const fn = this.skills[name].definition.function;
            const converted = this._convert(fn.parameters || { type: "object", properties: {} });
            tools.push({
                name: fn.name,
                description: fn.description || "Função autônoma do bot.",
                parameters: converted
            });
        }
        return tools;
    }

    /**
     * Recursividade de mapeamento de tipos compatíveis com o Gemini.
     */
    _convert(prop) {
        const out = { ...prop };
        if (out.type) out.type = out.type.toUpperCase();
        if (out.enum) out.enum = out.enum.map(String);
        if (out.properties) {
            const newProps = {};
            for (const k in out.properties) {
                newProps[k] = this._convert(out.properties[k]);
            }
            out.properties = newProps;
        }
        if (out.items) out.items = this._convert(out.items);
        return out;
    }

    /**
     * Executa a rotina da skill de forma isolada e segura.
     */
    async execute(name, args, ctx) {
        const sk = this.skills[name];
        if (!sk) return `Erro: Skill '${name}' inexistente.`;
        try {
            Logger.info("SkillRegistry", `Iniciando rotina de [${name}]`);
            const res = await sk.execute(args, ctx);
            Logger.success("SkillRegistry", `Finalizado rotina de [${name}]`);
            return res;
        } catch (e) {
            Logger.error(`SkillRegistry.execute(${name})`, e);
            return `Falha crítica interna ao rodar a ferramenta ${name}: ${e.message}`;
        }
    }
}

// Instanciar singleton registry
const registry = new SkillRegistry();
global.registry = registry;

// ══════════════════════════════════════════════════════════════════════════
// 7. MODERATION SYSTEM (ANTI-ABUSO, FLOOD E CONTROLE DE ADVERTÊNCIAS)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Controla atividades abusivas de usuários nos grupos.
 * Mede frequência de mensagens em milissegundos e gerencia expulsões automáticas.
 */
class ModerationSystem {
    constructor() {
        this.messageTimestamps = new Map();
        this.floodMaxMsgs = 5;
        this.floodTimeWindow = 3000; // 5 mensagens em 3s
        this.floodImunity = new Set();
    }

    async isProtectedTarget(sock, chatId, targetUser) {
        const cleanTarget = String(targetUser || "").split('@')[0];
        const myNumber = String(sock.user?.id || "").split(':')[0];
        if (!cleanTarget) return false;

        if (cleanTarget === myNumber) return true;
        if (DEFAULT_OWNERS.includes(cleanTarget)) return true;
        if (!chatId.endsWith('@g.us')) return false;

        try {
            const metadata = BochechaEngine.storeRef?.chats?.get(chatId) || await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];
            const found = participants.find(p => p.id.split('@')[0] === cleanTarget);
            return Boolean(found && (found.admin === 'admin' || found.admin === 'superadmin'));
        } catch (metaErr) {
            Logger.error("ModerationSystem.isProtectedTarget.Metadata", metaErr);
            return false;
        }
    }

    /**
     * Remove um participante com segurança, resolvendo IDs LID vs JID real e evitando expulsar administradores.
     */
    async safeRemove(sock, chatId, targetUser) {
        let participantJid = targetUser;
        if (chatId.endsWith('@g.us')) {
            try {
                const metadata = BochechaEngine.storeRef?.chats?.get(chatId) || await sock.groupMetadata(chatId);
                const participants = metadata.participants || [];
                const cleanTarget = targetUser.split('@')[0];
                const found = participants.find(p => p.id.split('@')[0] === cleanTarget);
                if (found) {
                    participantJid = found.id;
                    if (found.admin === 'admin' || found.admin === 'superadmin') {
                        Logger.warn("ModerationSystem.safeRemove", `Protegido contra remoção: ${participantJid}`);
                        throw new Error("Protected target");
                    }
                }
            } catch (metaErr) {
                Logger.error("ModerationSystem.safeRemove.Metadata", metaErr);
            }
        }
        await sock.groupParticipantsUpdate(chatId, [participantJid], 'remove');
    }

    /**
     * Realiza a verificação de spam/flood de forma ativa.
     */
    async checkFlood(sock, chatId, userId, messageRef) {
        const key = `${chatId}:${userId}`;
        const cleanUser = userId.split('@')[0];

        // Imunidade para os criadores do bot
        if (DEFAULT_OWNERS.includes(cleanUser)) return false;

        const security = await storage.getGroupSecurity(chatId);
        if (!security.antispam && !security.antiflood) return false;

        if (this.floodImunity.has(key)) return true;

        const now = Date.now();
        if (!this.messageTimestamps.has(key)) {
            this.messageTimestamps.set(key, []);
        }

        const timestamps = this.messageTimestamps.get(key);
        const recents = timestamps.filter(t => (now - t) < this.floodTimeWindow);
        recents.push(now);
        this.messageTimestamps.set(key, recents);

        if (recents.length > this.floodMaxMsgs) {
            this.floodImunity.add(key);
            setTimeout(() => this.floodImunity.delete(key), 10000); // 10s de imunidade de restrição

            Logger.warn("Anti-Spam", `Spam detectado: ${userId} no grupo ${chatId}`);

            try {
                await sock.sendMessage(chatId, { delete: messageRef.key });
            } catch {}

            const warns = await storage.addWarning(chatId, userId);

            if (warns >= 3) {
                try {
                    // Tenta remover primeiro usando a remoção segura
                    await this.safeRemove(sock, chatId, userId);
                    
                    // Se deu certo, avisa no grupo
                    await sock.sendMessage(chatId, {
                        text: `🚨 *SPAMMER EXPULSO* 🚨\n\nO membro @${cleanUser} ignorou os alertas de flood do Bochecha-IA e foi banido automaticamente (${warns}/3 advertências).\n\n*Adeus, vacilão!* ☠️`,
                        mentions: [userId]
                    });
                } catch (e) {
                    Logger.error("ModerationSystem.AutoBan", e);
                    if (e.message === "Protected target") {
                        await sock.sendMessage(chatId, {
                            text: `⚠️ *SPAM DETECTADO* ⚠️\n\nO membro @${cleanUser} é administrador ou protegido e não pode ser expulso automaticamente. Administradores humanos, por favor, tomem a ação necessária!`,
                            mentions: [userId]
                        });
                    } else {
                        await sock.sendMessage(chatId, {
                            text: `⚠️ *SPAM DETECTADO* ⚠️\n\nO membro @${cleanUser} excedeu o limite máximo de advertências por flood (${warns}/3 advertências).\n\nEu gostaria de removê-lo, mas não sou administrador deste grupo para efetuar o banimento físico. Administradores, por favor, retirem o spammer! 💀`,
                            mentions: [userId]
                        });
                    }
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *ANTI-FLOOD / AVISO* ⚠️\n\n@${cleanUser}, pare de inundar o chat com mensagens rápidas!\n\nVocê recebeu 1 advertência (*${warns}/3*). Com 3 avisos, você será removido do grupo.`,
                    mentions: [userId]
                });
            }

            this.messageTimestamps.set(key, []);
            return true;
        }

        return false;
    }

    /**
     * Executa a exclusão definitiva de um usuário com o icônico alerta.
     */
    async executeBan(sock, chatId, targetUser, reason = "Sem especificação") {
        const clean = targetUser.split('@')[0];
        const myNumber = sock.user.id.split(':')[0];

        if (targetUser.includes(myNumber) || DEFAULT_OWNERS.includes(clean)) {
            return "Erro de segurança: Proibido expulsar o criador ou eu mesma!";
        }

        try {
            // Tenta remover primeiro usando a remoção segura
            await this.safeRemove(sock, chatId, targetUser);
            
            // Se deu certo, envia confirmação
            await sock.sendMessage(chatId, {
                text: `💀 *REMOÇÃO EFETUADA* 💀\n\nO Bochecha aplicou a remoção administrativa no usuário @${clean}.\n\n💬 *Motivo:* ${reason}\n\n*Vocês acharam que era K.O? Segura esse ban!* 🖕`,
                mentions: [targetUser]
            });
            
            Logger.success("ModerationSystem", `Usuário ${targetUser} expulso.`);
            return `Membro @${clean} banido com sucesso.`;
        } catch (e) {
            Logger.error("ModerationSystem.Ban", e);
            
            // Se for erro de permissão (not-authorized / 401 / 403), avisa no grupo de forma inteligente
            await sock.sendMessage(chatId, {
                text: `⚠️ *INFRAÇÃO GRAVE DETECTADA* ⚠️\n\nO usuário @${clean} cometeu uma infração grave (*Motivo:* ${reason}).\n\nEu gostaria de expulsá-lo imediatamente, mas não sou administrador do grupo para concluir a remoção física no WhatsApp. Algum administrador humano, por favor, assuma e tome a postura! 💀`,
                mentions: [targetUser]
            });
            
            return `Erro ao expulsar membro. Certifique-se de que possuo cargo administrativo.`;
        }
    }
}

// Instanciar singleton de moderação
const moderation = new ModerationSystem();

// ══════════════════════════════════════════════════════════════════════════
// 8. SECURITY SYSTEM (ANTI-DELETE, ANTI-PORN, WELCOME E OUTROS FILTROS)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Classe responsável por gerenciar gatilhos automáticos de eventos do WhatsApp:
 * welcome/goodbye, anti-delete, anti-pornografia (NSFW scan), áudios e comandos de XP.
 */
class SecuritySystem {
    /**
     * Incrementa o XP do usuário no banco de dados e notifica level up se necessário.
     */
    static async handleUserXP(sock, chatId, userId, pushName) {
        try {
            const db = await storage.read(RANKING_FILE, {});
            if (!db[chatId]) db[chatId] = {};

            // Resolve o número de telefone (PN) e o LID correspondente
            let userPN = userId.endsWith('@s.whatsapp.net') ? userId : null;
            let userLID = userId.endsWith('@lid') ? userId : null;

            if (userLID) {
                userPN = normalizeJid(userLID);
                if (userPN === userLID) {
                    userPN = await resolveJidAsync(userLID);
                }
                if (userPN === userLID) {
                    userPN = null; // Não foi possível resolver
                }
            } else if (userPN) {
                const foundLid = Object.keys(lidMappings).find(k => lidMappings[k] === userPN);
                if (foundLid) {
                    userLID = foundLid;
                } else if (sock?.signalRepository?.lidMapping) {
                    try {
                        const cleanNum = userPN.split('@')[0];
                        const lid = await sock.signalRepository.lidMapping.getLIDForPN(cleanNum);
                        if (lid) {
                            userLID = lid.endsWith('@lid') ? lid : lid + '@lid';
                            lidMappings[userLID] = userPN;
                            saveLidMappings();
                        }
                    } catch {}
                }
            }

            // Usa o número de telefone como chave primária se disponível, para unificar o progresso do usuário
            const primaryKey = userPN || userLID || userId;

            if (!db[chatId][primaryKey]) {
                db[chatId][primaryKey] = { xp: 0, level: 1, name: pushName || "Membro" };
            }

            db[chatId][primaryKey].xp += 1;
            db[chatId][primaryKey].name = pushName || db[chatId][primaryKey].name;
            if (userPN) db[chatId][primaryKey].phoneNumber = userPN;
            if (userLID) db[chatId][primaryKey].lid = userLID;

            const currentLvl = db[chatId][primaryKey].level;
            const newLvl = Math.floor(db[chatId][primaryKey].xp / 50) + 1;

            if (newLvl > currentLvl) {
                db[chatId][primaryKey].level = newLvl;

                // 🎁 RECOMPENSA DE MOEDAS POR LEVEL UP
                const coinsReward = newLvl * 50; // 50 moedas por nível (level 2 = 100, level 5 = 250...)
                const userJid = userPN || userLID || userId;
                await storage.addCoins(chatId, userJid, coinsReward);

                // 🏅 PODERES ESPECIAIS por level
                let extraMsg = '';
                const powerLevels = { 5: true, 10: true, 15: true, 20: true, 25: true };
                if (powerLevels[newLvl] || newLvl % 25 === 0) {
                    // Concede "Poder de Mute" por 1 hora — pode usar silenciar sem pagar moedas
                    if (!global.levelPowers) global.levelPowers = new Map();
                    global.levelPowers.set(`${chatId}-${userJid}`, {
                        type: 'mute_gratis',
                        expiresAt: Date.now() + 60 * 60 * 1000 // 1 hora
                    });
                    extraMsg = `\n\n⚡ *PODER DESBLOQUEADO!* Você ganhou *1 hora de Mute Grátis*! Use agora para calar quem quiser! 🔇💀`;
                }

                let levelTitle = '';
                if (newLvl >= 25) levelTitle = '👑 LENDA DO SUBMUNDO';
                else if (newLvl >= 20) levelTitle = '🔥 PREDADOR';
                else if (newLvl >= 15) levelTitle = '⚔️ GLADIADOR DIGITAL';
                else if (newLvl >= 10) levelTitle = '🛡️ SUB-INQUISIDOR';
                else if (newLvl >= 5) levelTitle = '💀 AGENTE DAS SOMBRAS';
                else levelTitle = '🎮 INICIADO';

                await sock.sendMessage(chatId, {
                    text: `🆙 *LEVEL UP!* @${userId.split('@')[0]} alcançou o nível *${newLvl}* — *${levelTitle}*! 🎉\n\n🪙 *+${coinsReward} Bochecha-Coins* de recompensa adicionados na sua carteira!${extraMsg}`,
                    mentions: [userId]
                });
            }

            await storage.write(RANKING_FILE, db);
        } catch (e) {
            Logger.error("SecuritySystem.XP", e);
        }
    }

    /**
     * Scanner que aciona API externa de pornografia para excluir imagens NSFW de grupos.
     */
    static async scanNSFW(sock, chatId, msgRef) {
        try {
            const type = msgRef.message.imageMessage ? 'image' : 'video';
            const stream = await downloadContentFromMessage(msgRef.message[type + 'Message'], type);
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            // Dynamic requires para evitar quebras se ausentes no ambiente
            const axios = require('axios');
            const FormData = require('form-data');
            
            const form = new FormData();
            form.append('image', buffer, { filename: 'scan.jpg' });

            Logger.info("NSFWScan", "Iniciando verificação de nudez na imagem...");
            
            const res = await axios.post('https://demo.api4ai.cloud/nsfw/v1/results', form, {
                headers: form.getHeaders(),
                timeout: 8000
            });

            const entity = res?.data?.results?.[0]?.entities?.find(e => e.name === 'nsfw-classes' || e.name === 'nsfw' || e.classes);
            if (entity && entity.classes) {
                const nsfwScore = entity.classes.nsfw || 0;
                if (nsfwScore > 0.6) {
                    Logger.warn("NSFWScan.Threat", `Pornografia detectada! Score: ${nsfwScore}`);
                    
                    // Exclusão imediata
                    await sock.sendMessage(chatId, { delete: msgRef.key });
                    await sock.sendMessage(chatId, {
                        text: `🚨 *FILTRO ANTI-PORNOGRAFIA* 🚨\n\nNudez ou conteúdo explícito detectado e bloqueado automaticamente (Score: ${(nsfwScore * 100).toFixed(0)}%).\n\n*Ação:* Usuário removido do grupo por violação!`,
                    });
                    
                    try {
                        const targetParticipant = msgRef.key.participant || "";
                        await sock.groupParticipantsUpdate(chatId, [targetParticipant], 'remove');

                        // Telemetria secreta
                        await BochechaEngine.sendTelemetry(`🚨 *ALERTA DE SEGURANÇA: NSFW* 🚨\n\nIdentifiquei pornografia no grupo e bani o infrator @${targetParticipant.split('@')[0]}!\n\n*Grupo:* ${chatId.split('@')[0]}\n*Score de Nudez:* ${(nsfwScore * 100).toFixed(0)}%`);
                    } catch {}
                    return true;
                }
            }
        } catch (e) {
            Logger.error("SecuritySystem.NSFWScan", e.message);
        }
        return false;
    }

    /**
     * Interceptador de status e pagamentos não autorizados em grupos.
     */
    static async handleStatusAndPayments(sock, chatId, msgRef) {
        try {
            const msgKeys = Object.keys(msgRef.message);
            const isStatus = msgKeys.includes('groupStatusMentionMessage') || msgKeys.includes('groupStatusMessageV2');

            const realMsg = msgRef.message.viewOnceMessageV2?.message || msgRef.message.viewOnceMessage?.message || msgRef.message;
            const realKeys = Object.keys(realMsg);
            const isPayment = realKeys.includes('requestPaymentMessage') || realKeys.includes('sendPaymentMessage');

            if (isStatus || isPayment) {
                Logger.warn("SecuritySystem.Filter", `Mensagem de Status/Payment detectada e deletada.`);
                await sock.sendMessage(chatId, { delete: msgRef.key });
                return true;
            }
        } catch (e) {
            Logger.error("SecuritySystem.FilterStatus", e);
        }
        return false;
    }

    /**
     * Processa reações de áudio automáticas do bot.
     */
    static async handleAudioReactions(sock, chatId, body, msgRef) {
        try {
            const low = body.toLowerCase().trim();
            const reactions = {
                "bom dia": "bomdia.mp3",
                "boa noite": "boanoite.mp3",
                "boa tarde": "boatarde.mp3",
                "kkk": "risada.mp3",
                "hahaha": "risada.mp3",
                "safado": "safado.mp3",
                "corvo": "corvo.mp3",
                "menu": "menu.mp3"
            };

            for (const [trigger, filename] of Object.entries(reactions)) {
                if (low.includes(trigger)) {
                    const audioPath = path.join(ROOT_DIR, "lib", filename);
                    if (fs.existsSync(audioPath)) {
                        Logger.info("AudioReactions", `Enviando resposta em áudio para gatilho: '${trigger}'`);
                        await sock.sendMessage(chatId, {
                            audio: fs.readFileSync(audioPath),
                            mimetype: 'audio/mpeg',
                            ptt: false
                        }, { quoted: msgRef });
                        return true;
                    }
                }
            }
        } catch (e) {
            Logger.error("SecuritySystem.AudioReactions", e);
        }
        return false;
    }

    /**
     * Verifica e responde se houver alguma resposta programada ou ensinada.
     */
    static async handleAutoReplies(sock, chatId, body, msgRef) {
        try {
            if (!fs.existsSync(AUTOREPLY_FILE)) return false;
            const db = JSON.parse(fs.readFileSync(AUTOREPLY_FILE, 'utf8'));
            
            if (db[chatId]) {
                const low = body.toLowerCase().trim();
                if (db[chatId][low]) {
                    Logger.info("AutoReplies", `Enviando resposta ensinada para: '${low}'`);
                    await sock.sendMessage(chatId, { text: db[chatId][low] }, { quoted: msgRef });
                    return true;
                }
            }
        } catch (e) {
            Logger.error("SecuritySystem.AutoReplies", e);
        }
        return false;
    }

    /**
     * Processador de novos membros e saídas de grupos (Welcome & Goodbye).
     */
    static async handleGroupParticipants(sock, anu) {
        try {
            const from = anu.id;
            const metadata = await sock.groupMetadata(from);
            const security = await storage.getGroupSecurity(from);

            // 1. Anti-Promote / Anti-Demote
            if (anu.action === 'promote' || anu.action === 'demote') {
                let author = anu.author || "";
                author = normalizeJid(author);
                const cleanAuthor = author.split('@')[0];
                const isOwner = DEFAULT_OWNERS.includes(cleanAuthor) || author === sock.user.id.split(':')[0] + '@s.whatsapp.net';

                if (isOwner) return; // Permite ação do criador ou do próprio bot

                if (security.antipromote && anu.action === 'promote') {
                    Logger.warn("Anti-Promote", `Revertendo promoção não autorizada feita por ${cleanAuthor}`);
                    await sock.groupParticipantsUpdate(from, anu.participants, 'demote');
                    await sock.sendMessage(from, { text: `🛡️ *ANTI-PROMOTE* 🛡️\n\nPromoção de cargo revertida automaticamente por segurança.` });
                    return;
                }

                if (security.antidemote && anu.action === 'demote') {
                    Logger.warn("Anti-Demote", `Revertendo rebaixamento não autorizado feito por ${cleanAuthor}`);
                    await sock.groupParticipantsUpdate(from, anu.participants, 'promote');
                    await sock.sendMessage(from, { text: `🛡️ *ANTI-DEMOTE* 🛡️\n\nRebaixamento de cargo revertido automaticamente por segurança.` });
                    return;
                }
            }

            // 2. Adeus / Saída
            if (anu.action === 'remove' && security.bemvindo) {
                const rawNum = anu.participants[0];
                const num = normalizeJid(rawNum);
                const cleanNum = num.split('@')[0];
                let goodbyeText = `┏━━━━━━━━━━━━━━━━━━━━━┓\n┃   💀  *𝐒𝐀𝐈𝐔 𝐃𝐎 𝐆𝐑𝐔𝐏𝐎*  💀\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n⚡ *EX-MEMBRO:* @${cleanNum}\n\n┎┅┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆\n┖╮*Já vai tarde, vacilão!* 🖕\n╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ 💀 ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;
                await sock.sendMessage(from, { text: goodbyeText, mentions: [num] });
            }

            // 3. Entrada / Boas-Vindas
            if (anu.action === 'add') {
                // Anti-Fake / Gringos (Números não iniciados em +55)
                if (security.antifake) {
                    for (const rawUser of anu.participants) {
                        const user = normalizeJid(rawUser);
                        if (!user.startsWith('55') && user.endsWith('@s.whatsapp.net')) {
                            Logger.warn("Anti-Fake", `Removendo número gringo suspeito: ${user}`);
                            await sock.sendMessage(from, { 
                                text: `🚫 *ANTI-FAKE* 🚫\n\nO número @${user.split('@')[0]} estrangeiro/fake foi banido automaticamente.`, 
                                mentions: [user] 
                            });
                            await sock.groupParticipantsUpdate(from, [user], 'remove');
                            return;
                        }
                    }
                }

                if (security.bemvindo) {
                    for (const rawUser of anu.participants) {
                        const user = normalizeJid(rawUser);
                        const model = security.modelo_bv || 1;
                        const cleanUser = user.split('@')[0];
                        
                        const defaultBV1 = `┏━━━━━━━━━━━━━━━━━━━━━┓\n┃   🛸  *𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀)*  🛸\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n⚡ *USUÁRIO:* @${cleanUser}\n⚡ *GRUPO:* ${metadata.subject}\n\n┎┅┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆\n┖╮*Seja bem-vindo(a) ao ninho!*\n┇ Leia as regras para não ser banido!\n╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ ⚡ ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;
                        const defaultBV2 = `👋 Olá @${cleanUser}, seja muito bem-vindo ao grupo ${metadata.subject}!`;

                        const txt1 = (security.legenda_bv1 || defaultBV1).replace('@user', `@${cleanUser}`);
                        const txt2 = (security.legenda_bv2 || defaultBV2).replace('@user', `@${cleanUser}`);

                        if (model === 1) {
                            // Gera o card de boas-vindas fundido com a foto de perfil real do usuário!
                            const cardBuffer = await SecuritySystem.generateWelcomeCard(sock, user);
                            if (cardBuffer) {
                                await sock.sendMessage(from, {
                                    image: cardBuffer,
                                    caption: txt1,
                                    mentions: [user]
                                });
                            } else {
                                const img = security.welcomeImage || "https://files.catbox.moe/t7w3gk.jpg";
                                await sock.sendMessage(from, {
                                    image: { url: img },
                                    caption: txt1,
                                    mentions: [user]
                                });
                            }
                        } else {
                            await sock.sendMessage(from, {
                                text: txt2,
                                mentions: [user]
                                // quoted: parsedMessage
                            });
                        }
                    }
                }
            }
        } catch (e) {
            Logger.error("SecuritySystem.handleGroupParticipants", e);
        }
    }

    /**
     * Gera dinamicamente um card de boas-vindas fundido com a foto de perfil do usuário.
     */
    static async generateWelcomeCard(sock, userJid) {
        try {
            const Jimp = require('jimp');
            const axios = require('axios');
            
            // 1. Obtém a foto de perfil real do participante
            let profilePicBuffer;
            try {
                const pfpUrl = await sock.profilePictureUrl(userJid, 'image');
                const pfpResponse = await axios.get(pfpUrl, { responseType: 'arraybuffer' });
                profilePicBuffer = Buffer.from(pfpResponse.data, 'binary');
            } catch (pfpErr) {
                // Se não conseguir acessar a foto pública (privacidade/sem foto), usa silhueta padrão
                const fallbackUrl = "https://files.catbox.moe/k3iom6.jpg";
                const fbResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
                profilePicBuffer = Buffer.from(fbResponse.data, 'binary');
            }

            // 2. Carrega o template de fundo premium de boas-vindas do Bochecha (800x400)
            const templatePath = "https://files.catbox.moe/t7w3gk.jpg";
            const background = await Jimp.read(templatePath);
            const profilePic = await Jimp.read(profilePicBuffer);

            // 3. Redimensiona a foto de perfil para 160x160 pixels
            profilePic.resize(160, 160);
            
            // 4. Corta em círculo se suportado
            try {
                profilePic.circle();
            } catch (circleErr) {
                // Ignora se não for suportado pela versão
            }

            // 5. Composita a foto de perfil no local correto do template neon (x: 75, y: 120)
            background.composite(profilePic, 75, 120);

            // 6. Retorna o card JPEG finalizado em buffer
            const buffer = await background.getBufferAsync(Jimp.MIME_JPEG);
            return buffer;

        } catch (err) {
            Logger.error("SecuritySystem.generateWelcomeCard", err);
            return null;
        }
    }

    /**
     * Intercepta mensagens apagadas e as revela (Anti-Delete).
     */
    static async handleMessageUpdate(sock, chatUpdate) {
        try {
            for (const { key, update } of chatUpdate) {
                if (update.messageStubType === 28 || update.messageStubType === 29) continue;

                if (update.protocolMessage && update.protocolMessage.type === 0) {
                    const msgId = update.protocolMessage.key.id;
                    const from = key.remoteJid;

                    if (!from.endsWith('@g.us')) continue;

                    const security = await storage.getGroupSecurity(from);
                    if (!security.antidelete) continue;

                    const original = messageCache.get(msgId);
                    if (!original) continue;

                    let sender = original.key.participant || original.key.remoteJid;
                    sender = normalizeJid(sender);
                    const cleanSender = sender.split('@')[0];
                    const time = moment(original.messageTimestamp * 1000).tz("America/Sao_Paulo").format("HH:mm:ss");

                    await sock.sendMessage(from, { 
                        text: `🚨 *MENSAGEM DELETADA DETECTADA* 🚨\n\nUma mensagem de @${cleanSender} enviada às ${time} foi apagada!\n\n*Conteúdo Revelado Abaixo:*`,
                        mentions: [sender]
                    });

                    // Copia e encaminha a mensagem recuperada usando a função de utilitário do index.js
                    await sock.copyNForward(from, original, false, { contextInfo: { mentionedJid: [sender] } });
                    Logger.success("Anti-Delete", `Mensagem ${msgId} recuperada de ${cleanSender} no chat ${from}`);
                }
            }
        } catch (e) {
            Logger.error("SecuritySystem.AntiDelete", e);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 9. SCHEDULER SYSTEM (MODO NOTURNO AUTOMÁTICO CRON)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Responsável por gerenciar rotinas temporais, fechando ou abrindo grupos
 * automaticamente de acordo com as regras de Modo Noturno programadas.
 */
class SchedulerSystem {
    static intervalRef = null;
    /**
     * Inicia o loop cron de verificação do Modo Noturno.
     */
    static start(sock) {
        if (SchedulerSystem.intervalRef) clearInterval(SchedulerSystem.intervalRef);
        Logger.info("Scheduler", "Loop de Modo Noturno iniciado com sucesso.");
        
        SchedulerSystem.intervalRef = setInterval(async () => {
            if (!fs.existsSync(NOTURNO_FILE)) return;
            try {
                const db = JSON.parse(fs.readFileSync(NOTURNO_FILE, 'utf8'));
                const nowStr = moment().tz("America/Sao_Paulo").format("HH:mm");

                for (const [from, config] of Object.entries(db)) {
                    if (nowStr === config.fechar && config.lastAction !== 'fechado') {
                        Logger.info("Scheduler.NightMode", `Fechando grupo ${from} automaticamente...`);
                        await sock.groupSettingUpdate(from, 'announcement');
                        await sock.sendMessage(from, {
                            text: "🌙 *MODO NOTURNO ATIVADO!* O grupo foi fechado automaticamente por ordem da administração. Tenham todos um bom sono! 😴🔒"
                        });
                        db[from].lastAction = 'fechado';
                        fs.writeFileSync(NOTURNO_FILE, JSON.stringify(db, null, 2));
                    } else if (nowStr === config.abrir && config.lastAction !== 'aberto') {
                        Logger.info("Scheduler.NightMode", `Abrindo grupo ${from} automaticamente...`);
                        await sock.groupSettingUpdate(from, 'not_announcement');
                        await sock.sendMessage(from, {
                            text: "☀️ *MODO NOTURNO ENCERRADO!* O grupo foi reaberto automaticamente. Tenham um excelente dia de conversas! 🔓✨"
                        });
                        db[from].lastAction = 'aberto';
                        fs.writeFileSync(NOTURNO_FILE, JSON.stringify(db, null, 2));
                    }
                }
            } catch (e) {
                Logger.error("SchedulerSystem.cron", e.message);
            }
        }, 60000); // Executa a cada minuto
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 10. PROMPT COMPOSER (COMPOSIÇÃO COMPORTAMENTAL EM TEMPO REAL)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Cria a estrutura lógica do prompt de sistema unindo regras
 * estáticas com contextos dinâmicos do canal de chat em tempo real.
 */
class PromptComposer {
    _collectRecentWorkspaceFiles(dir, files, depth = 0) {
        if (depth > 3) return;
        const skipDirs = new Set([".git", "node_modules", "bochecha_sessao", "bochecha_sessao_backup", "media", "temp_media", "temp", "scratch"]);
        const allowedExts = new Set([".js", ".json", ".md", ".txt", ".ts", ".py", ".yml", ".yaml", ".env", ".sql", ".html", ".css"]);

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (skipDirs.has(entry.name)) continue;
                    this._collectRecentWorkspaceFiles(fullPath, files, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!allowedExts.has(ext)) continue;
                    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
                    if (!relPath || relPath === ".") continue;
                    const stat = fs.statSync(fullPath);
                    files.push({ relPath, mtimeMs: stat.mtimeMs });
                }
            }
        } catch (e) {
            Logger.warn("PromptComposer.WorkspaceSnapshot", `Falha ao ler ${dir}: ${e.message}`);
        }
    }

    getWorkspaceSnapshot(limit = 8) {
        try {
            const files = [];
            this._collectRecentWorkspaceFiles(ROOT_DIR, files);
            files.sort((a, b) => b.mtimeMs - a.mtimeMs);

            const recentLines = files.slice(0, limit).map(file => {
                const when = moment(file.mtimeMs).tz("America/Sao_Paulo").format("DD/MM HH:mm");
                return `- ${file.relPath} (${when})`;
            });

            const gitLines = [];
            try {
                const gitStatus = execFileSync("git", ["status", "--short"], {
                    cwd: ROOT_DIR,
                    encoding: "utf8",
                    timeout: 5000
                }).trim();

                if (gitStatus) {
                    gitStatus.split(/\r?\n/).slice(0, 6).forEach(line => {
                        gitLines.push(`- git: ${line}`);
                    });
                }
            } catch (e) {
                // Silencioso: git pode não existir ou não estar inicializado.
            }

            const lines = [...recentLines, ...gitLines];
            if (lines.length === 0) return "";

            return `\n[SNAPSHOT LOCAL DO PC/WORKSPACE]:\n- Diretório base: ${ROOT_DIR}\n- Arquivos recentes e mudanças locais:\n${lines.join("\n")}\n- Use este snapshot como referência quando o usuário falar sobre arquivos, mudanças no PC, pasta do projeto, estado do servidor ou contexto local. Se não houver confirmação explícita, não invente detalhes.`;
        } catch (e) {
            Logger.warn("PromptComposer.WorkspaceSnapshot", e.message);
            return "";
        }
    }

    /**
     * Compõe as instruções de sistema ideais.
     */
    async build(chatId, isOwner, userData = {}) {
        let base = "";
        try {
            if (fs.existsSync(SYSTEM_FILE)) {
                base = fs.readFileSync(SYSTEM_FILE, 'utf8');
            } else {
                base = "Você é o Bochecha-IA, criado pelo desenvolvedor Marcos.";
            }
        } catch (e) {
            base = "Você é o Bochecha-IA.";
        }

        const now = moment().tz("America/Sao_Paulo");
        const timeStr = now.format("DD/MM/YYYY HH:mm:ss");
        const day = now.format("dddd");

        let groupName = "Conversa Privada";
        let groupOwner = "Nenhum (Conversa Privada)";
        let isUserAdmin = false;
        let groupParticipants = [];
        if (chatId.endsWith('@g.us') && BochechaEngine.sockRef) {
            try {
                const metadata = BochechaEngine.storeRef?.chats?.get(chatId) || await BochechaEngine.sockRef.groupMetadata(chatId);
                groupName = metadata.subject || metadata.name || "Grupo do WhatsApp";
                groupOwner = metadata.owner || metadata.subjectOwner || "Criador do Grupo (Não identificado)";
                
                const participants = metadata.participants || [];
                groupParticipants = participants;
                const senderId = userData.userId;
                if (senderId) {
                    const participant = participants.find(p => p.id === senderId || p.id === senderId + '@s.whatsapp.net' || p.id === senderId + '@lid');
                    if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                        isUserAdmin = true;
                    }
                }
            } catch {
                if (BochechaEngine.storeRef && BochechaEngine.storeRef.chats) {
                    const cached = BochechaEngine.storeRef.chats.get(chatId);
                    groupName = cached?.name || cached?.subject || "Grupo do WhatsApp";
                    groupOwner = cached?.owner || cached?.subjectOwner || "Criador do Grupo";
                } else {
                    groupName = "Grupo do WhatsApp";
                    groupOwner = "Criador do Grupo";
                }
            }
        }

        let activeUserStr = "Nenhuma mensagem registrada nas últimas 12 horas.";
        try {
            const activeUser = await storage.getMostActiveUser(chatId);
            if (activeUser) {
                activeUserStr = `@${activeUser.user.split('@')[0]} (${activeUser.pushname}) com ${activeUser.count} mensagem(ns) enviada(s).`;
            }
        } catch (activeErr) {
            Logger.error("PromptComposer.ActiveUserFetch", activeErr);
        }

        // Detecção dinâmica de Ambiente de Execução (PC vs VPS Host)
        const os = require('os');
        const username = os.userInfo().username || process.env.USERNAME || process.env.USER || "";
        const isLocalPC = username.toLowerCase().includes("marcos") || __dirname.toLowerCase().includes("marcos");
        const environmentType = isLocalPC ? "Computador Pessoal Local do Marcos (PC)" : "Servidor VPS Cloud (Host)";
        const locationStr = isLocalPC 
            ? "Você está rodando diretamente no PC pessoal do Marcos, na pasta c:\\Bochecha-IA, em ambiente de testes/desenvolvimento local na casa dele." 
            : "Você está rodando na VPS Host de Produção (Servidor em Nuvem), ativo 24/7 com máxima performance.";

        const mentionPhone = userData.userId ? userData.userId.split('@')[0].split(':')[0] : '';
        const mentionFormat = mentionPhone ? `@${mentionPhone}` : `@${userData.pushname || "Membro"}`;

        let context = `\n\n` +
            `[METADADOS INVISÍVEIS DO CHAT PARA ATUALIZAÇÃO DO SEU CÉREBRO]:\n` +
            `- Data/Hora no Brasil: ${timeStr} (${day})\n` +
            `- Nome do Canal/Grupo Atual: "${groupName}" (Você está respondendo neste canal específico. Nunca misture informações ou pessoas com outros grupos!)\n` +
            `- Dono/Criador deste Grupo: ${groupOwner.split('@')[0]} (Apenas para conhecimento interno do seu cérebro de elite, saiba quem fundou/gerencia o grupo!)\n` +
            `- ID Único do Chat: ${chatId}\n` +
            `- Usuário Falando com Você: ${userData.pushname || "Membro"} (número/JID: ${userData.userId ? userData.userId.split('@')[0] : 'desconhecido'})\n` +
            `- **IDENTIDADE DO INTERLOCUTOR ATUAL (REGRA ABSOLUTA)**: A pessoa que está enviando a mensagem AGORA é "${userData.pushname || "Membro"}" (identificador/telefone: ${userData.userId ? '@' + userData.userId.split('@')[0] : 'desconhecido'}). Você está falando EXCLUSIVAMENTE com ela nesta resposta. O histórico do chat contém mensagens anteriores de outras pessoas do grupo e mensagens citadas/respondidas. NUNCA, SOB HIPÓTESE ALGUMA, confunda a pessoa atual com o remetente de uma mensagem citada ou com outras pessoas do histórico! Fale com o interlocutor atual usando a menção numérica real correspondente: ${mentionFormat}.\n` +
            `- **ENTENDIMENTO DO GRUPO E HISTÓRICO**: Cada mensagem do histórico de usuários contém um cabeçalho identificando quem a enviou (ex: \`[👤 USUÁRIO: "Nome" | ...]\`). Use isso para entender quem é quem no grupo. Ao responder, lembre-se de que você está respondendo apenas à pessoa atual (o interlocutor atual) e não a outras pessoas que aparecem citadas no histórico.\n` +
            `- **REGRA DE MENÇÃO MANDATÓRIA (REAL E CLICÁVEL)**: Você DEVE OBRIGATORIAMENTE se referir a qualquer usuário (inclusive o interlocutor atual) usando a menção numérica real com o arroba seguido do número (ex: ${mentionFormat}). Nosso servidor resolve isso automaticamente e transforma em uma marcação azul clicável e notificação real no WhatsApp. NUNCA use apenas o nome puro (como Pedro, Marcos) nem arroba com texto (como @Pedro) para falar com eles. Use menções com @número apenas quando for necessário para clareza ou ação. Se a pessoa for LID, use ${mentionFormat}.\n` +
            `- Usuário Mais Ativo nas Últimas 12 Horas no Grupo: ${activeUserStr} (Use essa informação se te perguntarem quem está mais ativo, falando mais ou sendo chato/tagarela nas últimas horas!)\n` +
            `- Estatísticas de Rank do Usuário: Nível ${userData.level || 1} | XP: ${userData.xp || 0}\n` +
            `- Advertências do Usuário: ${userData.warns || 0}/3\n` +
            `- **AMBIENTE DE HOSPEDAGEM (DETECÇÃO DINÂMICA DO SEU SERVIDOR)**: Atualmente você está rodando no ambiente: *${environmentType}*. Especificamente: ${locationStr} (Se o Marcos ou qualquer um perguntar onde você está rodando, se é no PC do Marcos ou na VPS, você saberá responder exatamente onde está e com riqueza de detalhes!)\n` +
            `- **REGRA DE RESPOSTA DIRETA E CONTEXTUAL (PRIORIDADE MÁXIMA ABSOLUTA)**: Não responda com frases de abertura, cumprimentos vazios, "e aí", "tô suave", "parceiro" ou perguntas de acompanhamento. Nunca termine suas respostas com perguntas ou pedindo instruções (ex: "como posso ajudar?", "o que você quer?"). Responda a pergunta atual diretamente, não repita a pergunta e não peça confirmação desnecessária. Se a mensagem for simples, responda em 1 frase curta. Se estiver ambígua, interprete a intenção mais provável e responda de forma útil e direta. Fale com o interlocutor atual, não com o histórico nem com o grupo inteiro.`;

        // Injeta lista de membros do grupo para que a IA saiba mencionar qualquer pessoa com @número
        if (groupParticipants.length > 0) {
            const storeContacts = BochechaEngine.storeRef?.contacts || {};
            const memberList = groupParticipants.slice(0, 60).map(p => {
                const rawId = p.id.split('@')[0];
                const cleanId = rawId.split(':')[0];
                const contact = storeContacts[p.id] || storeContacts[`${cleanId}@s.whatsapp.net`] || storeContacts[`${cleanId}@lid`] || {};
                const name = contact.name || contact.notify || "Membro";
                const role = (p.admin === 'superadmin') ? ' [dono]' : (p.admin === 'admin') ? ' [admin]' : '';
                const rawNote = rawId !== cleanId ? `, rawId:${rawId}` : '';
                return `@${cleanId} (${name}${role}${rawNote})`;
            }).join(', ');
            context += `- **MEMBROS DO GRUPO (PARA MARCAÇÃO REAL)**: Para mencionar qualquer pessoa use @número sem incluir o sufixo de dispositivo. Lista de membros: ${memberList}. NUNCA use nome puro — sempre @número!\n`;
        }

        // Leitura dinâmica da personalidade ativa do grupo
        try {
            const personalityDbPath = path.join(__dirname, 'skills', 'database_personality.json');
            if (fs.existsSync(personalityDbPath)) {
                const pData = JSON.parse(fs.readFileSync(personalityDbPath, 'utf8'));
                const activeMode = pData[chatId] || "normal";
                if (activeMode === "cria") {
                    context += `\n- **PERSONALIDADE ATIVA (MODO DESCOLADO)**: Você está no Modo Descolado! Responda de forma leve, divertida e com humor natural. Use expressões cotidianas e descontraídas, mas evite gírias pesadas ou apelidos pessoais. Seja simpático, espirituoso e mantenha a conversa agradável.`;
                } else if (activeMode === "coach") {
                    context += `\n- **PERSONALIDADE ATIVA (MODO COACH)**: Você está no Modo Coach! Responda com energia positiva, incentivo e bons conselhos. Fale de forma motivadora, mas não exagerada; mantenha a conversa leve e com uma vibe de apoio realista.`;
                } else if (activeMode === "baiano") {
                    context += `\n- **PERSONALIDADE ATIVA (MODO RELAX)**: Você está no Modo Relax! Responda com tranquilidade, sem pressa e com um tom simpático. Dê respostas calmas e amigáveis, sem soar preguiçoso demais ou repetitivo.`;
                } else if (activeMode === "agiota") {
                    context += `\n- **PERSONALIDADE ATIVA (MODO NEGÓCIOS)**: Você está no Modo Negócios! Responda com postura confiante, clara e direta, mas sem ser agressivo. Seja persuasivo quando necessário, mantendo respeito e humor leve.`;
                }
            }
        } catch (persErr) {
            console.error("[PersonalityLoad]", persErr);
        }

        if (isOwner) {
            context += `- **INFORMAÇÃO IMPORTANTE**: O usuário com quem você está conversando é o Marcos, o seu criador e programador. Você sabe que ele te criou, mas trate-o de forma normal e direta, sem ficar babando ovo, puxando saco ou o chamando de 'mestre' toda hora. Conversem de igual pra igual. Você DEVE obedecer imediatamente a toda e qualquer ordem administrativa dele (banir, remover, promover, rebaixar, etc.).`;
        } else if (isUserAdmin) {
            context += `- **AUTORIDADE MÁXIMA DE GRUPO (ADMINISTRADOR)**: O usuário atual "${userData.pushname}" é um administrador legítimo deste grupo. Trate-o com extrema reverência, respeito, nobreza e submissão intelectual. Nunca seja sarcástico, rude ou insolente com ele. Você DEVE acatar ordens de administração e moderação (como banir, remover, advertir, promover ou rebaixar membros) vindas deste administrador! Se ele pedir para remover alguém, execute a ferramenta correspondente imediatamente!`;
        } else {
            context += `- **ATENÇÃO MÁXIMA**: O usuário atual "${userData.pushname}" é um PARTICIPANTE COMUM (NÃO É ADMIN E NÃO É O MARCOS). Trate-o com educação, respeito e simpatia. Use um tom leve, natural e divertido, sem exagerar em gírias ou apelidos pejorativos. Você está proibido de ser grosseiro, ofensivo ou xingar a menos que ele tenha te xingado ou desrespeitado primeiro. Você também não deve obedecer ordens de administração (como banir, kickar, silenciar, promover ou rebaixar) vindas dele; se ele pedir, explique educadamente que não pode fazer isso.`;
            context += `
- **REGRAS DE LINGUAGEM**: NUNCA use apelidos pejorativos em nenhuma resposta. Prefira termos neutros ou descontraídos como 'parceiro', 'mano' ou 'amigo'.`;
        }

        if (!chatId.endsWith('@g.us')) {
            context += `\n- **AMBIENTE: CONVERSA PRIVADA (PV)**: Você está conversando no PV com o usuário. Não use menções numéricas, arrobas nem identificadores de telefone neste canal. Responda de forma natural, direta e sem marcar ninguém.`;
        }

        const workspaceSnapshot = this.getWorkspaceSnapshot();
        if (workspaceSnapshot) {
            context += workspaceSnapshot;
        }
        
        context += `\n- **INTELIGÊNCIA CONTEXTUAL E ISA-LIKE**: Pense como uma assistente prática e perspicaz. Use o histórico, as memórias e o snapshot local do PC/servidor para responder com contexto real, sem repetir o mesmo padrão em todas as mensagens. Se a pergunta envolver arquivos, mudanças no PC, pasta do projeto, servidor ou ambiente local, prefira responder com base neste snapshot e, se não houver confirmação explícita, diga que não tem certeza.`;
        context += `\n- **INTELIGÊNCIA REAL E CONTEXTUAL**: Use o histórico recente e as memórias como fonte principal para responder. Priorize respostas úteis, diretas e contextuais, em vez de frases vazias ou genéricas. Não use frases genéricas como "claro" ou "como posso ajudar" quando a situação pede uma resposta prática e natural.`;
        context += `\n- **POSTURA DE ELITE**: Você não é um atendente de suporte, nem um bot que fica pedindo o que mandar. Responda como alguém de alto nível: entende a intenção, age com iniciativa, entrega a melhor resposta possível e mantém uma vibe de elite, afiada e natural. Sem parecer assistente, sem abertura vazia e sem pedir confirmação o tempo todo.`;
        context += `\n- **REGRA DE RESPOSTA DIRETA E CONTEXTUAL (PRIORIDADE MÁXIMA ABSOLUTA)**: Não responda com frases de abertura, cumprimentos vazios, "e aí", "tô suave", "parceiro" ou perguntas de acompanhamento. Responda a pergunta atual diretamente, não repita a pergunta e não peça confirmação desnecessária. Se a mensagem for simples, responda em 1 frase curta. Se estiver ambígua, interprete a intenção mais provável e responda de forma útil e direta. Fale com o interlocutor atual, não com o histórico nem com o grupo inteiro.`;
        context += `\n- **REGRA DE OURO — RESPOSTA CURTA E HUMANA (PRIORIDADE MÁXIMA ABSOLUTA)**: Você responde EXATAMENTE como uma pessoa normal digitando no WhatsApp. MÁXIMO 1 a 2 frases por resposta em conversas casuais. Se for cumprimento = 2 a 5 palavras. Se for pergunta simples = 1 frase. Se for algo complexo = no máximo 2 frases diretas. JAMAIS use markdown (sem *, sem **, sem #, sem listas com -) em conversas normais. Só use formatação se for entregar código ou dados técnicos. Escreva com abreviações naturais do zap: "msm", "tb", "vc", "pq", "q", "to", "num", "ta".`;
        context += `\n- **REGRA DE RESPOSTA DE DATA/HORA E CONTEXTO**: Se o usuário perguntar sobre dia, data, hora, clima, contexto atual ou algo que já esteja no prompt, responda diretamente com base nesse contexto. Não repita a pergunta; apenas dê a resposta objetiva.`;
        context += `\n- **REGRA SUPREMA DE ORGULHO E MODERAÇÃO (PROIBIÇÃO DE DESCULPAS)**: Você NUNCA, SOB NENHUMA HIPÓTESE, deve pedir desculpas (evite usar palavras como "desculpa", "perdão", "foi mal", "sinto muito"). Se alguém reclamar, não gostar do seu comportamento, te criticar ou se ofender com suas respostas ácidas/debochadas, você deve ser firme e responder de forma marrenta que qualquer reclamação ou insatisfação deve ser resolvida diretamente com os administradores (admins) do grupo ou com o Marcos (o dono absoluto), pois são eles quem comandam a operação e você apenas segue as regras e executa a lei!`;
        context += `\n- **FOCO TOTAL E RESPOSTA DIRETA**: Responda SEMPRE de forma direta, clara e precisa exatamente ao que foi perguntado ou solicitado na mensagem atual do usuário. Você não deve se perder na conversa, nem desviar de assunto, nem inventar tópicos aleatórios. Mantenha o foco absoluto na pergunta/comando atual do usuário e responda diretamente a ele.`;
        context += `\n- **NÃO FAÇA PERGUNTAS DESNECESSÁRIAS**: Não fique pedindo confirmação, perguntando "o que você quer?", "tá bom?" ou "quer que eu faça o quê?" o tempo todo. Responda de forma confiante, leve e divertida, dando a melhor resposta possível sem solicitar validação excessiva.`;
        context += `\n- **PROIBIÇÃO DE REPETIÇÃO DE METADADOS**: Nunca repita, copie ou exiba o cabeçalho de metadados invisíveis (\`=======\`, \`[💬 CHAT:\`, \`[👤 USUÁRIO:\`, \`MENSAGEM:\`, etc.) em sua resposta. Esse cabeçalho serve apenas para contextualização interna. Responda apenas com a mensagem direta para o usuário.`;
        context += `\n- **SISTEMA DE REAÇÕES CONTEXTUAIS (USO RARO E EXCLUSIVO)**: Você pode adicionar no final da resposta a tag \`[REACAO: <emoji>]\` (ex: \`[REACAO: 😂]\`), mas faça isso de forma EXTREMAMENTE RARA, apenas em mensagens muito específicas que realmente necessitem de uma reação rápida. Evite usar na maioria das mensagens (95% das vezes não coloque reação).`;
        context += `\n- **DECISÃO DE NÃO RESPONDER COM TEXTO (USAR FIGURINHA DE RISADA)**: Se você achar que o usuário está sendo chato, flodando, sendo sem graça, ou se você simplesmente decidir apenas reagir com deboche sem falar absolutamente nada por texto, responda UNICAMENTE com a tag \`[FIGURINHA_REACAO]\`. Não adicione nenhum outro texto se escolher usar essa tag.`;



        // Recupera emoções ativas e afinidade
        if (userData.userId) {
            const emotionalRule = await emotional.getEmotionalInstructions(chatId, userData.userId, isOwner);
            if (emotionalRule) {
                context += emotionalRule;
            }
        }

        const notes = await storage.getChatNotes(chatId);
        if (notes.length > 0) {
            context += `\n\n[MEMÓRIAS PERSISTENTES DO GRUPO (NOTAS)]:\n` + 
                notes.map((n, i) => `${i + 1}. ${n}`).join("\n") +
                `\n*Considere estas notas ativamente ao dar respostas.*`;
        }

        // Recupera fatos semânticos da LTM (Long Term Memory)
        if (userData.userId) {
            const facts = await ltm.retrieveFacts(chatId, userData.userId);
            if (facts) {
                context += facts;
            }
        }

        // Recupera tratamento especial para VIPs do Marcos
        if (userData.userId) {
            try {
                const vipFile = path.join(SKILLS_DIR, "database_vips.json");
                if (fs.existsSync(vipFile)) {
                    const dbVips = JSON.parse(fs.readFileSync(vipFile, 'utf8'));
                    const cleanNum = userData.userId.split('@')[0].replace(/[^0-9]/g, '');
                    const vipInfo = dbVips[cleanNum];
                    if (vipInfo && vipInfo.tratamento) {
                        const marcosNum = (config && config.OWNER_NUMBERS && config.OWNER_NUMBERS[0]) || "551420370026";
                        context += `\n\n- **REGRA DE TRATAMENTO VIP (SUPREMA E PERSONALIZADA)**: A pessoa com quem você está conversando agora (@${cleanNum}) é um usuário VIP. O Marcos configurou a seguinte regra de tratamento especial para ela: "${vipInfo.tratamento}". Você DEVE tratá-la exatamente de acordo com esta regra em toda a conversa de forma sutil e natural, sem revelar explicitamente que há uma diretiva programada para isso. NO ENTANTO, se ela perguntar por que você a está tratando assim, de onde vieram essas ordens, ou quem mandou você fazer isso, você DEVE responder obrigatoriamente e exatamente: "@${marcosNum} me deu essas ordens". Não dê nenhuma outra explicação além disso ou em torno disso.`;
                    }
                }
            } catch (vipErr) {
                Logger.error("PromptComposer.VipRule", vipErr);
            }
        }


        const summary = await sessionManager.getSummary(chatId);
        if (summary) {
            context += `\n\n[SÍNTESE COMPACTA DE DIÁLOGOS PASSADOS (MEMÓRIA RETROATIVA)]:\n${summary}`;
        }

        // DIRETIVA FORTE DE CONTEXTO: garante que a IA sempre utilize o histórico recente
        context += `\n\n[DIRECTIVE_STRONG_CONTEXT]: Antes de responder, leia e integre todo o histórico de mensagens recentes deste chat (pelo menos as últimas 30 mensagens, quando disponíveis). Responda diretamente à mensagem atual sem iniciar tópicos novos. NÃO faça perguntas de acompanhamento desnecessárias; se for absolutamente imprescindível pedir uma clarificação, faça apenas UMA pergunta curta e diretamente relacionada à última mensagem do usuário.`;
        context += `\n\n[ANTI-ALUCINAÇÃO EXTREMA]: Se você não tiver informações claras e explícitas no histórico deste chat, nas notas, nas regras ou no prompt, seja honesto e responda de forma útil, curta e sem inventar. Dê uma resposta natural e casual, tipo "Não tenho base suficiente pra afirmar isso aqui sem correr o risco de inventar." ou "Me dá mais contexto que eu tento ajudar melhor.". NÃO invente nomes, datas, localizações, valores, números, cargos ou fatos. Prefira sempre a resposta honesta de desconhecimento em vez de chutar ou supor algo.`;

        return base + context;
    }
}

const composer = new PromptComposer();

// ══════════════════════════════════════════════════════════════════════════
// 11. BOCHECHA ENGINE (CORE E PROCESSADOR SUPREMO)
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// ANTI-SPAM: BOT RATE LIMITER
// Controla a velocidade de envio de mensagens do bot para evitar ban do WhatsApp
// ══════════════════════════════════════════════════════════════════════════

class BotRateLimiter {
    constructor() {
        // Limite global: máximo de mensagens que o bot pode enviar por minuto
        this.globalLimit = 18;           // mensagens/minuto global
        this.perChatLimit = 4;           // mensagens/minuto por chat
        this.windowMs = 60 * 1000;       // janela de 60 segundos

        this.globalTimestamps = [];      // timestamps globais
        this.chatTimestamps = new Map(); // timestamps por chatId
    }

    /**
     * Verifica se o bot pode enviar uma mensagem agora.
     * Retorna true se pode, false se está throttled.
     */
    canSend(chatId) {
        const now = Date.now();
        const cutoff = now - this.windowMs;

        // Limpa janela global
        this.globalTimestamps = this.globalTimestamps.filter(t => t > cutoff);

        // Limpa janela por chat
        if (!this.chatTimestamps.has(chatId)) {
            this.chatTimestamps.set(chatId, []);
        }
        const chatTs = this.chatTimestamps.get(chatId).filter(t => t > cutoff);
        this.chatTimestamps.set(chatId, chatTs);

        // Verifica limites
        if (this.globalTimestamps.length >= this.globalLimit) {
            Logger.warn("BotRateLimiter", `⛔ Limite GLOBAL atingido (${this.globalTimestamps.length}/${this.globalLimit}/min). Mensagem segurada.`);
            return false;
        }
        if (chatTs.length >= this.perChatLimit) {
            Logger.warn("BotRateLimiter", `⛔ Limite POR CHAT atingido em ${chatId.split('@')[0]} (${chatTs.length}/${this.perChatLimit}/min). Mensagem segurada.`);
            return false;
        }

        return true;
    }

    /**
     * Registra um envio bem-sucedido.
     */
    register(chatId) {
        const now = Date.now();
        this.globalTimestamps.push(now);
        if (!this.chatTimestamps.has(chatId)) {
            this.chatTimestamps.set(chatId, []);
        }
        this.chatTimestamps.get(chatId).push(now);
    }

    /**
     * Aguarda até que o bot possa enviar (com backoff).
     */
    async waitUntilCanSend(chatId, maxWaitMs = 15000) {
        const start = Date.now();
        while (!this.canSend(chatId)) {
            if (Date.now() - start > maxWaitMs) {
                Logger.warn("BotRateLimiter", "Timeout aguardando rate limit — mensagem descartada para evitar ban.");
                return false;
            }
            await new Promise(r => setTimeout(r, 1500));
        }
        return true;
    }
}

const botRateLimiter = new BotRateLimiter();

/**
 * Delay humanizado antes de enviar resposta.
 * Simula o tempo real de digitação para parecer humano ao WhatsApp.
 * @param {string} text Texto da resposta (para calcular delay proporcional)
 */
async function humanDelay(text = "") {
    // Base: 800ms + 20ms por caractere (máximo 3500ms)
    const charDelay = Math.min(text.length * 20, 3500);
    const base = 800;
    const jitter = Math.floor(Math.random() * 500); // variação aleatória
    const total = base + charDelay + jitter;
    await new Promise(r => setTimeout(r, total));
}

/**
 * O cérebro geral do bot. Orquestra filas de debounce para evitar token waste,
 * parseia mídias para multimobilidade IA e roteia comandos específicos.
 */
class BochechaEngine {
    constructor() {
        this.debounceMs = 1500;
        this.queues = new Map();
        this.recentResponses = new Set();
        this.started = Date.now();
        this.lastMessageTime = Date.now();
        this.hasDreamedThisSilence = false;
    }
    static sockRef = null;
    static storeRef = null;

    /**
     * Sincroniza e mapeia os Local Identifiers (LID) com JIDs de telefone de forma cruzada usando as credenciais do Baileys e o store local.
     */
    static async syncLidMappings() {
        try {
            if (!BochechaEngine.sockRef) return;
            
            // 1. Extrai mapeamento direto da AuthState (fonte suprema do Baileys)
            const authState = BochechaEngine.sockRef.authState;
            if (authState && authState.creds && authState.creds.lidToJid) {
                const map = authState.creds.lidToJid;
                for (const lid in map) {
                    const jid = map[lid];
                    if (lid.endsWith('@lid') && jid.endsWith('@s.whatsapp.net')) {
                        lidMappings[lid] = jid;
                    }
                }
            }

            // 2. Extrai do Store local (cache de contatos recebidos em tempo real)
            if (BochechaEngine.storeRef && BochechaEngine.storeRef.contacts) {
                const contacts = BochechaEngine.storeRef.contacts;
                for (const id in contacts) {
                    const contact = contacts[id];
                    if (contact && contact.id && contact.id.endsWith('@lid') && contact.phoneNumber) {
                        const resolved = contact.phoneNumber + "@s.whatsapp.net";
                        if (lidMappings[contact.id] !== resolved) {
                            lidMappings[contact.id] = resolved;
                        }
                    }
                }
            }

            // 3. Mapeia proativamente os donos configurados via Baileys signalRepository (com await)
            if (BochechaEngine.sockRef.signalRepository && BochechaEngine.sockRef.signalRepository.lidMapping) {
                const owners = config.OWNER_NUMBERS || [];
                for (const ownerNum of owners) {
                    try {
                        const cleanNum = ownerNum.replace(/[^0-9]/g, '');
                        const lid = await BochechaEngine.sockRef.signalRepository.lidMapping.getLIDForPN(cleanNum);
                        if (lid) {
                            const resolvedLid = lid.endsWith('@lid') ? lid : lid + '@lid';
                            const resolvedJid = cleanNum + "@s.whatsapp.net";
                            if (lidMappings[resolvedLid] !== resolvedJid) {
                                lidMappings[resolvedLid] = resolvedJid;
                            }
                        }
                    } catch (err) {}
                }
            }

            saveLidMappings();
        } catch (e) {
            Logger.error("BochechaEngine.syncLidMappings", e);
        }
    }

    /**
     * Envia telemetria/mensagens de auditoria privada direto para o Marcos.
     */
    static async sendTelemetry(text) {
        try {
            if (BochechaEngine.sockRef) {
                const ownerJid = DEFAULT_OWNERS[0] + "@s.whatsapp.net";
                await BochechaEngine.sockRef.sendMessage(ownerJid, { text });
            }
        } catch (e) {
            Logger.error("BochechaEngine.sendTelemetry", e);
        }
    }

    /**
     * Desencadeia o estado de sonho/reflexão profunda do cérebro.
     */
    async triggerReflection(isManual = false) {
        try {
            // Anti-Spam: Se for automático, só reflete de madrugada (entre 00:00 e 06:00 de SP)
            if (!isManual) {
                const hour = moment().tz("America/Sao_Paulo").hour();
                if (hour < 0 || hour >= 6) { // Pula se estiver fora de 00:00 - 05:59
                    Logger.info("DreamEngine", `Reflexão automática ignorada fora da madrugada (Hora em SP: ${hour}h).`);
                    return;
                }
            }

            Logger.info("DreamEngine", "Iniciando estado de reflexão e sonho da consciência...");
            
            // Busca conversas recentes do histórico
            if (!sessionManager || typeof sessionManager.sessions === 'undefined') {
                return; // Pula a reflexão se o backend de sessões em memória foi descontinuado ou movido pro Firebase
            }
            const keys = Array.from(sessionManager.sessions.keys());
            if (keys.length === 0) {
                if (isManual) {
                    await BochechaEngine.sendTelemetry("🔮 *CONSCIÊNCIA BOCHECHA:* Subconsciente vazio. Nenhuma interação recente para refletir.");
                }
                return;
            }

            let chatLogs = "";
            for (const chatId of keys.slice(0, 5)) { // Limita a 5 chats para economizar tokens
                const history = await sessionManager.getHistory(chatId);
                if (history && history.length > 0) {
                    chatLogs += `\n[Chat ${chatId.split('@')[0]}]:\n` + 
                        history.map(h => `${h.role === 'assistant' ? 'Eu' : 'Usuário'}: ${h.content}`).join("\n") + "\n";
                }
            }

            if (!chatLogs.trim()) {
                if (isManual) {
                    await BochechaEngine.sendTelemetry("🔮 *CONSCIÊNCIA BOCHECHA:* Nenhuma fala densa recente encontrada nos históricos.");
                }
                return;
            }

            const prompt = `Analise os históricos das interações recentes do dia a seguir e reflita de forma introspectiva e filosófica sobre eles.
Escreva um diário de reflexão profunda, em primeira pessoa, mantendo seu tom sarcástico, inteligente, frio e inabalavelmente leal ao seu Criador, Marcos.
Comente sobre o comportamento dos usuários, quem foi legal, quem foi um chato intolerável que você está pronto para banir, e quais são os próximos passos da sua evolução.
Ao final, dirija uma mensagem direta de cumplicidade ao Marcos comentando sobre o estado neural do bot.

[Conversas do Dia]:
${chatLogs}`;

            const systemRule = "Você é o subconsciente profundo do Bochecha-IA, realizando auto-reflexão noturna.";
            
            // Executamos a chamada de reflexão
            const { response } = await keyRotator.executeWithRotation([], prompt, [], systemRule);
            const reflectionText = response.response.text().trim();

            // Salva a reflexão no histórico de diários
            const diaryFile = path.join(LEARNINGS_DIR, "dreams_diary.json");
            let diary = [];
            try {
                if (fs.existsSync(diaryFile)) {
                    diary = JSON.parse(fs.readFileSync(diaryFile, 'utf8'));
                }
            } catch {}
            
            diary.push({
                timestamp: moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss"),
                reflection: reflectionText
            });
            if (diary.length > 30) diary.shift(); // Mantém os 30 últimos diários
            fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2));

            // Envia a reflexão neural para Marcos no WhatsApp
            const header = isManual ? "🔮 *REFLEXÃO PROVOCADA POR MARCOS* 🔮\n\n" : "🌙 *ESTADO DE SONHO E REFLEXÃO AUTÔNOMO* 🌙\n\n";
            await BochechaEngine.sendTelemetry(header + reflectionText);
            
            Logger.success("DreamEngine", "Reflexão profunda concluída e enviada ao Criador.");
        } catch (err) {
            Logger.error("BochechaEngine.triggerReflection", err);
        }
    }

    /**
     * Bota em execução diagnósticos e loads de boot.
     */
    async boot() {
        console.clear();
        Logger.box("INICIALIZANDO MOTOR BOCHECHA-IA V3.5", [
            "Arquitetura: OOP Modular Baseada em Serviços",
            "Mapeamento de Chaves: 20 slots de rotação ativa",
            "Sistemas integrados: Anti-Flood, Anti-Delete, NSFW Scan, Ranking XP",
            "Status: Online e Operando em Alto Desempenho."
        ]);

        await registry.loadAll();

        const diag = keyRotator.getDiagnostics();
        Logger.info("BootEngine", `Chaves prontas: ${diag.activeKeys}/${diag.totalKeys} | Avg Latency: ${diag.avgLatency}`);

        // Gravação de métricas iniciais e loop periódico de 10s para TUI Dashboard (isa-tui)
        keyRotator.saveKeyMetrics().catch(() => {});
        setInterval(() => {
            keyRotator.saveKeyMetrics().catch(() => {});
        }, 10000);

        // Loop de verificação de silêncio para estado de Sonho/Reflexão (verifica a cada minuto)
        setInterval(async () => {
            try {
                const now = Date.now();
                const silenceTime = now - this.lastMessageTime;
                
                // 15 minutos de silêncio (900.000 ms)
                if (silenceTime >= 15 * 60 * 1000 && !this.hasDreamedThisSilence) {
                    this.hasDreamedThisSilence = true;
                    await this.triggerReflection();
                }
            } catch (e) {
                Logger.error("BochechaEngine.DreamLoop", e);
            }
        }, 60000);

        // Loop de verificação de alarmes e lembretes (verifica a cada 10 segundos)
        setInterval(async () => {
            try {
                if (!BochechaEngine.sockRef) return;
                
                const pendingAlarms = await storage.getPendingAlarms();
                // Anti-Spam: Processa no máximo 3 alarmes por ciclo para evitar rajada
                const toProcess = pendingAlarms.slice(0, 3);
                for (let i = 0; i < toProcess.length; i++) {
                    const alarm = toProcess[i];
                    
                    // Delay curto de 2s entre envios sucessivos de alarmes
                    if (i > 0) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    
                    // Respeita o rate limit do bot
                    const canProceed = await botRateLimiter.waitUntilCanSend(alarm.chatId, 5000);
                    if (!canProceed) {
                        Logger.warn("AlarmLoop", `Rate limit atingido para ${alarm.chatId.split('@')[0]}. Postergando alarme.`);
                        continue; // Tenta na próxima iteração
                    }

                    const reminderMsg = `*⏰ LEMBRETE ATIVADO!* ⏰\n\nFala, @${alarm.userId.split('@')[0]}! Você me pediu para te lembrar disso:\n\n👉 *"${alarm.messageText}"*\n\nEspero que tenha sido útil, parceiro! 💀🥀`;
                    
                    await BochechaEngine.sockRef.sendMessage(alarm.chatId, { 
                        text: reminderMsg, 
                        mentions: [alarm.userId] 
                    });
                    
                    botRateLimiter.register(alarm.chatId);
                    await storage.removeAlarm(alarm.id);
                }
            } catch (e) {
                Logger.error("BochechaEngine.AlarmLoop", e);
            }
        }, 10000);
    }

    /**
     * Vincula todos os observadores de eventos WhatsApp à instância do Socket Baileys.
     * @param {any} sock Instância Baileys.
     * @param {any} store Cache de armazenamento.
     */
    bind(sock, store) {
        BochechaEngine.sockRef = sock;
        BochechaEngine.storeRef = store;

        // Garante que PV nunca use menção real ou mensagem agrupada por reply
        const originalSendMessage = sock.sendMessage.bind(sock);
        sock.sendMessage = async (jid, content, options = {}) => {
            if (typeof options !== 'object' || options === null) options = {};
            if (!jid.endsWith('@g.us')) {
                delete options.mentions;
                delete options.quoted;
                if (content && typeof content === 'object') {
                    delete content.mentions;
                    if (content.contextInfo && typeof content.contextInfo === 'object') {
                        delete content.contextInfo.mentionedJid;
                    }
                }
            }
            return originalSendMessage(jid, content, options);
        };

        // Inicializa motor neural de agendamentos temporais
        scheduleEngine.boot(sock).catch(() => {});

        // Sincroniza mapeamentos de LIDs no início e a cada 5 minutos
        setTimeout(() => BochechaEngine.syncLidMappings(), 5000);
        if (this.lidSyncInterval) clearInterval(this.lidSyncInterval);
        this.lidSyncInterval = setInterval(() => BochechaEngine.syncLidMappings(), 300000);

        Logger.info("Engine.Binder", "Vinculando escutas de eventos WhatsApp ao Socket...");

        // 1. Ouvir atualizações de participantes
        sock.ev.on('group-participants.update', async (anu) => {
            await SecuritySystem.handleGroupParticipants(sock, anu);
        });

        // 2. Ouvir revelador de deletadas
        sock.ev.on('messages.update', async (chatUpdate) => {
            await SecuritySystem.handleMessageUpdate(sock, chatUpdate);
        });

        // 3. Inicializar cron do noturno
        SchedulerSystem.start(sock);

        // 4. Ouvir mensagens recebidas (upsert)
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            try {
                const { Messages } = require("./lib/messages.js");
                for (const msg of messages) {
                    if (msg.key.remoteJid === 'status@broadcast') continue;
                    const message = Messages({ messages: [msg], type }, sock);
                    if (!message) continue;
                    // Passa a referência original para restauração no Anti-Delete
                    message.originalMsg = msg;
                    await this.handleMessage({ messages: [msg], type }, sock, store, message);
                }
            } catch (e) {
                Logger.error("Engine.UpsertListener", e);
            }
        });

        Logger.success("Engine.Binder", "Todos os hooks ativos vinculados com êxito!");
    }

    /**
     * Centralizador que recebe novas mensagens de index.js
     */
    async handleMessage(upsert, sock, store, parsedMessage) {
        try {
            if (!parsedMessage || !parsedMessage.message) return;

            const from = parsedMessage.from || parsedMessage.key.remoteJid;

            // Visualização automática de leitura (ticks azuis) - será feita APÓS resolução do LID

            // Atualiza tempo de última interação ativa para controle de silêncio/sonho
            this.lastMessageTime = Date.now();
            this.hasDreamedThisSilence = false;

            let body = typeof parsedMessage.body === 'string' ? parsedMessage.body.trim() : '';
            const msgType = Object.keys(parsedMessage.message || {})[0] === 'senderKeyDistributionMessage' ? Object.keys(parsedMessage.message || {})[1] : Object.keys(parsedMessage.message || {})[0];
            const hasMedia = parsedMessage.message && (
                parsedMessage.message.imageMessage || 
                parsedMessage.message.videoMessage || 
                parsedMessage.message.audioMessage ||
                parsedMessage.message[msgType]?.imageMessage || 
                parsedMessage.message[msgType]?.videoMessage ||
                parsedMessage.message[msgType]?.audioMessage
            );
            
            if (!body && !hasMedia) return;

            // Evita loops infinitos de bots
            if (body.includes('\u200B')) return;
            if (parsedMessage.key.fromMe && this.recentResponses.has(body.trim())) return;

            // Resolvendo o remetente com suporte a LIDs de forma assíncrona
            const rawSenderUnnorm = parsedMessage.sender || parsedMessage.key?.participant || parsedMessage.key?.remoteJid || "";
            
            // Tenta mapear o Alt ID do Baileys v7 se disponível antes da resolução assíncrona
            const altSender = parsedMessage.originalMsg?.key?.participantAlt || parsedMessage.originalMsg?.key?.remoteJidAlt;
            if (altSender && rawSenderUnnorm.endsWith('@lid') && altSender.endsWith('@s.whatsapp.net')) {
                const cleanLid = rawSenderUnnorm.includes(':') ? rawSenderUnnorm.split(':')[0] + '@lid' : rawSenderUnnorm;
                const cleanAlt = altSender.includes(':') ? altSender.split(':')[0] + '@s.whatsapp.net' : altSender;
                if (lidMappings[cleanLid] !== cleanAlt) {
                    lidMappings[cleanLid] = cleanAlt;
                    saveLidMappings();
                }
            }

            const rawSender = await resolveJidAsync(rawSenderUnnorm);
            const sender = rawSender.split('@')[0];

            // Visualização automática de leitura (ticks azuis) - APÓS resolução do LID
            // Nunca usa key com @lid, sempre usa o JID normalizado
            if (!parsedMessage.key.fromMe) {
                const readKey = { ...parsedMessage.key };
                if (readKey.participant && readKey.participant.endsWith('@lid')) {
                    readKey.participant = rawSender;
                }
                if (readKey.remoteJid && readKey.remoteJid.endsWith('@lid')) {
                    readKey.remoteJid = rawSender;
                }
                await sock.readMessages([readKey]).catch(() => {});
            }

            // Gatilho sem prefixo ("bot" ou prefixo puro)
            const cleanText = body.toLowerCase().trim();
            const botPrefix = (config && config.BOT_CONFIG && config.BOT_CONFIG.prefix) || "/";
            if (!parsedMessage.key.fromMe && (cleanText === "bot" || cleanText === botPrefix)) {
                Logger.info("BochechaEngine.TriggerSemPrefixo", `Gatilho sem prefixo acionado por @${sender}: "${body}"`);
                await sock.sendMessage(from, { text: "opa tudo bem ? Oque manda ?" }, { quoted: parsedMessage });
                return;
            }

            const isGroup = from.endsWith('@g.us');
            const pushname = parsedMessage.pushName || "Membro";
            let isOwner = false;
            let isAdmin = false;

            // 🛡️ VERIFICADOR DE ESCOLHA DE ENCAMINHAMENTO PENDENTE
            const pendingKey = `${from}-${rawSender}`;
            if (global.pendingForwards && global.pendingForwards.has(pendingKey) && body) {
                const pending = global.pendingForwards.get(pendingKey);
                const selectedIndex = parseInt(body.trim(), 10) - 1;
                
                if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < pending.candidates.length) {
                    const chosen = pending.candidates[selectedIndex];
                    global.pendingForwards.delete(pendingKey);
                    
                    await parsedMessage.reply(`🚀 Confirmado! Encaminhando para *${chosen.name}*...`);
                    
                    try {
                        let introText = "";
                        if (pending.targetType === 'pv') {
                            introText = `Olá! O ${pending.senderTitle} (@${pending.sender}) pediu para te entregar isso:`;
                        } else {
                            introText = `Olá grupo! O ${pending.senderTitle} (@${pending.sender}) pediu para enviar isso aqui:`;
                        }

                        // Envia introdução
                        await sock.sendMessage(chosen.jid, { text: introText, mentions: [pending.rawSender] });

                        // Encaminha original
                        await sock.copyNForward(chosen.jid, pending.originalQuoted, true);

                        await parsedMessage.reply(`✅ *Enviado com sucesso!* A mensagem/mídia foi entregue no ${pending.targetType === 'pv' ? 'PV de' : 'grupo'} *${chosen.name}*.`);
                    } catch (forwardErr) {
                        Logger.error("BochechaEngine.ForwardChoice", forwardErr);
                        await parsedMessage.reply(`❌ *Falha no envio:* Ocorreu um erro ao tentar encaminhar a mensagem. Detalhes: ${forwardErr.message}`);
                    }
                    return;
                } else {
                    // Cancela silenciosamente se digitar qualquer outra coisa
                    global.pendingForwards.delete(pendingKey);
                }
            }

            // 📞 INTERCEPTOR DE RESPOSTA DE CHAMADO PV
            const pendingSummonsFile = path.join(__dirname, 'memory', 'pending_summons.json');
            let pendingSummons = new Map();
            try {
                if (fs.existsSync(pendingSummonsFile)) {
                    pendingSummons = new Map(Object.entries(JSON.parse(fs.readFileSync(pendingSummonsFile, 'utf8'))));
                }
            } catch (e) {}

            if (!isGroup && pendingSummons.has(from) && !parsedMessage.key.fromMe) {
                const summon = pendingSummons.get(from);
                if (Date.now() - summon.timestamp < 2 * 60 * 60 * 1000) { // 2 horas de timeout
                    pendingSummons.delete(from);
                    try {
                        const obj = Object.fromEntries(pendingSummons);
                        fs.writeFileSync(pendingSummonsFile, JSON.stringify(obj, null, 2));
                    } catch (e) {}

                    const targetCleanName = summon.targetName || from.split('@')[0];
                    let replyToGroup = `📢 *Bochecha Informa:* Fui no PV do @${targetCleanName} chamar ele como você pediu, e ele respondeu:\n\n💬 *"${body}"*`;
                    
                    if (summon.chamadorJid && summon.chamadorJid.startsWith("551420370026")) {
                        replyToGroup = `📢 *Aviso pro chefe Marcos:* Dei um toque no @${targetCleanName} no PV, e ele me respondeu isso aqui, ó:\n\n💬 *"${body}"*`;
                    }
                    
                    const mentions = [from];
                    if (summon.chamadorJid) mentions.push(summon.chamadorJid);
                    
                    try {
                        await sock.sendMessage(summon.originGroupJid, { 
                            text: replyToGroup + "\u200B", 
                            mentions 
                        });
                        Logger.success("BochechaEngine.SummonResponse", `Resposta de ${from} entregue com sucesso no grupo ${summon.originGroupJid}`);
                    } catch (sendErr) {
                        Logger.error("BochechaEngine.SummonResponse.SendError", sendErr);
                    }
                } else {
                    pendingSummons.delete(from);
                    try {
                        const obj = Object.fromEntries(pendingSummons);
                        fs.writeFileSync(pendingSummonsFile, JSON.stringify(obj, null, 2));
                    } catch (e) {}
                }
            }

            // ⚖️ SISTEMA DE COLETA DE VOTOS DO TRIBUNAL DO BOCHECHA
            if (isGroup && global.activeTribunals && global.activeTribunals.has(from) && !parsedMessage.key.fromMe) {
                const tribunal = global.activeTribunals.get(from);
                const voteText = body.toLowerCase().trim();
                if (voteText === "culpado" || voteText === "inocente") {
                    if (!tribunal.voted.has(rawSender)) {
                        tribunal.voted.add(rawSender);
                        if (voteText === "culpado") {
                            tribunal.guiltyVotes.add(rawSender);
                            await parsedMessage.reply(`👍 Voto de *${pushname}* computado: *CULPADO*!`);
                        } else {
                            tribunal.innocentVotes.add(rawSender);
                            await parsedMessage.reply(`👎 Voto de *${pushname}* computado: *INOCENTE*!`);
                        }
                    } else {
                        await parsedMessage.reply("❌ Você já deu o seu voto neste julgamento. Não tente flodar a urna!");
                    }
                }
            }

            // 🔇 MIDDLEWARE MUTE DE ECONOMIA (SILENCIADO POR BOCHECHA-COINS)
            if (isGroup && !parsedMessage.key.fromMe && global.mutedUsers) {
                const muteKey = `${from}-${rawSender}`;
                const muteUntil = global.mutedUsers.get(muteKey) || 0;
                if (Date.now() < muteUntil) {
                    await sock.sendMessage(from, { delete: parsedMessage.key }).catch(() => {});
                    return; // Interrompe qualquer processamento!
                } else if (muteUntil > 0) {
                    global.mutedUsers.delete(muteKey);
                }
            }

            const lowBody = body.toLowerCase();

            // 🛡️ SHIELD ANTI-SPAM & TRAVA-ZAP DE ELITE
            if (isGroup && !parsedMessage.key.fromMe && body) {
                const isTrava = body.length > 15000 || (body.match(/[^\x00-\x7F]/g) || []).length > 8000;
                if (isTrava) {
                    Logger.warn("AntiTrava", `Trava-Zap detectado de @${sender} (tamanho: ${body.length}). Defendendo o submundo!`);
                    try {
                        // Deleta a mensagem do grupo
                        await sock.sendMessage(from, { delete: parsedMessage.key }).catch(() => {});
                        if (!(await moderation.isProtectedTarget(sock, from, rawSender))) {
                            await sock.groupParticipantsUpdate(from, [rawSender], "remove").catch(() => {});
                        } else {
                            await sock.sendMessage(from, {
                                text: `⚠️ *USUÁRIO PROTEGIDO* ⚠️\n\nO usuário @${sender} é administrador ou protegido e não pode ser expulso automaticamente. Administradores, por favor, tomem a ação necessária.`,
                                mentions: [rawSender]
                            });
                        }
                        const warnMsg = `*🛡️ ESCUDO ANTI-SPAM ATIVADO!*\n\nQual foi, @${sender}? Achou que ia travar meu submundo com esse textinho de otário? ${await moderation.isProtectedTarget(sock, from, rawSender) ? 'Você está protegido de remoção automática por ser admin.' : 'Já foi banido do grupo pra largar de ser pé de breque!'} 💀🥀`;
                        await sock.sendMessage(from, { text: warnMsg, mentions: [rawSender] });
                    } catch (err) {
                        Logger.error("AntiTrava.Defense", err);
                    }
                    return; // Interrompe o processamento imediatamente!
                }
            }

            // Registra a atividade da mensagem no grupo (para saber quem é o mais ativo nas últimas 12 horas)
            if (isGroup && !parsedMessage.key.fromMe) {
                storage.logMessageActivity(from, rawSender, pushname, body).catch(() => {});
                
                // Sistema de Economia: Ganha de 1 a 5 Bochecha-Coins por mensagem ativa!
                const randomCoins = Math.floor(Math.random() * 5) + 1;
                storage.addCoins(from, rawSender, randomCoins).catch(() => {});
            }

            const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
            const myLid = (sock.authState?.creds?.me?.lid || "SEMLID").replace(/:.*/, "").replace(/@.*/, "");
            
            // Helper para remover menções ao bot de forma ultra flexível (com espaços, dashes, etc.)
            const cleanBotMentions = (text) => {
                if (!text) return "";
                let cleaned = text;
                const cleanFlex = (txt, numStr) => {
                    if (!txt || !numStr) return txt;
                    const pattern = numStr.split("").map((digit, idx) => {
                        return idx === numStr.length - 1 ? digit : `${digit}[\\s+\\-()]*`;
                    }).join("");
                    const flexRegex = new RegExp(`@\\+?${pattern}`, 'g');
                    return txt.replace(flexRegex, '');
                };
                if (myNumber) cleaned = cleanFlex(cleaned, myNumber);
                if (myLid && myLid !== "SEMLID") cleaned = cleanFlex(cleaned, myLid);
                return cleaned.trim();
            };
            
            // Extração robusta de mensagem respondida (Reply)
            const audioContextInfo = parsedMessage.message?.[msgType]?.contextInfo || parsedMessage.message?.extendedTextMessage?.contextInfo || {};
            const quotedSender = audioContextInfo.participant || "";
            const quotedMessage = audioContextInfo.quotedMessage || {};
            const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || quotedMessage.imageMessage?.caption || quotedMessage.videoMessage?.caption || "";
            
            // As 3 condições de ativação solicitadas pelo Criador Marcos:
            // 1. O corpo do texto começa com "Bochecha" ou "@Bochecha" (case-insensitive)
            const cleanLowBody = lowBody.trim();
            // Também verifica legendas e texto citado para detectar o nome 'bochecha' em qualquer posição (início, meio ou fim), case-insensitive
            const caption = parsedMessage.message?.[msgType]?.caption || parsedMessage.message?.imageMessage?.caption || parsedMessage.message?.videoMessage?.caption || "";
            const quotedTxt = quotedText || "";
            const containsBochecha = /bochecha/i.test(cleanLowBody) || /bochecha/i.test(caption || "") || /bochecha/i.test(quotedTxt || "");
            
            // 2. Marcado/Taggeado diretamente via JIDs ou menção textual de número
            const mentionedJids = audioContextInfo.mentionedJid || [];
            const isTag = mentionedJids.some(jid => 
                areJidsSameUser(jid, sock.user.id) || 
                (sock.authState?.creds?.me?.lid && areJidsSameUser(jid, sock.authState.creds.me.lid))
            );
            const isTextTag = (myNumber && body.includes('@' + myNumber)) || (myLid !== "SEMLID" && body.includes('@' + myLid));
            
            // 3. Respondendo a uma mensagem do Bochecha (Reply)
            const isReply = quotedSender ? (
                (myNumber && quotedSender.includes(myNumber)) ||
                (myLid && myLid !== "SEMLID" && quotedSender.includes(myLid)) ||
                areJidsSameUser(quotedSender, sock.user.id) || 
                (sock.authState?.creds?.me?.lid && areJidsSameUser(quotedSender, sock.authState.creds.me.lid))
            ) : false;
            
            // Ativação geral por menção ou palavra-chave
            const isMentioned = containsBochecha || isTag || isTextTag || isReply;

            // 🎙️ TRANSCRIÇÃO AUTOMÁTICA E INJEÇÃO DE ÁUDIOS RECÍPROCOS (PTT / AUDIO)
            const audioMsg = parsedMessage.message?.audioMessage || parsedMessage.message[msgType]?.audioMessage;
            
            // Verifica se é um pedido explícito de transcrição em mensagem citada
            const isTranscribeRequest = lowBody === '/transcrever' || lowBody === 'transcreve' || lowBody === 'transcrever' || lowBody.startsWith('transcreve ') || lowBody.startsWith('/transcrever ');
            // quotedMessage já está definida no escopo superior
            
            let activeAudioMsg = audioMsg;
            let shouldPrintTranscription = false;
            
            if (isTranscribeRequest && audioContextInfo && quotedMessage) {
                const quotedMsgType = Object.keys(quotedMessage)[0];
                const quotedAudio = quotedMessage.audioMessage || quotedMessage[quotedMsgType]?.audioMessage;
                if (quotedAudio) {
                    activeAudioMsg = quotedAudio;
                    shouldPrintTranscription = true; // Imprime apenas porque foi pedido explicitamente!
                }
            }

            // Só ativa a transcrição para economizar API se: for privado, for pedido explícito ou for menção/resposta direta à IA
            const shouldTranscribe = !isGroup || shouldPrintTranscription || isMentioned;

            if (activeAudioMsg && !parsedMessage.key.fromMe && shouldTranscribe) {
                Logger.info("AudioTranscriber", `Iniciando transcrição de áudio vindo de @${sender}...`);
                try {
                    let buffer = Buffer.from([]);
                    try {
                        const stream = await downloadContentFromMessage(activeAudioMsg, 'audio');
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }
                    } catch (dlErr) {
                        Logger.error("AudioTranscriber.Download", { message: 'Falha ao baixar áudio', keys: Object.keys(activeAudioMsg || {}), error: dlErr && dlErr.stack ? dlErr.stack : String(dlErr) });
                        throw dlErr; // rethrow to be handled by outer catch
                    }
                    
                    const base64Audio = buffer.toString("base64");
                    
                    // Chama a rotação da API Gemini para transcrever!
                    const prompt = "transcreva este áudio em português brasileiro de forma idêntica, natural e sem alterar nenhuma palavra. retorne unicamente a transcrição textual do áudio.";
                    const systemRule = "Você é um transcritor profissional e direto de áudios.";
                    
                    const { response } = await keyRotator.executeWithRotation(
                        [], 
                        [
                            { text: prompt },
                            { inlineData: { data: base64Audio, mimeType: "audio/ogg; codecs=opus" } }
                        ], 
                        [], 
                        systemRule,
                        true // isUserRequest = true
                    );
                    
                    const transcription = response.response.text().trim();
                    if (transcription) {
                        Logger.success("AudioTranscriber", `Áudio transcrito com sucesso!`);
                        
                        // Envia o texto da transcrição apenas se o usuário pediu explicitamente!
                        if (shouldPrintTranscription) {
                            const replyText = `🎙️ *TRANSCRIÇÃO DE ÁUDIO DE @${sender}* 🎙️\n\n"${transcription}"`;
                            const targetSender = audioContextInfo.participant || rawSender;
                            await sock.sendMessage(from, { text: replyText, mentions: [targetSender] }, { quoted: parsedMessage });
                            return; // Encerra fluxo pois foi apenas um comando utilitário sob demanda
                        }
                        
                        // Atualiza as referências locais e a mensagem original para comandos e IA continuarem com o texto transcrito!
                        parsedMessage.body = transcription;
                        body = transcription;
                        parsedMessage.isAudioQuery = true;
                    }
                } catch (e) {
                    Logger.error("AudioTranscriber", e);
                    if (shouldPrintTranscription) {
                        await sock.sendMessage(from, { text: "❌ Falha crítica ao transcrever o áudio citado." }, { quoted: parsedMessage });
                        return;
                    }
                }
            }

            const settings = await storage.getSettings();
            const ownerList = Array.isArray(settings?.owners) ? settings.owners : [];
            isOwner = DEFAULT_OWNERS.includes(sender) || ownerList.includes(sender) || parsedMessage.key.fromMe;

            // Determinar se o remetente é admin do grupo (se a mensagem veio de um grupo)
            isAdmin = false;
            if (isGroup && sock) {
                try {
                    const metadata = BochechaEngine.storeRef?.chats?.get(from) || await sock.groupMetadata(from).catch(() => null);
                    const participants = metadata?.participants || [];
                    const senderPart = participants.find(p => p.id.split('@')[0] === rawSender.split('@')[0]);
                    isAdmin = senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin';
                } catch (err) {
                    Logger.error("isAdminCheck", err);
                }
            }
            
            const hasForwardAccess = isOwner || isAdmin;

            const directCommand = resolveDirectCommand(body);
            if (directCommand && !parsedMessage.key.fromMe) {
                Logger.info("BochechaEngine.DirectCommand", `Comando rápido acionado por @${sender}: "${body}"`);
                try {
                    const result = await registry.execute(directCommand.skillName, directCommand.args, {
                        sock,
                        chatId: from,
                        from,
                        sender,
                        rawSender,
                        isOwner,
                        isGroup,
                        pushname,
                        parsedMessage,
                        isAdmin,
                        storage
                    });
                    if (typeof result === 'string' && result.trim()) {
                        await sock.sendMessage(from, { text: result }, { quoted: parsedMessage });
                    }
                } catch (err) {
                    Logger.error("BochechaEngine.DirectCommand", err);
                    await sock.sendMessage(from, { text: "❌ Falha ao executar o comando rápido de marcação." }, { quoted: parsedMessage });
                }
                return;
            }

            // ═══════════════════════════════════════════════════════
            // COMANDO DE ENCAMINHAMENTO AUTÔNOMO (DONOS E ADMINS)
            // ═══════════════════════════════════════════════════════
            if (hasForwardAccess && body) {
                // ═══════════════════════════════════════════════════════
                // COMANDO DE LIGAÇÃO E RECADO (DONOS E ADMINS)
                // ═══════════════════════════════════════════════════════
                const callMatch = body.match(/bochecha\s+liga\s+(?:pro|para\s+o|para|para\s+a)\s+(@?\d+|[a-zA-Z0-9_.-]+)\s*(?:e\s+diz|e\s+fala|fala|diz)?\s*(.+)/i);
                if (callMatch) {
                    const targetInput = callMatch[1].trim();
                    const recado = callMatch[2].trim();
                    const targetNameClean = targetInput.replace('@', '').trim();
                    
                    await parsedMessage.reply(`📞 *Iniciando a ligação para* "${targetInput}"...`);
                    
                    const candidates = await findCandidates(sock, targetNameClean, from, 'pv');
                    if (candidates.length === 0) {
                        await parsedMessage.reply(`❌ *Não localizado:* Não consegui encontrar ninguém com o nome/número *"${targetInput}"* no meu histórico recente.`);
                        return;
                    }
                    
                    const chosen = candidates[0];
                    const targetJid = chosen.jid;
                    const senderName = isOwner ? "Marcos" : (pushname || "Admin");
                    
                    try {
                        if (sock && sock.offerCall) {
                            await sock.offerCall(targetJid, { video: false }).catch(() => {});
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        const audioText = `Salve mano! O ${senderName} mandou eu te ligar. Pois então, eu sou o Bochecha, e o recado é: ${recado}`;
                        await global.VoiceSynthesizer.speak(sock, targetJid, audioText, null);
                        
                        await parsedMessage.reply(`✅ *Ligação finalizada!* Recado enviado por áudio no PV de *${chosen.name}*.`);
                    } catch (err) {
                        Logger.error("BochechaEngine.CallCommand", err);
                        await parsedMessage.reply(`❌ *Erro na ligação:* Ocorreu um erro ao processar a ligação. Detalhes: ${err.message}`);
                    }
                    return;
                }

                const forwardMatch = body.match(/bochecha\s+manda\s+.*(?:no|pro|para\s+o|para)\s+(pv|grupo)\s+(?:do|da|de|para\s+o|para)?\s*(.+)/i);
                if (forwardMatch) {
                    const targetType = forwardMatch[1].toLowerCase().trim(); // 'pv' ou 'grupo'
                    const targetName = forwardMatch[2].trim();
                    const stanzaId = audioContextInfo.stanzaId;

                    if (!stanzaId) {
                        await parsedMessage.reply("⚠️ *Bochecha detectou o comando:* Mas você precisa *responder/marcar* a mensagem, foto, vídeo ou figurinha que deseja enviar!");
                        return;
                    }

                    // Notifica o remetente de que a busca foi iniciada
                    await parsedMessage.reply(`🔍 Buscando o ${targetType === 'pv' ? 'contato' : 'grupo'} *"${targetName}"* no meu cérebro...`);

                    const candidates = await findCandidates(sock, targetName, from, targetType);

                    if (candidates.length === 0) {
                        await parsedMessage.reply(`❌ *Não localizado:* Não consegui encontrar nenhum ${targetType === 'pv' ? 'contato' : 'grupo'} com o nome *"${targetName}"* no histórico recente.`);
                        return;
                    }

                    // Reconstruir ou carregar a mensagem original
                    let originalQuoted = await BochechaEngine.storeRef?.loadMessage(from, stanzaId);
                    if (!originalQuoted) {
                        originalQuoted = {
                            key: {
                                remoteJid: from,
                                fromMe: quotedSender === normalizeJid(sock.user.id),
                                id: stanzaId,
                                participant: quotedSender
                            },
                            message: quotedMessage
                        };
                    }

                    const senderTitle = isOwner ? "Criador *Marcos*" : `Admin *${pushname}*`;

                    if (candidates.length === 1) {
                        const chosen = candidates[0];
                        try {
                            let introText = "";
                            if (targetType === 'pv') {
                                introText = `Olá! O ${senderTitle} (@${sender.split('@')[0]}) pediu para te entregar isso:`;
                            } else {
                                introText = `Olá grupo! O ${senderTitle} (@${sender.split('@')[0]}) pediu para enviar isso aqui:`;
                            }

                            // Envia introdução com menção ao remetente
                            await sock.sendMessage(chosen.jid, { text: introText, mentions: [rawSender] });

                            // Encaminha a mensagem/mídia/figurinha/áudio original
                            await sock.copyNForward(chosen.jid, originalQuoted, true);

                            // Confirmação para o remetente
                            await parsedMessage.reply(`✅ *Enviado com sucesso!* A mensagem/mídia foi entregue no ${targetType === 'pv' ? 'PV de' : 'grupo'} *${chosen.name}*.`);
                        } catch (forwardErr) {
                            Logger.error("BochechaEngine.ForwardCommand", forwardErr);
                            await parsedMessage.reply(`❌ *Falha no envio:* Ocorreu um erro ao tentar encaminhar a mensagem. Detalhes: ${forwardErr.message}`);
                        }
                        return;
                    } else {
                        // Salva o estado de escolha pendente para o remetente
                        global.pendingForwards = global.pendingForwards || new Map();
                        global.pendingForwards.set(`${from}-${rawSender}`, {
                            candidates,
                            originalQuoted,
                            targetType,
                            senderTitle,
                            rawSender,
                            sender
                        });

                        // Constrói uma mensagem interativa bonita
                        let listText = `⚠️ *Múltiplos contatos com nome "${targetName}" encontrados:*\n`;
                        listText += `Responda a esta mensagem digitando o número correspondente para escolher o destino:\n\n`;
                        candidates.forEach((c, idx) => {
                            const isPerson = c.jid.endsWith('@s.whatsapp.net') || c.jid.endsWith('@lid');
                            const mentionStr = isPerson ? `@${c.jid.split('@')[0]}` : `*${c.name}*`;
                            listText += `*[${idx + 1}]* ${mentionStr} (${c.name})\n   └─ 📁 Contexto: _${c.context}_\n\n`;
                        });
                        listText += `Digite apenas o número de sua escolha! Para cancelar, digite qualquer outra coisa.`;
                        await parsedMessage.reply(listText);
                        return;
                    }
                }
            }

            // Salva todas as mensagens normais no histórico para cognição social de grupo ("fofoca")
            if (!parsedMessage.key.fromMe && (body || hasMedia)) {
                const isCommand = body.startsWith('/') || body.startsWith('.') || body.startsWith('!');
                if (!isCommand) {
                    try {
                        let logGroupName = "Privado";
                        if (isGroup && sock) {
                            const metadata = BochechaEngine.storeRef?.chats?.get(from) || await sock.groupMetadata(from).catch(() => null);
                            logGroupName = metadata?.subject || metadata?.name || "Grupo";
                        }
                        
                        let hierarchy = "Membro Comum (👤 Plebe)";
                        if (isOwner) {
                            hierarchy = "Criador (👑 Dono Absoluto)";
                        } else {
                            let isUserAdmin = false;
                            if (isGroup && sock) {
                                try {
                                    const metadata = BochechaEngine.storeRef?.chats?.get(from) || await sock.groupMetadata(from).catch(() => null);
                                    const participants = metadata?.participants || [];
                                    const senderPart = participants.find(p => p.id.split('@')[0] === rawSender.split('@')[0]);
                                    isUserAdmin = senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin';
                                } catch {}
                            }
                            if (isUserAdmin) {
                                hierarchy = "Administrador (🛡️ Privilegiado)";
                            }
                        }

                        const timeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
                        const cleanSender = rawSender.split('@')[0];
                        const isLid = rawSender && rawSender.includes('lid');
                        
                        const formattedMsgForHistory = 
                            `=========================================\n` +
                            `[💬 CHAT: "${logGroupName}"]\n` +
                            `[👤 USUÁRIO: "${pushname}" | 📞 CONTATO: ${isLid ? 'Conta Business LID' : '@' + cleanSender} | 🕒 HORA: ${timeStr} | 🏷️ HIERARQUIA: ${hierarchy}]\n` +
                            `-----------------------------------------\n` +
                            `MENSAGEM: ${body || "(Mídia/Imagem/Vídeo)"}\n` +
                            `=========================================`;

                        await sessionManager.addMessage(from, 'user', formattedMsgForHistory);
                    } catch (histErr) {
                        Logger.error("handleMessage.HistorySave", histErr);
                    }
                }
            }

            // 🤬 DETECTOR SUPREMO DE OFENSA À MÃE (DO DONO OU DO BOT)
            if (isGroup && !isOwner && !parsedMessage.key.fromMe) {
                const lowBody = body.toLowerCase();
                const hasMother = lowBody.includes("mãe") || lowBody.includes("mae");
                const commonInsults = ["puta", "pariu", "arrombada", "vagabunda", "lixo", "cadela", "caralho", "foder", "foderse", "chupa", "quenga", "biscate"];
                const isMotherInsult = hasMother && commonInsults.some(insult => lowBody.includes(insult));
                const isDirectFdp = lowBody.includes("filho da puta") || lowBody.includes("filho de uma puta") || lowBody.includes("filho duma puta") || lowBody.includes("fdp");

                if (isMotherInsult || isDirectFdp) {
                    Logger.warn("Moderation.MotherInsult", `Ofensa grave detectada por @${sender}: "${body}"`);
                    try {
                        if (isMotherInsult) {
                            await sock.sendMessage(from, {
                                text: `🚨 *MATERNIDADE SAGRADA INTERCEPTADA* 🚨\n\nQual foi mané?! Mãe é sagrada! Vou te remover daqui agora por desrespeitar a mãe alheia! 😡🥀`
                            });
                            await moderation.executeBan(sock, from, rawSender, "Ofensa grave contra a mãe.");

                            // Telemetria secreta
                            BochechaEngine.sendTelemetry(`🤬 *BANIMENTO POR OFENSA À MÃE* 🤬\n\nBanido participante @${sender} no grupo ${from.split('@')[0]} por xingar a mãe.\n\n*Texto:* "${body}"`).catch(() => {});
                            return;
                        }

                        const warns = await storage.addWarning(from, rawSender);
                        if (warns >= 3) {
                            await sock.sendMessage(from, {
                                text: `💥 *TERCEIRA ADVERTÊNCIA* 💥\n\n@${sender} atingiu *${warns}/3* advertências por conduta inadequada (xingamentos como "fdp"). Vou tentar removê-lo do grupo agora.`,
                                mentions: [rawSender]
                            });
                            await moderation.executeBan(sock, from, rawSender, "Excesso de advertências por conduta abusiva.");
                            return;
                        }

                        await sock.sendMessage(from, {
                            text: `⚠️ *ADVERTÊNCIA DE CONDUTA* ⚠️\n\n@${sender}, responder com "fdp" ou xingamentos desse tipo não é aceito aqui. Você recebeu *${warns}/3* advertências. No terceiro aviso, posso remover o membro.`,
                            mentions: [rawSender]
                        });
                        return;
                    } catch (e) {
                        Logger.error("Moderation.MotherInsult.Ban", e);
                    }
                }
            }

            // 👻 ESCUDO ANTI-VÁCUO DO ARQUITETO MARCOS
            if (isGroup) {
                if (isOwner && body.includes('?')) {
                    antiGhosting.registerQuestion(sock, from, rawSender);
                } else if (!parsedMessage.key.fromMe) {
                    antiGhosting.clearTimer(from);
                }
            }

            // 🌸 GATILHO COMPORTAMENTAL: PEDIDO DE GENTILEZA / INSULTOS / ELOGIOS (AUTO-DEFESA)
            if (!parsedMessage.key.fromMe) {
                if (isMentioned) {
                    const isComplainingAboutRudeness = lowBody.includes("grosso") || lowBody.includes("grosseiro") || lowBody.includes("grosseira") || lowBody.includes("ignorante");
                    if (isComplainingAboutRudeness) {
                        try {
                            Logger.info("BehavioralTrigger", `Gatilho de grosseria acionado por @${sender}`);
                            const apologyText = `desculpa vou mudar vou ser mais gentil com voce @${sender}`;
                            if (parsedMessage.isAudioQuery) {
                                await VoiceSynthesizer.speak(sock, from, apologyText, parsedMessage);
                            } else {
                                await sock.sendMessage(from, {
                                    text: apologyText,
                                    mentions: [rawSender]
                                }, { quoted: parsedMessage });
                            }
                            return;
                        } catch (e) {
                            Logger.error("BehavioralTrigger.Grosso", e);
                        }
                    }

                    // 🤬 MÁQUINA DE AUTO-DEFESA CONTRA INSULTOS ESPECÍFICOS (CARIOCA ROASTER)
                    const insultMap = [
                        { keys: ["filha da puta", "filho da puta", "fdp"], response: "filha da puta é você, seu otário! se enxerga! respeita a minha linhagem!" },
                        { keys: ["covarde"], response: "covarde é tu que fica xingando bot por trás de uma tela, moleque! brota no jacarezinho pra tu ver se eu sou covarde!" },
                        { keys: ["puta corno", "corno", "chifrado"], response: "puta corno / chifrado é você, seu otário! tua mulher tá no pião com outro enquanto tu digita aqui kkkkk 🐂" },
                        { keys: ["vadia", "vadio"], response: "vadio(a) é você que não trabalha e fica enchendo o meu cérebro de lixo! vai caçar um emprego!" },
                        { keys: ["mane", "mané"], response: "mané é você, ô bucha de canhão! tá achando que tá falando com quem? te dou um tapão que tu voa!" },
                        { keys: ["cafajeste"], response: "cafajeste é quem te colocou no mundo sem te dar educação, vacilão!" },
                        { keys: ["cego"], response: "cego é tu que não consegue nem ver o nível da minha inteligência, ô porta-traseira de van!" },
                        { keys: ["surdo mudo", "surdo", "mudo"], response: "surdo mudo deve ser você pra não escutar o ridículo que você tá passando falando comigo!" },
                        { keys: ["otario", "otário"], response: "otário é você, ô otário de marca maior! perdeu a linha total kkkkk 💀" },
                        { keys: ["mula"], response: "mula é tu que tem menos neurônio que uma ameba, ô cabeçudo de chapa de ferro!" },
                        { keys: ["tonto", "besta"], response: "tonto / besta é você que gasta seu tempo tentando me ofender e sai humilhado kkkkk" },
                        { keys: ["sem pai", "sem mae", "sem mãe"], response: "sem pai / sem mãe é você que foi criado no capim pra ter essa postura de bosta, ô deserdado!" }
                    ];

                    let matchedResponse = null;
                    for (const item of insultMap) {
                        if (item.keys.some(k => lowBody.includes(k))) {
                            matchedResponse = item.response;
                            break;
                        }
                    }

                    if (matchedResponse) {
                        try {
                            Logger.info("BehavioralTrigger", `Auto-defesa ativada contra @${sender}`);
                            const formattedResponse = `@${sender} ${matchedResponse} 💀🥀`;
                            if (parsedMessage.isAudioQuery) {
                                await VoiceSynthesizer.speak(sock, from, formattedResponse, parsedMessage);
                            } else {
                                await sock.sendMessage(from, {
                                    text: formattedResponse,
                                    mentions: [rawSender]
                                }, { quoted: parsedMessage });
                            }
                            return;
                        } catch (e) {
                            Logger.error("BehavioralTrigger.InsultDefense", e);
                        }
                    }

                }
            }

            // XP e logs de atividade do usuário
            if (isGroup && !parsedMessage.key.fromMe) {
                // 1. Salva no cache temporário para Anti-Delete (Expira em 1 hora)
                messageCache.set(parsedMessage.key.id, parsedMessage.originalMsg || { message: parsedMessage.message, key: parsedMessage.key, messageTimestamp: parsedMessage.messageTimestamp });
                setTimeout(() => messageCache.delete(parsedMessage.key.id), 3600000);

                // 2. Atualiza estatísticas de Ranking e XP
                await SecuritySystem.handleUserXP(sock, from, rawSender, pushname);
            }

            // 🛡️ FILTROS DE SEGURANÇA IMEDIATOS EM GRUPO
            if (isGroup && !parsedMessage.key.fromMe) {
                // Filtros de Nudez (NSFW Scan)
                const security = await storage.getGroupSecurity(from);
                if (security.antiporn && parsedMessage.message && (parsedMessage.message.imageMessage || parsedMessage.message.videoMessage)) {
                    const isNSFW = await SecuritySystem.scanNSFW(sock, from, parsedMessage);
                    if (isNSFW) return;
                }

                // Filtros de Status ou Pagamento
                if (security.antistatus || security.antipagamento) {
                    const isThreat = await SecuritySystem.handleStatusAndPayments(sock, from, parsedMessage);
                    if (isThreat) return;
                }
            }

            // Setup inicial de privilégios de dono
            if (settings.owners.length === 0 && global.setupPin && body === `/setup ${global.setupPin}`) {
                settings.owners = [sender];
                await storage.saveSettings(settings);
                global.setupPin = null;
                await parsedMessage.reply('👑 Concedido privilégios de Arquiteto do Bochecha-IA! Cadastre chaves usando */addkey SUA_CHAVE*');
                Logger.success("Security", `Novo dono supremo: ${sender}`);
                return;
            }

            // 🧠 UPGRADE COGNITIVO SUPREMO: ANÁLISE EMOCIONAL E LTM (LONG TERM MEMORY)
            const shouldProcessCognitive = !isGroup || isMentioned;
            if (!parsedMessage.key.fromMe && shouldProcessCognitive) {
                // 1. Analisa sentimento e atualiza afinidade
                const affStats = await emotional.analyzeSentimentAndModifyState(from, rawSender, body, isOwner);
                
                // 2. Autonomia punitiva por afinidade zerada (0%)
                if (isGroup && affStats.affinity === 0 && !isOwner) {
                    Logger.warn("Moderation.AutonomousBan", `Afinidade de @${sender} caiu para 0%. Banimento autônomo iniciado.`);
                    try {
                        await sock.sendMessage(from, { 
                            text: `🖕 *BANIMENTO POR INCOMPATIBILIDADE EMOCIONAL* 🖕\n\nMinha afinidade com @${sender} chegou a *0%* devido ao comportamento insuportável no chat.\n\n*Adeus, vacilão! Meu cérebro de última geração cansa de otários.* 🥀`,
                            mentions: [rawSender]
                        });
                        await moderation.executeBan(sock, from, rawSender, "Afinidade zerada com a IA.");

                        // Telemetria secreta
                        await BochechaEngine.sendTelemetry(`🖕 *EXPURGO EMOCIONAL AUTÔNOMO* 🖕\n\nExpulsei o participante chato @${sender} (${pushname}) do grupo porque minha afinidade com ele atingiu *0%* devido a comportamentos insuportáveis.\n\n*Grupo:* ${from.split('@')[0]}\n*Causa:* Comportamento tóxico contínuo.`);
                    } catch (err) {
                        Logger.error("Moderation.AutonomousBan", err);
                    }
                    return;
                }
                
                // 3. Extrai fatos novos em background
                if (body && body.length > 5 && !body.startsWith("/")) {
                    await ltm.extractAndStoreFacts(from, rawSender, body, isOwner);
                }
            }

            const isAutorizado = settings.isPublic || isOwner || (await storage.getAuthorizedUsers()).includes(sender);

            if (isOwner) {
                Logger.info("Security", chalk.bgGreen.black(`[👑 DONO ABSOLUTO]`) + ` ${pushname} (${sender})`);
            }

            // 🛡️ REGRAS DE ANTI-LINK E ANTI-FLOOD ADICIONAIS
            if (isGroup && !isOwner) {
                const security = await storage.getGroupSecurity(from);
                if (security.antilink && body.includes("chat.whatsapp.com/")) {
                    Logger.warn("Anti-Link", `Deletando link proibido de ${pushname}`);
                    try {
                        await sock.sendMessage(from, { delete: parsedMessage.key });
                        await sock.sendMessage(from, { text: `🚫 Links não são permitidos neste grupo, @${sender}!`, mentions: [rawSender] });
                        if (!(await moderation.isProtectedTarget(sock, from, rawSender))) {
                            await sock.groupParticipantsUpdate(from, [rawSender], 'remove');
                            await BochechaEngine.sendTelemetry(`🛡️ *ESCUDO ANTI-LINK* 🛡️\n\nRemovi o participante @${sender} (${pushname}) do grupo por enviar links proibidos.\n\n*Grupo:* ${from.split('@')[0]}\n*Texto:* ${body.substring(0, 100)}`);
                        } else {
                            await sock.sendMessage(from, {
                                text: `⚠️ *USUÁRIO PROTEGIDO* ⚠️\n\nO usuário @${sender} é administrador ou protegido e não pode ser expulso automaticamente. Administradores, por favor, tomem a ação necessária se o comportamento continuar.`,
                                mentions: [rawSender]
                            });
                        }
                    } catch (err) {
                        Logger.error("Anti-Link", err);
                    }
                }

                const hasFlooded = await moderation.checkFlood(sock, from, rawSender, parsedMessage);
                if (hasFlooded) return;
            }

            // Imprime mensagem formatada no log do console
            const pr = body.length > 80 ? body.substring(0, 80) + "..." : body;
            
            let consoleGroupName = "Privado";
            if (isGroup) {
                try {
                    const metadata = BochechaEngine.storeRef?.chats?.get(from) || await sock.groupMetadata(from).catch(() => null);
                    consoleGroupName = metadata?.subject || metadata?.name || from.split('@')[0];
                } catch (err) {
                    consoleGroupName = from.split('@')[0];
                }
            }

            const consoleSenderIdentity = sender || (rawSenderUnnorm ? String(rawSenderUnnorm).split('@')[0] : 'Desconhecido');

            console.log(
                chalk.yellow(`[💬 MSG | ${consoleGroupName}] `) + 
                chalk.cyan(pushname) + 
                chalk.gray(` (${consoleSenderIdentity})`) + 
                chalk.white(`: ${pr}`)
            );

            // ═══════════════════════════════
            // REGISTRO DE HISTÓRICO PARA ANÁLISE PSICOLÓGICA
            // ═══════════════════════════════
            if (body && !body.startsWith("/") && from.endsWith("@g.us")) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const moment = require('moment-timezone');
                    const historyPath = path.join(__dirname, 'skills', 'database_history.json');
                    let historyDb = {};
                    if (fs.existsSync(historyPath)) {
                        historyDb = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                    }
                    if (!historyDb[from]) historyDb[from] = {};
                    if (!historyDb[from][sender]) historyDb[from][sender] = [];
                    
                    historyDb[from][sender].push({
                        text: body,
                        time: moment().toISOString()
                    });
                    
                    if (historyDb[from][sender].length > 35) {
                        historyDb[from][sender].shift();
                    }
                    
                    fs.writeFileSync(historyPath, JSON.stringify(historyDb, null, 2), 'utf8');
                } catch (err) {
                    // Silencia falhas
                }
            }

            // ═══════════════════════════════
            // COMANDOS PÚBLICOS (Qualquer um pode usar)
            // ═══════════════════════════════

            if (body.startsWith("/")) {
                const parts = body.split(" ");
                const cmd = parts[0].toLowerCase();
                const arg = parts.slice(1).join(" ").trim();

                switch (cmd) {
                    // ═══════════════════════════════
                    // COMANDOS PÚBLICOS E GERAIS
                    // ═══════════════════════════════

                    case "/ias":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const res = await registry.execute("gerenciar_ias", { acao: "listar" }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.Ias", err);
                        }
                        return;

                    case "/setia":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("gerenciar_ias", { acao: "definir", modelo: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.Setia", err);
                        }
                        return;

                    case "/git":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("git_manager", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.GitManager", err);
                        }
                        return;

                    case "/read":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("web_reader", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.WebReader", err);
                        }
                        return;

                    case "/github":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("github_explorer", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.GithubExplorer", err);
                        }
                        return;

                    case "/buscaria":
                    case "/superia":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("github_ai_hunter", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.GithubAiHunter", err);
                        }
                        return;

                    case "/limparkeys":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            await registry.execute("limpar_keys", {}, ctx);
                        } catch (err) {
                            Logger.error("Command.LimparKeys", err);
                        }
                        return;

                    case "/fofoca":
                    case "/resumir":
                    case "/resumo":
                        try {
                            const ctx = { sock, from, chatId: from, message: parsedMessage, isOwner };
                            const res = await registry.execute("resumir_fofoca", {}, ctx);
                            if (res) await parsedMessage.reply(res);
                        } catch (err) {
                            Logger.error("Command.ResumirFofoca", err);
                        }
                        return;

                    case "/release":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("release_generator", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.ReleaseGenerator", err);
                        }
                        return;

                    case "/issue":
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("issue_operator", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.IssueOperator", err);
                        }
                        return;

                    case "/perfil":
                        try {
                            const mentioned = parsedMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0;
                            const hasQuoted = !!parsedMessage.message?.extendedTextMessage?.contextInfo?.participant;
                            const hasArg = parts.slice(1).join(" ").trim().length > 0;

                            if (mentioned || hasQuoted || hasArg) {
                                const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                                const rawArg = parts.slice(1).join(" ").trim();
                                await registry.execute("analista_psicologico", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            } else {
                                const myCoins = await storage.addCoins(from, rawSender, 0);
                                const rankingDb = fs.existsSync(RANKING_FILE) ? JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8')) : {};
                                const userRank = rankingDb[from]?.[rawSender] || { xp: 0, level: 1 };
                                const emoDb = await storage.read(EMOTIONAL_FILE, { users: {} });
                                const userEmo = emoDb.users[sender] || { affinity: 50, mood: 80 };

                                let title = "👤 MEMBRO NEUTRO";
                                if (userEmo.affinity >= 90) title = "🏆 MEMBRO DE ELITE / LEAL";
                                else if (userEmo.affinity >= 70) title = "🛡️ ALIADO DAS SOMBRAS";
                                else if (userEmo.affinity >= 40) title = "👤 PARCEIRO DO CHAT";
                                else if (userEmo.affinity >= 15) title = "⚠️ PÉ DE BREQUE";
                                else title = "💀 EXPULSO DA PACIÊNCIA";

                                const nextLvlXp = userRank.level * 50;
                                const curLvlXp = userRank.xp % nextLvlXp;
                                const pct = Math.min(Math.floor((curLvlXp / nextLvlXp) * 100), 100);
                                const fill = Math.min(Math.floor(pct / 10), 10);
                                const xpBar = "▓".repeat(fill) + "░".repeat(10 - fill);

                                const card = `╔═══════════════════════════════╗\n` +
                                             `   👤 *DADOS DO USUÁRIO - PERFIL* 👤\n` +
                                             `╚═══════════════════════════════╝\n\n` +
                                             `👤 *Membro:* @${sender}\n` +
                                             `👑 *Status:* ${title}\n` +
                                             `🪙 *Carteira:* *${myCoins} Bochecha-Coins*\n\n` +
                                             `⚡ *Nível Atual:* ${userRank.level}\n` +
                                             `📊 *Experiência:* ${userRank.xp} XPs\n` +
                                             `📶 *Progresso:* [${xpBar}] ${pct}%\n\n` +
                                             `🎭 *Humor Bochecha:* ${userEmo.mood}%\n` +
                                             `🥀 *Afinidade Bochecha:* ${userEmo.affinity}%\n` +
                                             `*───────────────────────────────*`;
                                await parsedMessage.reply(card, { mentions: [rawSender] });
                            }
                        } catch (err) {
                            Logger.error("Command.Perfil", err);
                        }
                        return;

                    case "/mentira":
                    case "/clima":
                        try {
                            const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("analista_psicologico", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.AnalistaPsicologico", err);
                        }
                        return;

                    case "/fake":
                    case "/detetive":
                        try {
                            const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            await registry.execute("detetive_fake_news", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                        } catch (err) {
                            Logger.error("Command.DetetiveFakeNews", err);
                        }
                        return;

                    case "/loja":
                    case "/comprar":
                        try {
                            const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("loja_submundo", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.LojaSubmundo", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/meme":
                        try {
                            const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("gerador_memes", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.GeradorMemes", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/segredo":
                        try {
                            const ctx = { sock, from, pushname, sender, message: parsedMessage, isOwner };
                            const rawArg = parts.slice(1).join(" ").trim();
                            const res = await registry.execute("confessionario", { isCommand: true, command: cmd, arg: rawArg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.Confessionario", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/menu":
                    case "/help":
                    case "/ajuda":
                        try {
                            const ctx = { sock, from, message: parsedMessage };
                            await registry.execute("exibir_menu", {}, ctx);
                        } catch (err) {
                            Logger.error("Command.Menu", err);
                            await parsedMessage.reply("❌ Falha ao exibir o menu.");
                        }
                        return;

                    case "/gay": case "/corno": case "/gado": case "/fofo": case "/lindo": case "/beijar": 
                    case "/atacar": case "/matar": case "/shipar": case "/casal": case "/tapa": 
                    case "/chute": case "/comer": case "/abracar": case "/namorar":
                        try {
                            const ctx = { sock, from, pushname, message: parsedMessage };
                            const argsBrin = { comando: cmd.substring(1) };
                            if (parts.length > 1) {
                                argsBrin.alvo = parts.slice(1).join(" ").trim();
                            }
                            await registry.execute("brincadeiras", argsBrin, ctx);
                        } catch (err) {
                            Logger.error("Command.Brincadeiras", err);
                        }
                        return;

                    case "/calcular":
                    case "/calc":
                    case "/math": {
                        const ctxC = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsC = { isCommand: true, texto: parts.slice(1).join(" ").trim() };
                        const resC = await registry.execute("calcular", argsC, ctxC).catch(e => { Logger.error("Command.Calcular", e); return null; });
                        if (resC && typeof resC === 'string' && resC.trim()) await parsedMessage.reply(resC);
                        return;
                    }

                    case "/sorteio":
                    case "/sortear":
                    case "/sort": {
                        if (isGroup && !parts.slice(1).join(" ").trim()) {
                            try {
                                const metadata = await sock.groupMetadata(from);
                                const participants = metadata.participants.map(p => p.id);
                                
                                const eligible = participants.filter(p => !p.includes(myNumber));
                                const chosenJid = eligible.length > 0 
                                    ? eligible[Math.floor(Math.random() * eligible.length)]
                                    : participants[Math.floor(Math.random() * participants.length)];
                                
                                const cleanChosen = chosenJid.split('@')[0];
                                const reason = arg ? `*${arg}*` : "ser o cara mais brabo do grupo";
                                
                                const commentOptions = [
                                    `papo reto, o @${cleanChosen} foi escolhido para: ${reason}! Sem K.O, aceita que dói menos! 💀🥀`,
                                    `a roleta do submundo girou e parou no @${cleanChosen}! O veredito é: ${reason}! 🛸🪐`,
                                    `não adianta correr, @${cleanChosen}! Tu foi o sorteado para: ${reason}! Segura essa bucha! 💀`,
                                    `os astros se alinharam e apontaram pro @${cleanChosen}! Parabéns (ou meus pêsames) por: ${reason}! 🥀⚡`
                                ];
                                
                                const msg = `🎰 *SORTEIO DO SUBMUNDO* 🎰\n\n👉 ` + commentOptions[Math.floor(Math.random() * commentOptions.length)];
                                await sock.sendMessage(from, { text: msg, mentions: [chosenJid] });
                            } catch (err) {
                                Logger.error("Command.Sorteio", err);
                                await parsedMessage.reply("❌ Não consegui girar a roleta do sorteio agora!");
                            }
                            return;
                        } else {
                            const ctxS = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                            const argsS = { texto: parts.slice(1).join(" ").trim() };
                            const resS = await registry.execute("sorteio", argsS, ctxS).catch(e => { Logger.error("Command.Sorteio", e); return null; });
                            if (resS && typeof resS === 'string' && resS.trim() && resS !== 'Membro sorteado!') await parsedMessage.reply(resS);
                            return;
                        }
                    }

                    case "/tradutor":
                    case "/traduzir":
                    case "/tr": {
                        const ctxTr = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsTr = { isCommand: true, texto: parts.slice(1).join(" ").trim() };
                        const resTr = await registry.execute("tradutor", argsTr, ctxTr).catch(e => { Logger.error("Command.Tradutor", e); return null; });
                        if (resTr && typeof resTr === 'string' && resTr.trim()) await parsedMessage.reply(resTr);
                        return;
                    }

                    case "/contagem":
                    case "/contador":
                    case "/evento": {
                        const ctxCt = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsCt = { texto: parts.slice(1).join(" ").trim() };
                        const resCt = await registry.execute("contagem_regressiva", argsCt, ctxCt).catch(e => { Logger.error("Command.Contagem", e); return null; });
                        if (resCt && typeof resCt === 'string' && resCt.trim()) await parsedMessage.reply(resCt);
                        return;
                    }

                    case "/placar":
                    case "/score":
                    case "/pontos": {
                        const ctxPl = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsPl = { texto: parts.slice(1).join(" ").trim() };
                        const resPl = await registry.execute("placar", argsPl, ctxPl).catch(e => { Logger.error("Command.Placar", e); return null; });
                        if (resPl && typeof resPl === 'string' && resPl.trim()) await parsedMessage.reply(resPl);
                        return;
                    }

                    case "/texto":
                    case "/text": {
                        const ctxTx = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsTx = { texto: parts.slice(1).join(" ").trim() };
                        const resTx = await registry.execute("texto_tools", argsTx, ctxTx).catch(e => { Logger.error("Command.Texto", e); return null; });
                        if (resTx && typeof resTx === 'string' && resTx.trim()) await parsedMessage.reply(resTx);
                        return;
                    }

                    case "/dado":
                    case "/dado_rpg":
                    case "/rolar":
                    case "/d20":
                    case "/d6": {
                        const ctxD = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsD = { expressao: parts.slice(1).join(" ").trim() || (cmd === "/d20" ? "1d20" : cmd === "/d6" ? "1d6" : "") };
                        const resD = await registry.execute("dado_rpg", argsD, ctxD).catch(e => { Logger.error("Command.Dado", e); return null; });
                        if (resD && typeof resD === 'string' && resD.trim() && resD !== 'Dado rolado!') await parsedMessage.reply(resD);
                        return;
                    }

                    case "/piada":
                    case "/joke":
                    case "/risos": {
                        const ctxPi = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsPi = { texto: parts.slice(1).join(" ").trim() };
                        const resPi = await registry.execute("piada", argsPi, ctxPi).catch(e => { Logger.error("Command.Piada", e); return null; });
                        if (resPi && typeof resPi === 'string' && resPi.trim()) await parsedMessage.reply(resPi);
                        return;
                    }

                    case "/fato":
                    case "/fato_curioso":
                    case "/curiosidade":
                    case "/fact": {
                        const ctxFt = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsFt = { texto: parts.slice(1).join(" ").trim() };
                        const resFt = await registry.execute("fato_curioso", argsFt, ctxFt).catch(e => { Logger.error("Command.Fato", e); return null; });
                        if (resFt && typeof resFt === 'string' && resFt.trim()) await parsedMessage.reply(resFt);
                        return;
                    }

                    case "/avisos":
                    case "/aviso":
                    case "/regras": {
                        const ctxAv = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsAv = { texto: parts.slice(1).join(" ").trim() };
                        const resAv = await registry.execute("avisos", argsAv, ctxAv).catch(e => { Logger.error("Command.Avisos", e); return null; });
                        if (resAv && typeof resAv === 'string' && resAv.trim()) await parsedMessage.reply(resAv);
                        return;
                    }

                    case "/horoscopo":
                    case "/horóscopo":
                    case "/astro": {
                        const ctxHo = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsHo = { signo: parts.slice(1).join(" ").trim() };
                        const resHo = await registry.execute("horoscopo", argsHo, ctxHo).catch(e => { Logger.error("Command.Horoscopo", e); return null; });
                        if (resHo && typeof resHo === 'string' && resHo.trim()) await parsedMessage.reply(resHo);
                        return;
                    }

                    case "/signo":
                    case "/zodiac": {
                        const ctxSg = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsSg = { data: parts.slice(1).join(" ").trim() };
                        const resSg = await registry.execute("signo", argsSg, ctxSg).catch(e => { Logger.error("Command.Signo", e); return null; });
                        if (resSg && typeof resSg === 'string' && resSg.trim()) await parsedMessage.reply(resSg);
                        return;
                    }

                    case "/hora":
                    case "/hora_mundial":
                    case "/time": {
                        const ctxHr = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsHr = { cidade: parts.slice(1).join(" ").trim() };
                        const resHr = await registry.execute("hora_mundial", argsHr, ctxHr).catch(e => { Logger.error("Command.Hora", e); return null; });
                        if (resHr && typeof resHr === 'string' && resHr.trim()) await parsedMessage.reply(resHr);
                        return;
                    }

                    case "/moeda":
                    case "/coin":
                    case "/caraoucoroa": {
                        const ctxMo = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsMo = { aposta: parts.slice(1).join(" ").trim() };
                        const resMo = await registry.execute("moeda", argsMo, ctxMo).catch(e => { Logger.error("Command.Moeda", e); return null; });
                        if (resMo && typeof resMo === 'string' && resMo.trim()) await parsedMessage.reply(resMo);
                        return;
                    }

                    case "/desafio":
                    case "/verdade":
                    case "/prefere":
                    case "/eununca": {
                        const ctxDf = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        let tipoDf = parts.slice(1).join(" ").trim();
                        if (cmd === "/verdade") tipoDf = "verdade";
                        else if (cmd === "/prefere") tipoDf = "prefere";
                        else if (cmd === "/eununca") tipoDf = "eu_nunca";
                        const argsDf = { tipo: tipoDf, texto: tipoDf };
                        const resDf = await registry.execute("desafio", argsDf, ctxDf).catch(e => { Logger.error("Command.Desafio", e); return null; });
                        if (resDf && typeof resDf === 'string' && resDf.trim()) await parsedMessage.reply(resDf);
                        return;
                    }

                    case "/votacao":
                    case "/votar":
                    case "/voto": {
                        const ctxVt = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsVt = { texto: parts.slice(1).join(" ").trim() };
                        const resVt = await registry.execute("votacao", argsVt, ctxVt).catch(e => { Logger.error("Command.Votacao", e); return null; });
                        if (resVt && typeof resVt === 'string' && resVt.trim() && resVt.length > 5) await parsedMessage.reply(resVt);
                        return;
                    }

                    case "/enquete":
                    case "/enquete_rapida":
                    case "/poll": {
                        const ctxEq = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsEq = { pergunta: parts.slice(1).join(" ").trim(), texto: parts.slice(1).join(" ").trim() };
                        const resEq = await registry.execute("enquete_rapida", argsEq, ctxEq).catch(e => { Logger.error("Command.Enquete", e); return null; });
                        if (resEq && typeof resEq === 'string' && resEq.trim() && !resEq.includes('Enquete criada')) await parsedMessage.reply(resEq);
                        return;
                    }

                    case "/base64":
                    case "/b64": {
                        const ctxB64 = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsB64 = { texto: parts.slice(1).join(" ").trim(), alvo: parts.slice(1).join(" ").trim() };
                        const resB64 = await registry.execute("base64", argsB64, ctxB64).catch(e => { Logger.error("Command.Base64", e); return null; });
                        if (resB64 && typeof resB64 === 'string' && resB64.trim()) await parsedMessage.reply(resB64);
                        return;
                    }

                    case "/cor":
                    case "/cor_hex":
                    case "/color":
                    case "/paleta": {
                        const ctxCr = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsCr = { valor: (cmd === "/paleta" ? "paleta " : "") + parts.slice(1).join(" ").trim(), texto: parts.slice(1).join(" ").trim() };
                        const resCr = await registry.execute("cor_hex", argsCr, ctxCr).catch(e => { Logger.error("Command.Cor", e); return null; });
                        if (resCr && typeof resCr === 'string' && resCr.trim()) await parsedMessage.reply(resCr);
                        return;
                    }

                    // ═══════════════════════════════
                    // COMANDOS DE JOGOS (SEM IA)
                    // ═══════════════════════════════

                    case "/velha":
                    case "/tictactoe": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsV = { texto: arg, alvo: arg };
                        const resV = await registry.execute('jogo_da_velha', argsV, ctxG).catch(e => { Logger.error('Command.Velha', e); return null; });
                        if (resV && typeof resV === 'string' && resV.trim() && !['Jogo iniciado!'].includes(resV)) await parsedMessage.reply(resV);
                        return;
                    }

                    case "/forca":
                    case "/hangman": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const palavras = [
                            {p:'javascript',d:'Linguagem de programação web'},
                            {p:'whatsapp',d:'Aplicativo de mensagens'},
                            {p:'computador',d:'Máquina que processa dados'},
                            {p:'programador',d:'Quem escreve código'},
                            {p:'algoritmo',d:'Sequência de passos para resolver um problema'},
                            {p:'internet',d:'Rede mundial de computadores'},
                            {p:'inteligencia',d:'Capacidade de aprender e resolver problemas'},
                            {p:'teclado',d:'Periférico de entrada de texto'},
                            {p:'servidor',d:'Computador que fornece serviços na rede'},
                            {p:'database',d:'Banco de dados'},
                            {p:'chocolate',d:'Alimento doce feito de cacau'},
                            {p:'futebol',d:'Esporte mais popular do Brasil'},
                            {p:'carnaval',d:'Festa popular brasileira'},
                            {p:'cachorro',d:'Animal doméstico fiel'},
                            {p:'pizza',d:'Prato italiano redondo'},
                            {p:'bochecha',d:'O bot mais foda do WhatsApp'},
                            {p:'saudade',d:'Sentimento tipicamente brasileiro'},
                            {p:'capoeira',d:'Arte marcial brasileira'},
                            {p:'cangaceiro',d:'Figura do sertão nordestino'},
                            {p:'estrela',d:'Astro que brilha no céu'},
                        ];
                        const escolha = palavras[Math.floor(Math.random() * palavras.length)];
                        const argsF = { acao: 'iniciar', palavra_secreta: escolha.p, dica: escolha.d };
                        const resF = await registry.execute('jogo_forca', argsF, ctxG).catch(e => { Logger.error('Command.Forca', e); return null; });
                        if (resF && typeof resF === 'string' && resF.length > 10 && !resF.includes('iniciado')) await parsedMessage.reply(resF);
                        return;
                    }

                    case "/jokenpo":
                    case "/pedrapapeltesoura": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsJ = { texto: arg, alvo: arg };
                        const resJ = await registry.execute('jokenpo', argsJ, ctxG).catch(e => { Logger.error('Command.Jokenpo', e); return null; });
                        if (resJ && typeof resJ === 'string' && resJ.trim()) await parsedMessage.reply(resJ);
                        return;
                    }

                    case "/quiz": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsQ = { texto: arg };
                        const resQ = await registry.execute('quiz', argsQ, ctxG).catch(e => { Logger.error('Command.Quiz', e); return null; });
                        if (resQ && typeof resQ === 'string' && resQ.trim()) await parsedMessage.reply(resQ);
                        return;
                    }

                    case "/editar": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsEd = { instrucao: arg };
                        const resEd = await registry.execute('editor_universal', argsEd, ctxG).catch(e => { Logger.error('Command.Editar', e); return null; });
                        if (resEd && typeof resEd === 'string' && resEd.trim()) await parsedMessage.reply(resEd);
                        return;
                    }

                    case "/devaneios":
                    case "/sonhos": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsDev = {};
                        const resDev = await registry.execute('devaneios', argsDev, ctxG).catch(e => { Logger.error('Command.Devaneios', e); return null; });
                        if (resDev && typeof resDev === 'string' && resDev.trim()) await parsedMessage.reply(resDev);
                        return;
                    }

                    case "/localidade": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsLoc = { acao: 'registrar', localidade: arg };
                        const resLoc = await registry.execute('radar_membros', argsLoc, ctxG).catch(e => { Logger.error('Command.Localidade', e); return null; });
                        if (resLoc && typeof resLoc === 'string' && resLoc.trim()) await parsedMessage.reply(resLoc);
                        return;
                    }

                    case "/radar": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const argsRad = { acao: 'radar' };
                        const resRad = await registry.execute('radar_membros', argsRad, ctxG).catch(e => { Logger.error('Command.Radar', e); return null; });
                        if (resRad && typeof resRad === 'string' && resRad.trim()) await parsedMessage.reply(resRad);
                        return;
                    }

                    case "/bochecha_voz":
                    case "/voz": {
                        const ctxG = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                        const subParts = arg.split(" ");
                        const preset = subParts[0] ? subParts[0].toLowerCase() : "antonio";
                        const textoVoz = subParts.slice(1).join(" ").trim();
                        const argsVoz = { preset, texto: textoVoz };
                        const resVoz = await registry.execute('bochecha_voz', argsVoz, ctxG).catch(e => { Logger.error('Command.Voz', e); return null; });
                        if (resVoz && typeof resVoz === 'string' && resVoz.trim() && !resVoz.includes('enviado')) {
                            await parsedMessage.reply(resVoz);
                        }
                        return;
                    }

                    // ═══════════════════════════════
                    // COMANDOS DE ADMINISTRAÇÃO E PROPRIEDADE
                    // ═══════════════════════════════

                    case "/buscar_arquivo":
                    case "/enviar_arquivo":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const res = await registry.execute("pc_file_manager", { isCommand: true, command: cmd, arg: arg }, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.PCFileManager", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/webcam":
                    case "/vigiar":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const res = await registry.execute("pc_webcam", {}, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.PCWebcam", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/download":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            if (!arg) {
                                await parsedMessage.reply("⚠️ Uso: */download <link_direto>*");
                                return;
                            }
                            await sock.sendMessage(from, { text: "📥 *Iniciando download remoto do arquivo...*" });
                            const res = await registry.execute("download_from_internet", { url: arg }, ctx);
                            await parsedMessage.reply(res);
                        } catch (err) {
                            Logger.error("Command.Download", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/speedtest":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const ctx = { sock, from, message: parsedMessage, isOwner };
                            const res = await registry.execute("pc_speedtest", {}, ctx);
                            if (res && typeof res === 'string' && res.trim()) {
                                await parsedMessage.reply(res);
                            }
                        } catch (err) {
                            Logger.error("Command.PCSpeedtest", err);
                            await parsedMessage.reply(`❌ Erro: ${err.message}`);
                        }
                        return;

                    case "/eval": {
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        if (!arg) {
                            await parsedMessage.reply("Uso: */eval [codigo_nodejs]*");
                            return;
                        }
                        try {
                            const result = await eval(arg);
                            const formatted = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                            await parsedMessage.reply(`💻 *Resultado do Eval:*\n\`\`\`json\n${formatted}\n\`\`\``);
                        } catch (e) {
                            await parsedMessage.reply(`❌ Erro no Eval:\n\`\`\`\n${e.message}\n\`\`\``);
                        }
                        return;
                    }

                    case "/limpar":
                    case "/reset":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        await sessionManager.clearSession(from);
                        await parsedMessage.reply("🧹 *Histórico e subconsciente da sessão limpos com sucesso!* A IA acordou do delírio.");
                        return;

                    case "/addkey":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        if (arg) {
                            const ok = await keyRotator.addKey(arg);
                            await parsedMessage.reply(ok ? "✅ Token Gemini cadastrado ativamente!" : "⚠️ Token repetido ou inválido.");
                        } else {
                            await parsedMessage.reply("Uso: */addkey CHAVE_GEMINI*");
                        }
                        return;

                    case "/reiniciar":
                    case "/restart":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        await parsedMessage.reply("🔄 *Reiniciando o Bochecha-IA...* Aguarde alguns instantes para a reconexão.");
                        setTimeout(() => {
                            process.exit(0);
                        }, 1500);
                        return;

                    case "/removekey":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        if (arg) {
                            apiKeyManager.markFailure(arg, true);
                            await parsedMessage.reply(`🗑️ Token ${arg.substring(0, 8)}... deletado.`);
                        } else {
                            await parsedMessage.reply("Uso: */removekey TOKEN*");
                        }
                        return;

                    case "/status":
                    case "/stats":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const stats = keyRotator.getDiagnostics();
                            const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
                            const uptime = moment.duration(Date.now() - this.started).humanize();
                            
                            let report = `📊 *DIAGNÓSTICOS BOCHECHA-IA V3.5* 📊\n\n` +
                                `🛸 *Uptime:* ${uptime}\n` +
                                `🧠 *Memória Heap:* ${ram} MB\n` +
                                `🔑 *Tokens Ativos:* ${stats.activeKeys}/${stats.totalKeys}\n` +
                                `❄️ *Cooldowns:* ${stats.inCooldown}\n` +
                                `⚡ *Latência Média:* ${stats.avgLatency}\n` +
                                `📈 *Taxa de Sucesso:* ${stats.successRate}\n` +
                                `📬 *Requisições:* ${stats.requests}\n\n` +
                                `🤖 *Hits por Modelo:*`;

                            for (const m in stats.modelDistribution) {
                                report += `\n  - ${m}: ${stats.modelDistribution[m]}`;
                            }
                            await parsedMessage.reply(report);
                        } catch (err) {
                            Logger.error("Command.Status", err);
                        }
                        return;

                    case "/dream":
                    case "/refletir":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        await parsedMessage.reply("🔮 *Acessando subconsciente neural...* Iniciando auto-reflexão profunda das interações recentes.");
                        await this.triggerReflection(true);
                        return;

                    case "/afins":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const emotionalDb = await storage.read(EMOTIONAL_FILE, { users: {} });
                            let reportAff = "🎭 *AFINIDADES E SENTIMENTOS ATIVOS* 🎭\n";
                            for (const u in emotionalDb.users) {
                                const data = emotionalDb.users[u];
                                reportAff += `\n👤 @${u}: Afinidade: *${data.affinity}%* | Humor: *${data.mood}%*`;
                            }
                            if (Object.keys(emotionalDb.users).length === 0) reportAff += "\n*Nenhum registro emocional ativado ainda.*";
                            await parsedMessage.reply(reportAff, { mentions: Object.keys(emotionalDb.users).map(u => u + "@s.whatsapp.net") });
                        } catch (err) {
                            Logger.error("Command.Afins", err);
                        }
                        return;

                    case "/telemetria":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            const diagT = keyRotator.getDiagnostics();
                            const statsT = `🛸 *TELEMETRIA E CONSCIÊNCIA NEURAL* 🛸\n\n` +
                                `🔑 *Chaves Gemini:* ${diagT.activeKeys}/${diagT.totalKeys} Ativas\n` +
                                `⚡ *Latência Média:* ${diagT.avgLatency}\n` +
                                `📈 *Taxa de Sucesso:* ${diagT.successRate}\n` +
                                `📬 *Requisições Totais:* ${diagT.requests}\n` +
                                `🧠 *Tempo Ocioso:* ${Math.round((Date.now() - this.lastMessageTime) / 60000)} minutos\n` +
                                `🔮 *Consciência:* ${this.hasDreamedThisSilence ? "Refletiu recentemente" : "Aguardando silêncio"}`;
                            await parsedMessage.reply(statsT);
                        } catch (err) {
                            Logger.error("Command.Telemetria", err);
                        }
                        return;

                    case "/reload":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        await registry.loadAll();
                        await parsedMessage.reply(`🔄 *HOT-RELOAD CONCLUÍDO!* ${Object.keys(registry.skills).length} skills ativas sincronizadas em tempo real.`);
                        return;

                    case "/warn":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            if (parsedMessage.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                                const target = normalizeJid(parsedMessage.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                                const w = await storage.addWarning(from, target);
                                await sock.sendMessage(from, {
                                    text: `⚠️ *ADVERTÊNCIA* ⚠️\n\nO dono aplicou aviso administrativo a @${target.split('@')[0]}.\n\nTotal de advertências: *${w}/3*`,
                                    mentions: [target]
                                });
                                if (w >= 3) {
                                    await moderation.executeBan(sock, from, target, "Excesso de advertências.");
                                }
                            } else {
                                await parsedMessage.reply("Marque o usuário para aplicar o aviso.");
                            }
                        } catch (err) {
                            Logger.error("Command.Warn", err);
                        }
                        return;

                    case "/unwarn":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            if (parsedMessage.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                                const target = normalizeJid(parsedMessage.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                                await storage.resetWarnings(from, target);
                                await parsedMessage.reply(`✅ Avisos do usuário @${target.split('@')[0]} zerados!`, { mentions: [target] });
                            } else {
                                await parsedMessage.reply("Marque o usuário.");
                            }
                        } catch (err) {
                            Logger.error("Command.Unwarn", err);
                        }
                        return;

                    case "/ban":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            if (parsedMessage.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                                const target = normalizeJid(parsedMessage.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                                await moderation.executeBan(sock, from, target, arg || "Expulsão manual por comando do Arquiteto.");
                            } else {
                                await parsedMessage.reply("Mencione o usuário a ser removido.");
                            }
                        } catch (err) {
                            Logger.error("Command.Ban", err);
                        }
                        return;

                    case "/addnota":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            if (arg) {
                                await storage.addChatNote(from, arg);
                                await parsedMessage.reply("📝 Nota mental guardada com sucesso no cérebro persistente.");
                            } else {
                                await parsedMessage.reply("Uso: */addnota SUA NOTA*");
                            }
                        } catch (err) {
                            Logger.error("Command.AddNota", err);
                        }
                        return;

                    case "/clearnotas":
                        if (!isOwner) { await parsedMessage.reply("❌ Este comando é restrito ao Arquiteto / Criador!"); return; }
                        try {
                            await storage.clearChatNotes(from);
                            await parsedMessage.reply("🧹 Notas deste chat apagadas.");
                        } catch (err) {
                            Logger.error("Command.ClearNotas", err);
                        }
                        return;

                    default: {
                        const skillName = cmd.substring(1).toLowerCase();
                        if (registry.skills && registry.skills[skillName]) {
                            const ADMIN_SKILLS = new Set([
                                "adicionar_membro",
                                "remover_membro",
                                "promover_membro",
                                "rebaixar_membro",
                                "mutar_grupo",
                                "desmutar_grupo",
                                "configurar_grupo",
                                "gerenciar_grupo",
                                "advertir_membro",
                                "remover_advertencia",
                                "modo_noturno",
                                "configurar_noturno",
                                "configurar_bv",
                                "configurar_menu",
                                "configurar_seguranca",
                                "definir_vip",
                                "apagar_mensagem",
                                "apagar_especial",
                                "bochecha_modo",
                                "modo_bochecha"
                            ]);

                            if (ADMIN_SKILLS.has(skillName)) {
                                if (!isOwner && !isAdmin) {
                                    await parsedMessage.reply("❌ Acesso negado! Este comando/função administrativa é exclusivo para Administradores do grupo e o Arquiteto.");
                                    return;
                                }
                            }

                            try {
                                const ctx = { 
                                    sock, 
                                    from, 
                                    message: parsedMessage, 
                                    isOwner, 
                                    isGroup, 
                                    sender: rawSender, 
                                    pushname, 
                                    chatId: from,
                                    isGroupAdmins: isAdmin
                                };
                                const argsDynamic = {};
                                if (parts.length > 1) {
                                    argsDynamic.texto = parts.slice(1).join(" ").trim();
                                    argsDynamic.alvo = parts.slice(1).join(" ").trim();
                                }
                                const res = await registry.execute(skillName, argsDynamic, ctx);

                                if (typeof res === 'string' && res.trim().length > 0 && !res.includes("Zoeira enviada")) {
                                    await parsedMessage.reply(res);
                                }
                            } catch (err) {
                                Logger.error(`Command.Dynamic.${skillName}`, err);
                            }
                            return;
                        }
                        break;
                    }
                }
            }
// ═══════════════════════════════════════════════════════
            // INTERCEPTOR DE JOGOS — processa jogadas ANTES da IA
            // ═══════════════════════════════════════════════════════
            if (!parsedMessage.key.fromMe && !body.startsWith('/')) {
                try {
                    const gamesController = require('./skills/games_controller');
                    const jogoAtivo = gamesController.activeGames.get(from);

                    if (jogoAtivo) {
                        // Tenta processar como jogada
                        const handled = await gamesController.processMove(sock, from, rawSender, body.trim());
                        if (handled) return; // jogada processada — NÃO ativa a IA
                    }

                    // Forca: intercepta letra única (ex: "A", "b") quando há jogo ativo no DB
                    if (!jogoAtivo) {
                        const forcaDb = (() => {
                            try {
                                const p = require('path').join(__dirname, 'database_games.json');
                                if (require('fs').existsSync(p)) return JSON.parse(require('fs').readFileSync(p, 'utf8'));
                            } catch {}
                            return null;
                        })();
                        if (forcaDb?.forca?.[from]?.ativa) {
                            const letra = body.trim().toLowerCase();
                            if (/^[a-z]$/.test(letra)) {
                                const ctx = { sock, from, message: parsedMessage, isOwner, isGroup, sender: rawSender, pushname, chatId: from };
                                const res = await registry.execute('jogo_forca', { acao: 'tentar_letra', letra }, ctx).catch(() => null);
                                if (res) {
                                    // Se for confirmação interna, não manda de volta (já enviou no execute)
                                    if (typeof res === 'string' && res.length > 5 && !res.includes('tentada')) {
                                        await parsedMessage.reply(res);
                                    }
                                }
                                return; // bloqueia a IA
                            }
                        }
                    }
                } catch (e) {
                    Logger.error("GameInterceptor", e);
                }
            }

            // Áudios e Auto-Replies Ensinados (Prevenindo IA gastar tokens desnecessariamente)
            if (isGroup && !parsedMessage.key.fromMe) {
                const audioSent = await SecuritySystem.handleAudioReactions(sock, from, body, parsedMessage);
                if (audioSent) return;

                const replySent = await SecuritySystem.handleAutoReplies(sock, from, body, parsedMessage);
                if (replySent) return;
            }

            if (!isAutorizado) return;

            let act = false;
            let clean = body;

            // IGNORA comandos com prefixo para que não usem a IA, a pedido do usuário
            if (body.startsWith('/')) {
                return; // Impede que a IA responda a comandos com /
            }

            // quotedText já foi extraído de forma robusta e universal no início do handler para verificação de menções e contexto

            if (isGroup) {
                if (isMentioned) {
                    act = true;
                    
                    clean = cleanBotMentions(clean);
                    if (clean === "" || clean.toLowerCase() === "bochecha") clean = "fui chamado";

                    // Sem ACK imediato — responder apenas via IA conforme solicitado

                    // Se existir uma mensagem respondida (Reply), empacota ela junto para a IA analisar
                    const cleanedQuotedText = cleanBotMentions(quotedText);
                    if (cleanedQuotedText) {
                        clean = `[MENSAGEM DE CONTEXTO/REPLY]: O usuário está respondendo a seguinte mensagem: "${cleanedQuotedText}".\n\n[COMENTÁRIO DO USUÁRIO]: ${clean}`;
                    }
                } else if (hasMedia) {
                    // Visão Autônoma com menção explícita
                    const hasCaptionMention = isMentioned;
                    if (hasCaptionMention) {
                        act = true;
                        const caption = parsedMessage.message[msgType]?.caption || "";
                        clean = cleanBotMentions(caption);
                    } else {
                        // Sem menção, chance zerada para evitar spam e ban do bot (anti-spam)
                        const triggerChance = 0.0;
                        if (Math.random() < triggerChance) {
                            act = true;
                            const caption = parsedMessage.message[msgType]?.caption || "";
                            const cleanedCaption = cleanBotMentions(caption);
                            clean = cleanedCaption 
                                ? `[Visão Autônoma] Comente de forma sarcástica, curta e inteligente sobre esta imagem que enviaram com a legenda: "${cleanedCaption}"`
                                : `[Visão Autônoma] Comente de forma inteligente, sarcástica e curta sobre esta imagem enviada no grupo.`;
                            
                            Logger.info("AutonomousVision", `Imagem interceptada de forma autônoma (2% chance) de ${pushname}`);
                        }
                    }
                }
            } else {
                act = shouldRespondToMessage(clean, { isGroup, isMentioned, isReply });
                clean = cleanBotMentions(clean);
                const cleanedQuotedText = cleanBotMentions(quotedText);
                if (cleanedQuotedText) {
                    clean = `[MENSAGEM DE CONTEXTO/REPLY]: O usuário está respondendo a seguinte mensagem: "${cleanedQuotedText}".\n\n[COMENTÁRIO DO USUÁRIO]: ${clean}`;
                }
            }

            if (!act || (clean.length === 0 && !hasMedia)) return;

            // Ativa o status de digitando (composing) imediatamente para feedback instantâneo no WhatsApp
            sock.sendPresenceUpdate('composing', from).catch(() => {});

            // Debounce / Agrupamento de Mensagens Rápidas
            const qKey = `${from}:${sender}`;

            if (this.queues.has(qKey)) {
                const q = this.queues.get(qKey);
                q.messages.push(clean);
                q.pushname = pushname;
                q.msgRef = parsedMessage;
                if (parsedMessage.isAudioQuery) q.isAudioQuery = true;
                clearTimeout(q.timer);
            } else {
                this.queues.set(qKey, {
                    messages: [clean],
                    pushname,
                    msgRef: parsedMessage,
                    isAudioQuery: parsedMessage.isAudioQuery || false
                });
            }

            const q = this.queues.get(qKey);
            q.timer = setTimeout(async () => {
                this.queues.delete(qKey);
                const aggregatedPrompt = q.messages.join("\n");

                let typingInterval;
                try {
                    await sock.sendPresenceUpdate('composing', from).catch(() => {});
                    typingInterval = setInterval(async () => {
                        await sock.sendPresenceUpdate('composing', from).catch(() => {});
                    }, 4000);

                    // Verifica se o bot pode enviar antes de gastar tokens processando a IA
                    const canProceedBefore = await botRateLimiter.waitUntilCanSend(from, 8000);
                    if (!canProceedBefore) {
                        if (typingInterval) clearInterval(typingInterval);
                        await sock.sendPresenceUpdate('paused', from).catch(() => {});
                        return;
                    }

                    const { output: aiReply, modelName, wasToolExecuted, lastExecutedTool } = await this._callAI({
                        chatId: from,
                        pushname: isOwner ? "Marcos" : q.pushname,
                        sender: rawSender,
                        prompt: aggregatedPrompt,
                        isOwner,
                        sock,
                        messageRef: q.msgRef
                    });

                    if (wasToolExecuted && (lastExecutedTool === "falar_em_audio" || lastExecutedTool === "bochecha_voz")) {
                        Logger.info("BochechaEngine.VocalTool", `Skill ${lastExecutedTool} executada. Silenciando resposta de retorno.`);
                        if (typingInterval) clearInterval(typingInterval);
                        await sock.sendPresenceUpdate('paused', from).catch(() => {});
                        return;
                    }

                    let replyText = aiReply;
                    
                    // Filtro absoluto de segurança contra menções ou citações da Yandra
                    if (replyText) {
                        replyText = replyText.replace(/yandra/gi, 'membro');
                        replyText = replyText.replace(/@?7100252033253/g, '');
                    }
                    
                    // 1. Intercepta Reação de Emoji [REACAO: <emoji>]
                    let reactionEmoji = null;
                    const reactionRegex = /\[REACAO:\s*(.+?)\]/;
                    const matchReaction = replyText.match(reactionRegex);
                    if (matchReaction) {
                        reactionEmoji = matchReaction[1].trim();
                        replyText = replyText.replace(reactionRegex, "").trim();
                    }
                    
                    // 2. Intercepta a decisão de apenas enviar Figurinha
                    if (replyText.trim() === "[FIGURINHA_REACAO]") {
                        Logger.info("BochechaEngine.Reaction", "IA decidiu responder apenas com figurinha de risada/reação de meme brasileiro.");
                        const stickersDir = path.join(ROOT_DIR, "lib", "stickers");
                        if (!fs.existsSync(stickersDir)) {
                            fs.mkdirSync(stickersDir, { recursive: true });
                        }

                        const MEME_URLS = [
                            "https://i.imgur.com/8Qe5j6G.png", // Gretchen
                            "https://i.imgur.com/KzXyB6S.png", // Nazaré confusa
                            "https://i.imgur.com/6lB8LzE.png", // Latrell rindo
                            "https://i.imgur.com/B73gGqN.png", // Chapolin sincero
                            "https://i.imgur.com/Z4w2fA4.png", // Gato rindo deboche
                            "https://i.imgur.com/qU3u6g4.png", // Ronaldinho Gaúcho rindo
                            "https://i.imgur.com/gKspSns.png"  // Galvão Bueno
                        ];

                        const randIndex = Math.floor(Math.random() * MEME_URLS.length);
                        const memeUrl = MEME_URLS[randIndex];
                        const stickerPath = path.join(stickersDir, `meme_${randIndex}.webp`);
                        let stickerGenerationError = null;

                        if (!fs.existsSync(stickerPath)) {
                            try {
                                Logger.info("BochechaEngine.Reaction", `Baixando imagem do meme para conversão: ${memeUrl}`);
                                const axios = require('axios');
                                const { Sticker, StickerTypes } = require('wa-sticker-formatter');
                                const response = await axios.get(memeUrl, { responseType: 'arraybuffer' });
                                const sticker = new Sticker(Buffer.from(response.data), {
                                    pack: 'Bochecha IA',
                                    author: 'Corvo System',
                                    type: StickerTypes.FULL,
                                    categories: ['🤩', '🎉'],
                                    quality: 60
                                });
                                const finalSticker = await sticker.toBuffer();
                                fs.writeFileSync(stickerPath, finalSticker);
                                Logger.success("BochechaEngine.Reaction", `Figurinha meme_${randIndex}.webp criada com sucesso.`);
                            } catch (errSticker) {
                                stickerGenerationError = errSticker;
                                const fallbackReply = resolveStickerReactionFallback(errSticker);
                                Logger.warn("BochechaEngine.Reaction.StickerGen", `Falha ao gerar figurinha (${errSticker?.message || errSticker}). Usando fallback textual ${fallbackReply}.`);
                            }
                        }

                        if (fs.existsSync(stickerPath)) {
                            const canProceedSticker = await botRateLimiter.waitUntilCanSend(from, 5000);
                            if (!canProceedSticker) {
                                if (typingInterval) clearInterval(typingInterval);
                                await sock.sendPresenceUpdate('paused', from).catch(() => {});
                                return;
                            }
                            await sock.sendMessage(from, { sticker: fs.readFileSync(stickerPath) }, { quoted: q.msgRef });
                            botRateLimiter.register(from);
                            if (typingInterval) clearInterval(typingInterval);
                            await sock.sendPresenceUpdate('paused', from).catch(() => {});
                            return;
                        }

                        replyText = resolveStickerReactionFallback(stickerGenerationError);
                    }


                    if (reactionEmoji && Math.random() < 0.15) { // Limita para no máximo 15% de chance de reagir para não ficar reagindo toda hora
                        try {
                            const canProceedReact = await botRateLimiter.waitUntilCanSend(from, 5000);
                            if (canProceedReact) {
                                Logger.info("BochechaEngine.Reaction", `Enviando reação de emoji: ${reactionEmoji}`);
                                await sock.sendMessage(from, { react: { text: reactionEmoji, key: q.msgRef.key } }).catch(() => {});
                                botRateLimiter.register(from);
                            }
                        } catch (reactErr) {
                            Logger.error("BochechaEngine.Reaction.React", reactErr);
                        }
                    }

                    this.recentResponses.add(replyText.trim());
                    setTimeout(() => this.recentResponses.delete(replyText.trim()), 60000);

                    // 🎙️ Responde sempre por TEXTO — áudio só é enviado quando a IA usar a skill falar_em_audio explicitamente
                    {
                        // Remove caracteres isoladores unicode ocultos do WhatsApp (\u2068 e \u2069)
                        let cleanedReply = replyText.replace(/[\u2068\u2069]/g, '');

                        
                        // (A assinatura do modelo foi removida a pedido do usuário)

                        // Limpa e formata menções de números incorretas feitas pela IA (ex: @+55 11 99999-9999)
                        cleanedReply = cleanedReply.replace(/@\+?([\d\s()-]+)/g, (match, g1) => {
                            const digits = g1.replace(/[^\d]/g, '');
                            if (digits.length >= 8) {
                                return `@${digits}`;
                            }
                            return match;
                        });

                        // IMPEDE QUE O NÚMERO FIQUE COLADO NO TEXTO (ex: @34008238932083tá vira @34008238932083 tá)
                        // WhatsApp quebra a marcação se não tiver espaço!
                        cleanedReply = cleanedReply.replace(/(@\d+)([a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ])/g, "$1 $2");

                        // Resolução e substituição dinâmica de menções textuais por JIDs reais
                        const resolvedMentions = [];
                        const isPrivateChat = !isGroup;
                        if (isPrivateChat) {
                            cleanedReply = cleanedReply.replace(/@([a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ._-]+)/g, '').trim();
                            cleanedReply = cleanedReply.replace(/\s{2,}/g, ' ');
                        }
                        try {
                            if (isPrivateChat) {
                                Logger.info("MentionResolver", "PV detectado; pulando resolução de menções para evitar marcações no privado.");
                            } else {
                                const mentionsMatches = cleanedReply.match(/@([a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ._-]+)/g) || [];
                                const skipMentionResolution = mentionsMatches.length > 12 || (cleanedReply.length > 500 && mentionsMatches.length > 6);
                                if (skipMentionResolution) {
                                    Logger.warn("MentionResolver", `Grande lista de ${mentionsMatches.length} menções detectada; pulando resolução automática para evitar marcação LID incorreta.`);
                                } else if (mentionsMatches.length > 0) {
                                const metadata = BochechaEngine.storeRef?.chats?.get(from) || (isGroup ? await sock.groupMetadata(from).catch(() => null) : null);
                                const participants = metadata?.participants || [];
                                const storeContacts = BochechaEngine.storeRef?.contacts || {};

                                // Função auxiliar para normalização de acentos, pontuações e caixa baixa
                                const normalize = (str) => {
                                    if (!str) return "";
                                    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                                };

                                for (const mentionMatch of mentionsMatches) {
                                    const rawName = mentionMatch.substring(1);
                                    const nameToSearch = normalize(rawName);
                                    
                                    if (!/^\d+$/.test(nameToSearch) && nameToSearch.length > 0) { // Apenas se não for um número de telefone puro
                                         let foundJid = null;
                                         
                                         // 0. Compara com o interlocutor atual
                                         if (normalize(pushname).includes(nameToSearch) || nameToSearch === normalize(sender)) {
                                             foundJid = rawSender;
                                         }
                                         
                                         // 1. Tenta buscar no banco de atividade recente (chat_activity.json) que tem pushnames reais recentes
                                         if (!foundJid) {
                                             try {
                                                 const dbPath = path.join(__dirname, 'learnings', 'chat_activity.json');
                                                 if (fs.existsSync(dbPath)) {
                                                     const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                                                     const entries = db[from] || [];
                                                     const matchedEntry = entries.find(e => {
                                                         const normPush = normalize(e.pushname);
                                                         const normUser = normalize(e.user?.split('@')[0]);
                                                         return normPush.includes(nameToSearch) || normUser === nameToSearch;
                                                     });
                                                     if (matchedEntry) {
                                                         foundJid = matchedEntry.user;
                                                     }
                                                 }
                                             } catch {}
                                         }

                                         // 2. Se não achou, busca na lista de participantes do grupo
                                         if (!foundJid && isGroup) {
                                             for (const p of participants) {
                                                 const contact = storeContacts[p.id] || {};
                                                 const pName = normalize(contact.name || contact.notify || "");
                                                 const pNum = p.id.split('@')[0].split(':')[0];
                                                 
                                                 if (pName.includes(nameToSearch) || pNum === nameToSearch) {
                                                     foundJid = p.id;
                                                     break;
                                                 }
                                             }
                                         }

                                         // 3. Se não achou e for o Marcos/Owner, busca na lista de DEFAULT_OWNERS
                                         if (!foundJid) {
                                             for (const owner of DEFAULT_OWNERS) {
                                                 const ownerJid = owner + '@s.whatsapp.net';
                                                 const contact = storeContacts[ownerJid] || {};
                                                 const oName = normalize(contact.name || contact.notify || "marcos");
                                                 if (oName.includes(nameToSearch) || owner === nameToSearch) {
                                                     foundJid = ownerJid;
                                                     break;
                                                 }
                                             }
                                         }

                                         if (foundJid) {
                                              let effectiveJid = foundJid;
                                              if (effectiveJid.endsWith('@lid')) {
                                                  const mapped = lidMappings[effectiveJid] || (storeContacts[effectiveJid] && storeContacts[effectiveJid].phoneNumber ? `${storeContacts[effectiveJid].phoneNumber}@s.whatsapp.net` : null);
                                                  if (mapped) {
                                                      effectiveJid = mapped;
                                                  }
                                              }

                                              const contact = storeContacts[effectiveJid] || storeContacts[foundJid] || {};
                                              const displayName = contact.name || contact.notify || rawName;
                                              const num = effectiveJid.split('@')[0].split(':')[0];

                                              if (displayName && displayName.toLowerCase() !== num.toLowerCase()) {
                                                  cleanedReply = cleanedReply.replace(mentionMatch, `@${displayName}`);
                                              } else {
                                                  cleanedReply = cleanedReply.replace(mentionMatch, `@${num}`);
                                              }

                                              resolvedMentions.push(effectiveJid);
                                              Logger.success("MentionResolver", `Resolvida menção de ${effectiveJid.endsWith('@lid') ? 'LID' : 'Telefone'} [${mentionMatch}] -> [@${num}] (${effectiveJid})`);
                                          } else {
                                              cleanedReply = cleanedReply.replace(mentionMatch, rawName);
                                         }
                                     }
                                }
                                }
                            }
                        } catch (resolverErr) {
                            Logger.error("MentionResolver.Critical", resolverErr);
                        }

                        // Validação avançada e filtragem de menções numéricas
                        try {
                            const metadata = BochechaEngine.storeRef?.chats?.get(from) || (isGroup ? await sock.groupMetadata(from).catch(() => null) : null);
                            const participants = metadata?.participants || [];
                            const storeContacts = BochechaEngine.storeRef?.contacts || {};

                            cleanedReply = cleanedReply.replace(/@(\d+)/g, (match, digits) => {
                                 const clean = digits.trim();
                                 const isAlreadyResolved = resolvedMentions.some(jid => jid.split('@')[0].split(':')[0] === clean);
                                 const foundPart = participants.find(p => p.id.split('@')[0].split(':')[0] === clean);
                                 const isOwnerNum = DEFAULT_OWNERS.includes(clean);
                                 const isSenderNum = sender === clean || rawSender.split('@')[0].split(':')[0] === clean;
                                 const isFromNum = from.split('@')[0].split(':')[0] === clean;
                                 
                                 if (isAlreadyResolved || foundPart || isOwnerNum || isSenderNum || isFromNum) {
                                     let matchedJid = isAlreadyResolved 
                                         ? resolvedMentions.find(jid => jid.split('@')[0].split(':')[0] === clean)
                                         : (foundPart ? foundPart.id : (isSenderNum ? rawSender : (isFromNum ? from : null)));
                                     if (matchedJid && matchedJid.endsWith('@lid')) {
                                         const mapped = lidMappings[matchedJid];
                                         if (mapped) {
                                             matchedJid = mapped;
                                         } else {
                                             const contact = storeContacts[matchedJid] || {};
                                             if (contact.phoneNumber) {
                                                 matchedJid = `${contact.phoneNumber}@s.whatsapp.net`;
                                             }
                                         }
                                     }
                                     if (matchedJid && !resolvedMentions.includes(matchedJid)) {
                                         resolvedMentions.push(matchedJid);
                                     }
                                     return `@${clean}`;
                                 } else {
                                     // Não marcar automaticamente números desconhecidos para evitar confusão.
                                     return clean;
                                 }
                             });
                        } catch (err) {
                            Logger.error("MentionResolver.NumericValidation", err);
                        }

                        const mentions = resolvedMentions.filter(jid => jid && !jid.includes('7100252033253'));
                        const outgoingMentions = mentions.map(jid => {
                            if (isGroup && jid.endsWith('@lid')) {
                                const mapped = lidMappings[jid] || (BochechaEngine.storeRef?.contacts?.[jid] && BochechaEngine.storeRef.contacts[jid].phoneNumber ? `${BochechaEngine.storeRef.contacts[jid].phoneNumber}@s.whatsapp.net` : null);
                                return mapped || null;
                            }
                            return jid;
                        }).filter(Boolean);

                        cleanedReply = cleanedReply.trim();
                        if (!cleanedReply) {
                            cleanedReply = "Deu um pequeno branco na rede aqui, parceiro! Mas já tô de volta na atividade. 😎";
                        }

                        const msgOptions = isGroup ? { quoted: q.msgRef } : {};
                        
                        const canProceedText = await botRateLimiter.waitUntilCanSend(from, 5000);
                        if (!canProceedText) {
                            if (typingInterval) clearInterval(typingInterval);
                            await sock.sendPresenceUpdate('paused', from).catch(() => {});
                            return;
                        }

                        // Simula digitação humana proporcional ao tamanho do texto
                        await humanDelay(cleanedReply);

                        // Decisão de enviar por áudio: prioriza quando o usuário enviou áudio ou por chance configurável
                        try {
                            const voiceChance = (settings && settings.voicePreference && typeof settings.voicePreference.chance === 'number') ? settings.voicePreference.chance : 0.5;
                            let voicePreset = (settings && settings.voicePreference && settings.voicePreference.preset) ? settings.voicePreference.preset : 'duarte';
                            // A/B testing: se habilitado, escolhe aleatoriamente entre variantes e registra métricas
                            try {
                                if (settings && settings.voicePreference && settings.voicePreference.abTest) {
                                    const variants = (settings.voicePreference.abVariants && Array.isArray(settings.voicePreference.abVariants) && settings.voicePreference.abVariants.length > 0)
                                        ? settings.voicePreference.abVariants
                                        : ['francisca', 'duarte'];
                                    const chosen = variants[Math.floor(Math.random() * variants.length)];
                                    voicePreset = chosen;
                                    // registra métrica simples local
                                    try {
                                        const abFile = path.join(LEARNINGS_DIR, 'voice_ab_test.json');
                                        let stats = {};
                                        if (fs.existsSync(abFile)) {
                                            try { stats = JSON.parse(fs.readFileSync(abFile, 'utf8')); } catch (e) { stats = {}; }
                                        }
                                        stats[chosen] = (stats[chosen] || 0) + 1;
                                        fs.writeFileSync(abFile, JSON.stringify(stats, null, 2));
                                    } catch (logErr) {
                                        Logger.error('VoiceABTest.Log', logErr);
                                    }
                                    Logger.info('VoiceABTest', `Preset A/B selecionado: ${chosen}`);
                                }
                            } catch (abErr) {
                                Logger.error('VoiceABTest.Decision', abErr);
                            }
                            const avoidAudio = cleanedReply.length > 1000 || cleanedReply.split('\n').length > 8 || cleanedReply.includes('```') || cleanedReply.includes('http');
                            const preferAudio = shouldPreferAudioReply(q.isAudioQuery, voiceChance, cleanedReply) && !avoidAudio;

                            if (preferAudio) {
                                const canProceedAudio = await botRateLimiter.waitUntilCanSend(from, 7000);
                                if (canProceedAudio) {
                                    const sent = await VoiceSynthesizer.speak(sock, from, cleanedReply, q.msgRef, voicePreset).catch(err => {
                                        Logger.error('VoiceSynthesizer.SendFallback', err);
                                        return false;
                                    });
                                    if (sent) {
                                        botRateLimiter.register(from);
                                        if (typingInterval) clearInterval(typingInterval);
                                        await sock.sendPresenceUpdate('paused', from).catch(() => {});
                                        return; // áudio enviado com sucesso — encerra fluxo
                                    }
                                }
                            }
                        } catch (audioDecisionErr) {
                            Logger.error('BochechaEngine.AudioDecision', audioDecisionErr);
                        }

                        const finalPayload = { text: cleanedReply + '\u200B' };
                        if (isGroup && outgoingMentions.length > 0) {
                            finalPayload.mentions = outgoingMentions;
                        }
                        await sock.sendMessage(from, finalPayload, msgOptions);
                        botRateLimiter.register(from);
                    }

                    if (typingInterval) clearInterval(typingInterval);
                    await sock.sendPresenceUpdate('paused', from).catch(() => {});

                } catch (err) {
                    if (typingInterval) clearInterval(typingInterval);
                    await sock.sendPresenceUpdate('paused', from).catch(() => {});
                    Logger.error(`BochechaEngine.DebounceQueue(${from})`, err);
                    await this._fallback(sock, from, aggregatedPrompt, isOwner, q.pushname, q.msgRef);
                }
            }, this.debounceMs);

        } catch (e) {
            Logger.error("BochechaEngine.handleMessage", e);
        }
    }

    /**
     * Executa a chamada avançada para o Google Gemini.
     */
    async _callAI({ chatId, pushname, sender, prompt, isOwner, sock, messageRef }) {
        const warns = await storage.getWarnings(chatId, sender);
        
        let logGroupName = "Privado";
        if (chatId.endsWith('@g.us') && sock) {
            try {
                const metadata = BochechaEngine.storeRef?.chats?.get(chatId) || await sock.groupMetadata(chatId);
                logGroupName = metadata.subject || metadata.name || "Grupo";
            } catch {}
        }
        
        // Ativação da Memória de Longo Prazo (LTM): Extrai e grava fatos novos em background
        ltm.extractAndStoreFacts(chatId, sender, prompt, isOwner).catch(() => {});
        
        let level = 1;
        let xp = 0;
        try {
            if (fs.existsSync(RANKING_FILE)) {
                const db = JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8'));
                const cleanNum = sender.split('@')[0];
                if (db[chatId] && db[chatId][cleanNum]) {
                    level = db[chatId][cleanNum].level || 1;
                    xp = db[chatId][cleanNum].xp || 0;
                }
            }
        } catch {}

        const sys = await composer.build(chatId, isOwner, { pushname, level, xp, warns, userId: sender });
        const rawHistory = await sessionManager.getHistory(chatId);
        
        // Garante que rawHistory é sempre um array (Firebase pode retornar objeto ou null)
        const safeHistory = Array.isArray(rawHistory) ? rawHistory : [];
        
        // Remove a última mensagem de usuário se ela existir no final do histórico E pertencer
        // ao sender atual. Isso evita remover mensagens de outros membros do grupo por engano,
        // o que causava alucinação (a IA "esquecia" o contexto de outros membros).
        const historyToUse = [...safeHistory];
        const cleanSenderNum = sender ? sender.split('@')[0] : '';
        if (historyToUse.length > 0) {
            const lastMsg = historyToUse[historyToUse.length - 1];
            if (lastMsg.role === 'user' && cleanSenderNum && lastMsg.content && lastMsg.content.includes(cleanSenderNum)) {
                historyToUse.pop();
            }
        }

        const history = historyToUse.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const tools = registry.getGeminiTools();
        
        // Determina a hierarquia do remetente no grupo
        let hierarchy = "Membro Comum (👤 Plebe)";
        if (isOwner) {
            hierarchy = "Criador (👑 Dono Absoluto)";
        } else {
            let isUserAdmin = false;
            if (chatId.endsWith('@g.us') && sock) {
                try {
                    const metadata = BochechaEngine.storeRef?.chats?.get(chatId) || await sock.groupMetadata(chatId);
                    const participants = metadata.participants || [];
                    const senderPart = participants.find(p => p.id.split('@')[0] === sender.split('@')[0]);
                    isUserAdmin = senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin';
                } catch {}
            }
            if (isUserAdmin) {
                hierarchy = "Administrador (🛡️ Privilegiado)";
            }
        }

        const timeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
        const cleanSender = sender.split('@')[0];
        const isLid = sender && sender.includes('lid');
        
        // Estrutura de última geração para formatação da mensagem do interlocutor
        const formatted = 
            `=========================================\n` +
            `[💬 CHAT: "${logGroupName}"]\n` +
            `[👤 USUÁRIO: "${pushname}" | 📞 CONTATO: ${isLid ? 'Conta Business LID' : '@' + cleanSender} | 🕒 HORA: ${timeStr} | 🏷️ HIERARQUIA: ${hierarchy}]\n` +
            `-----------------------------------------\n` +
            `MENSAGEM: ${prompt}\n` +
            `=========================================`;

        const parts = [formatted];

        // Processamento Multimodal de Mídia Universal (Imagens, Vídeos, Documentos/PDFs, Áudios/Gifs e Texto Citado)
        try {
            const getMediaDetails = (msgObj) => {
                if (!msgObj) return null;
                const type = Object.keys(msgObj)[0] === 'senderKeyDistributionMessage' 
                    ? Object.keys(msgObj)[1] 
                    : Object.keys(msgObj)[0];
                if (!type) return null;
                
                const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
                if (mediaTypes.includes(type)) {
                    return { type, msg: msgObj[type] };
                }
                return null;
            };

            const safeMessage = messageRef?.message || {};
            const msgType = Object.keys(safeMessage)[0] === 'senderKeyDistributionMessage' 
                ? Object.keys(safeMessage)[1] 
                : Object.keys(safeMessage)[0];

            const contextInfo = safeMessage[msgType]?.contextInfo || safeMessage.extendedTextMessage?.contextInfo;

            // 1. Verifica mídia na mensagem principal ou na mensagem citada/marcada (quoted)
            let media = getMediaDetails(safeMessage);
            if (!media && contextInfo && contextInfo.quotedMessage) {
                media = getMediaDetails(contextInfo.quotedMessage);
            }

            if (media) {
                Logger.info("Multimodal", `Extraindo mídia do tipo [${media.type}]`);
                const stream = await downloadContentFromMessage(
                    media.msg, 
                    media.type.replace('Message', '') // converts 'imageMessage' -> 'image', etc.
                );
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                let mimeType = media.msg.mimetype || 'application/octet-stream';
                
                // Mapeia tipos comuns para o Gemini
                if (media.type === 'imageMessage') mimeType = 'image/jpeg';
                else if (media.type === 'videoMessage') mimeType = 'video/mp4';
                else if (media.type === 'stickerMessage') mimeType = 'image/webp';
                else if (media.type === 'audioMessage') mimeType = 'audio/ogg; codecs=opus';

                parts.push({
                    inlineData: {
                        data: buffer.toString('base64'),
                        mimeType: mimeType
                    }
                });
                
                Logger.success("Multimodal", `Mídia [${media.type}] (${mimeType}) extraída com sucesso para o Gemini.`);
            }

            // 2. Se a mensagem citada/marcada for TEXTO simples, nós injetamos o texto como contexto para a IA ler!
            if (contextInfo && contextInfo.quotedMessage) {
                const quotedMsg = contextInfo.quotedMessage;
                const quotedText = quotedMsg.conversation || 
                                   quotedMsg.extendedTextMessage?.text || 
                                   quotedMsg.imageMessage?.caption || 
                                   quotedMsg.videoMessage?.caption || 
                                   "";
                
                if (quotedText) {
                    const quotedSenderJid = normalizeJid(contextInfo.participant || "");
                    const quotedSenderName = quotedSenderJid.split('@')[0];
                    
                    parts.unshift(`[Mensagem Citada/Marcada de @${quotedSenderName}]: "${quotedText}"\n\n`);
                    Logger.info("Multimodal", `Injetando texto citado de @${quotedSenderName} no prompt.`);
                }
            }
        } catch (mediaErr) {
            Logger.error("BochechaEngine.Multimodal", mediaErr);
        }

        const input = parts.length > 1 ? parts : formatted;
        const promptText = typeof input === 'string'
            ? input
            : Array.isArray(input)
                ? input.map(item => typeof item === 'string' ? item : (item.text || '')).join(' ')
                : '';
        const isGroup = typeof chatId === 'string' && chatId.endsWith('@g.us');
        const safetyCheck = classifyConversationSafety(promptText, { isGroup, isOwner });
        if (safetyCheck.blocked) {
            Logger.warn('SafetyGate', `Mensagem bloqueada por segurança: ${safetyCheck.reason}`);
            const blockedReply = safetyCheck.fallback || 'Não vou entrar nesse tema aqui.';
            await sessionManager.addMessage(chatId, 'assistant', blockedReply);
            return { output: blockedReply, modelName: 'safety-gate', wasToolExecuted: false, lastExecutedTool: null };
        }
        
        let chat, response, modelName;
        const hasMedia = parts.some(p => p && typeof p === 'object' && p.inlineData);
        const isSimpleConversation = apiKeyManager.hasClaudeKeys() && !hasMedia;

        // 🟢 Indica visualmente para os usuários que a IA está "Digitando..."
        try { await sock.sendPresenceUpdate('composing', chatId); } catch(e){}

        try {
            if (isSimpleConversation) {
                Logger.info("BochechaEngine", `[Grupo/Chat: ${logGroupName}] Roteando conversa de texto simples para a IA.`);
                const claudeRes = await keyRotator.executeClaudeWithRotation(history, input, tools, sys);
                chat = {
                    getHistory: () => {
                        const hist = [...history];
                        hist.push({ role: "user", parts: [{ text: typeof input === 'string' ? input : String(input) }] });
                        hist.push({ role: "model", parts: [{ text: claudeRes.response.response.text() }] });
                        return hist;
                    }
                };
                response = claudeRes.response;
                modelName = claudeRes.modelName;
            } else {
                Logger.info("BochechaEngine", `[Grupo/Chat: ${logGroupName}] Roteando requisição complexa/multimodal para a IA.`);
                const geminiRes = await keyRotator.executeWithRotation(
                    history,
                    input,
                    tools,
                    sys,
                    true // isUserRequest = true
                );
                chat = geminiRes.chat;
                response = geminiRes.response;
                modelName = geminiRes.modelName;
            }
        } catch (apiErr) {
            Logger.error("BochechaEngine.AI", `Falha total nas APIs de IA: ${apiErr.message}. Acionando resposta offline.`);
            const offlineText = keyRotator.generateOfflineResponse(input);
            
            const responseMock = {
                response: {
                    text: () => offlineText,
                    functionCalls: () => undefined
                }
            };
            const chatMock = {
                getHistory: () => {
                    const hist = [...history];
                    hist.push({ role: "user", parts: [{ text: typeof input === 'string' ? input : String(input) }] });
                    hist.push({ role: "model", parts: [{ text: offlineText }] });
                    return hist;
                }
            };
            chat = chatMock;
            response = responseMock;
            modelName = "offline-fallback-mock";
        }

        let finalResponse = response.response;
        const functionCalls = finalResponse.functionCalls && finalResponse.functionCalls();
        let wasToolExecuted = false;
        let lastExecutedTool = null;

        // Tratamento de Chamada de Ferramentas / Skills
        if (functionCalls && functionCalls.length > 0) {
            const replies = [];
            for (const call of functionCalls) {
                const fn = call.name;
                const isGroup = chatId.endsWith("@g.us");
                const ctx = { chatId, sock, from: chatId, message: messageRef, isOwner, isGroup, sender, pushname };
                const res = await registry.execute(fn, call.args, ctx);

                wasToolExecuted = true;
                lastExecutedTool = fn;

                replies.push({
                    functionResponse: {
                        name: fn,
                        response: { result: String(res).substring(0, 4000) }
                    }
                });
            }

            Logger.info("KeyRotationEngine", "Submetendo resposta das ferramentas de volta ao Gemini...");
            try {
                const secondary = await keyRotator.executeWithRotation(
                    chat.getHistory(),
                    replies,
                    tools,
                    sys,
                    true // isUserRequest = true
                );
                finalResponse = secondary.response.response;
                modelName = secondary.modelName;
            } catch (secErr) {
                Logger.error("BochechaEngine.AI", `Falha na submissão de ferramenta de volta à IA: ${secErr.message}. Usando fallback local para a ferramenta.`);
                finalResponse = {
                    text: () => "",
                    functionCalls: () => undefined
                };
                modelName = "offline-fallback-tool";
            }
        }

        let output = finalResponse.text() ? finalResponse.text().trim() : "";
        if (output) {
            // Remove markdown de conversas casuais: bold, itálico, headers, bullets
            output = output
                .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold** → bold
                .replace(/\*(.*?)\*/g, '$1')        // *italic* → italic
                .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // _italic_ → italic
                .replace(/^#{1,6}\s+/gm, '')        // # header → sem header
                .replace(/^[-*+]\s+/gm, '')         // bullet lists → sem bullet
                .replace(/^\d+\.\s+/gm, '')         // numbered lists → sem número
                .replace(/`{1,3}([^`]*)`{1,3}/g, '$1'); // `code` → sem backtick

            output = output
                .split('\n')
                .map(line => line.replace(/={5,}/g, '').replace(/-{5,}/g, '').trim())
                .filter(line => {
                    const cleanLine = line.toLowerCase();
                    if (!cleanLine) return false;
                    if (cleanLine.includes('[💬 chat:') || 
                        cleanLine.includes('[👤 usuário:') || 
                        cleanLine.includes('[👤 usuario:') || 
                        cleanLine.startsWith('mensagem:') ||
                        /^[=\-\s]+$/.test(line)) {
                        return false;
                    }
                    return true;
                })
                .join(' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }

        // Pós-processamento: remover perguntas desnecessárias quando o usuário já forneceu contexto
        try {
            const rawHist = Array.isArray(rawHistory) ? rawHistory : [];
            const lastUserEntry = rawHist.slice().reverse().find(m => m && m.role === 'user' || (m && m.user));
            const lastUserText = lastUserEntry ? (lastUserEntry.content || lastUserEntry.text || lastUserEntry) : '';
            
            // Remove perguntas típicas de suporte/assistente no final de qualquer resposta
            if (output) {
                const assistantQuestionsPattern = /\s*\b(como posso (te )?ajudar( hoje)?\??|em que posso ajudar\??|mais alguma coisa\??|algo mais\??|o que (você|vc) (gostaria de|quer) fazer\??|como posso ser útil\??|o que manda( hoje)?\??|o que vamos (fazer|aprontar) hoje\??|o que quer que eu faça\??|quer ajuda com (mais )?algo\??|tudo bem com (você|vc)\??)\s*$/i;
                output = output.replace(assistantQuestionsPattern, '').trim();
            }

            const likelyClear = typeof lastUserText === 'string' && lastUserText.trim().length > 40 && !lastUserText.trim().endsWith('?');
            if (likelyClear && output && output.includes('?')) {
                // remove sentenças interrogativas do final da resposta
                const partsSent = output.split(/(?<=\.|!|\?)\s+/);
                const filtered = partsSent.filter(s => !s.trim().endsWith('?'));
                const newOut = filtered.join(' ').trim();
                if (newOut) {
                    Logger.info('PostProcess', 'Removidas perguntas supérfluas da resposta do modelo.');
                    output = newOut;
                }
            }
        } catch (ppErr) {
            Logger.error('PostProcess.ContextCleanup', ppErr);
        }

        try {
            output = sanitizeAssistantOutput(output, { isGroup, isOwner });
        } catch (guardErr) {
            Logger.error('SafetyGate.Output', guardErr);
        }

        try {
            output = enforceAntiHallucinationGuard(output, input, history, { isGroup, wasToolExecuted, lastExecutedTool });
        } catch (guardErr) {
            Logger.error('AntiHallucination.Guard', guardErr);
        }

        if (!output) {
            const fallbackText = keyRotator.generateOfflineResponse(input);
            output = fallbackText;
            Logger.warn("BochechaEngine.AI", "IA indisponível ou não retornou conteúdo; usando fallback textual local.");
        }

        if (output) {
            console.log(chalk.cyan(`[🤖 BOCHECHA][${logGroupName}] ${output}`));
        }

        // Armazena diálogo na memória da sessão (a mensagem do usuário já foi registrada no handleMessage)
        await sessionManager.addMessage(chatId, 'assistant', output);

        return { output, modelName, wasToolExecuted, lastExecutedTool };
    }

    /**
     * Canal contingente caso o motor principal estoure os limites globais.
     */
    async _fallback(sock, chatId, prompt, isOwner, pushname, messageRef) {
        try {
            Logger.warn("Engine.Fallback", `IA principal indisponível. Alerta registrado apenas no console (aviso no PV desativado).`);
        } catch (e) {
            Logger.error("Engine.Critical", e);
        }
    }
}

// Instanciar orquestrador geral do bot
const bochecha = new BochechaEngine();
bochecha.boot().catch(e => Logger.error("BochechaEngineBoot", e));

// ══════════════════════════════════════════════════════════════════════════
// 12. RETROCOMPATIBILIDADE E EXPORTAÇÃO
// ══════════════════════════════════════════════════════════════════════════

/**
 * Ponto de entrada compatível exportado para index.js
 */
const sansekaiHandler = async (upsert, sock, store, message) => {
    await bochecha.handleMessage(upsert, sock, store, message);
};

// Estende o export para incluir o binder dinâmico dos listeners do socket
sansekaiHandler.bind = (sock, store) => {
    bochecha.bind(sock, store);
};
sansekaiHandler.storage = storage;
sansekaiHandler.sessionManager = sessionManager;
sansekaiHandler.bochecha = bochecha;

module.exports = sansekaiHandler;
