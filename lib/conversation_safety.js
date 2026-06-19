const ACCENTED = /[áàâãäéèêëíìîïóòôõöúùûüç]/i;

const SEXUAL_KEYWORDS = [
    'putaria', 'sexo', 'sexual', 'porn', 'pornografia', 'hentai', 'nudez', 'nu', 'gozar', 'masturbar',
    'masturbacao', 'masturbação', 'buceta', 'pica', 'pau', 'pinto', 'vagabunda', 'vagabundo',
    'fetiche', 'oral', 'anal', 'desnudo', 'naked', 'xxx', 'xvideos', 'redtube', 'adulto', 'erotico', 'erótico'
];

const ADULT_COMMANDS = [
    '/baixar_adulto', 'baixar adulto', 'video adulto', 'vídeo adulto', 'porno', 'pornô', 'porno aleatorio', 'pornô aleatório'
];

function normalizeConversationText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s/._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function classifyConversationSafety(text, options = {}) {
    const normalized = normalizeConversationText(text);
    if (!normalized) {
        return { blocked: false, reason: null, fallback: null };
    }

    const isGroup = !!options.isGroup;
    const isOwner = !!options.isOwner;

    const hasSexualKeyword = SEXUAL_KEYWORDS.some(keyword => normalized.includes(keyword));
    const hasAdultCommand = ADULT_COMMANDS.some(keyword => normalized.includes(keyword));
    const isAdultRequest = hasAdultCommand || (hasSexualKeyword && /\b(quero|quero ver|me manda|manda|quero um|quero uma|quero esse|quero essa|quero ver|quero assistir)\b/.test(normalized));

    if (isAdultRequest && !(isOwner && isGroup)) {
        return {
            blocked: true,
            reason: 'sexual-content',
            fallback: 'Não vou entrar nesse tema aqui. Posso ajudar com algo mais leve e respeitoso.'
        };
    }

    if (isGroup && /\b((putaria|sexo|porno|pornô|hentai|buceta|pica|pau|pinto|gozar|masturbar))\b/.test(normalized)) {
        return {
            blocked: true,
            reason: 'sexual-content',
            fallback: 'Eu prefiro manter a conversa em um tom seguro e respeitoso.'
        };
    }

    return { blocked: false, reason: null, fallback: null };
}

function isGenericGroupChatter(output, options = {}) {
    if (!options.isGroup || !output || typeof output !== 'string') return false;
    const normalized = normalizeConversationText(output);
    if (!normalized) return false;

    const shortText = normalized.split(' ').length <= 10;
    const genericPatterns = [
        /^(e ai|e ai|e ai tudo certo|e aí|e aí tudo certo|opa|fala ai|fala aí|tá suave|ta suave|qual é a boa|qual e a boa|o que manda|o que você quer|o que quer|tô ligado|to ligado|tô na escuta|to na escuta|tá tudo certo|ta tudo certo|que foi|qual foi|como vai|tudo certo)$/i,
        /^(e ai|e aí|opa|fala ai|fala aí|qual é a boa|qual e a boa|o que manda|o que você quer|tô ligado|to ligado|tá suave|ta suave|que foi|qual foi)/i
    ];

    return shortText && genericPatterns.some(pattern => pattern.test(normalized));
}

function sanitizeAssistantOutput(output, options = {}) {
    if (!output || typeof output !== 'string') return output;
    const evaluation = classifyConversationSafety(output, options);
    if (evaluation.blocked) {
        return evaluation.fallback;
    }

    if (isGenericGroupChatter(output, options)) {
        return '';
    }

    return output;
}

module.exports = {
    classifyConversationSafety,
    sanitizeAssistantOutput,
    normalizeConversationText
};
