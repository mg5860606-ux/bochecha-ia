function hasValidAudioBuffer(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length > 512;
}

function shouldPreferAudioReply(isAudioQuery, voiceChance, text) {
    if (!text || typeof text !== 'string') return false;
    if (isAudioQuery) return text.length <= 800 && text.split('\n').length <= 8 && !text.includes('```') && !text.includes('http');

    return false;
}

module.exports = {
    hasValidAudioBuffer,
    shouldPreferAudioReply
};
