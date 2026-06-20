function hasValidAudioBuffer(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length > 512;
}

function shouldPreferAudioReply(isAudioQuery, voiceChance, text) {
    if (!text || typeof text !== 'string') return false;

    const isSuitableForAudio = text.length <= 800 && text.split('\n').length <= 8 && !text.includes('```') && !text.includes('http');
    if (!isSuitableForAudio) return false;

    if (isAudioQuery) return true;

    // Spontaneous voice reply based on voiceChance
    if (typeof voiceChance === 'number' && Math.random() < voiceChance) {
        return true;
    }

    return false;
}

module.exports = {
    hasValidAudioBuffer,
    shouldPreferAudioReply
};
