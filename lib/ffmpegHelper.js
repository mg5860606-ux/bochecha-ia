const fs = require('fs');

/**
 * Detecta se o ambiente atual é o Termux ou o sistema Android.
 * @returns {boolean}
 */
const isAndroidTermux = () => {
    return (process.env.PREFIX && process.env.PREFIX.includes("com.termux")) || process.platform === "android";
};

/**
 * Retorna o caminho apropriado para o FFmpeg.
 * No Termux, usa a instalação global do sistema ('ffmpeg').
 * Em outros sistemas, tenta usar a biblioteca 'ffmpeg-static' se disponível.
 * @returns {string}
 */
const getFFmpegPath = () => {
    if (isAndroidTermux()) {
        return "ffmpeg";
    }
    try {
        const staticFfmpeg = require('ffmpeg-static');
        if (staticFfmpeg && fs.existsSync(staticFfmpeg)) {
            return staticFfmpeg;
        }
    } catch (e) {}
    return "ffmpeg";
};

module.exports = {
    isAndroidTermux,
    getFFmpegPath
};
