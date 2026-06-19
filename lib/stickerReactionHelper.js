function resolveStickerReactionFallback(err) {
    const status = err?.response?.status;
    const message = String(err?.message || '').toLowerCase();

    if (status === 429 || message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
        return '😂';
    }

    return '😂';
}

module.exports = {
    resolveStickerReactionFallback
};
