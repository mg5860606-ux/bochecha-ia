function buildOfflineFallbackResponse(prompt) {
    const clarified = typeof prompt === 'string' ? prompt : String(prompt || '');
    const shortPrompt = clarified.replace(/\s+/g, ' ').trim();
    const lowerPrompt = shortPrompt.toLowerCase();

    if (!shortPrompt) {
        return 'Não consegui processar isso agora. Tente novamente em instantes.';
    }

    if (/\b(oi|olá|ola|e aí|eai|tudo bem|como vai|bom dia|boa tarde|boa noite)\b/.test(lowerPrompt)) {
        return 'Tudo bem. Se quiser, manda o comando ou a dúvida.';
    }

    if (/\b(tocar|reproduzir|play|coloca|coloque|abrir|executar|manda|envia|pv|privado)\b/.test(lowerPrompt)) {
        return 'Não consegui processar isso agora. Tente novamente em instantes.';
    }

    if (/\b(cade|cadê|onde|aonde|quando|qual|como|por que|porque|quem)\b/.test(lowerPrompt)) {
        return 'Não tenho base suficiente agora. Me manda mais detalhe e eu tento ajudar.';
    }

    return 'Não consegui processar isso agora. Tente novamente em instantes.';
}

module.exports = {
    buildOfflineFallbackResponse
};
