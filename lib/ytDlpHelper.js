const fs = require("fs");
const path = require("path");
const https = require("https");
const { exec } = require("child_process");

const ROOT_DIR = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT_DIR, "lib");
const YT_DLP_PATH = path.join(LIB_DIR, "yt-dlp.exe");
const MAX_VIDEO_DURATION_SECONDS = 240;
const VIDEO_DOWNLOAD_TIMEOUT_MS = 300000;

/**
 * Helper para gerenciamento e execução do yt-dlp (Universal Media Downloader)
 */
class YtDlpHelper {
    /**
     * Garante que o yt-dlp.exe está disponível localmente.
     * Se não estiver, realiza o download automático do repositório oficial do GitHub.
     */
    static async ensureBinary() {
        if (fs.existsSync(YT_DLP_PATH)) {
            return YT_DLP_PATH;
        }

        console.log("[YtDlpHelper] yt-dlp.exe não encontrado na pasta lib. Iniciando download...");
        
        // Garante a existência do diretório lib
        if (!fs.existsSync(LIB_DIR)) {
            fs.mkdirSync(LIB_DIR, { recursive: true });
        }

        const downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(YT_DLP_PATH);
            
            const request = (url) => {
                https.get(url, (response) => {
                    // Trata redirecionamentos do GitHub Releases
                    if (response.statusCode === 301 || response.statusCode === 302) {
                        request(response.headers.location);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Falha ao baixar yt-dlp. Código HTTP: ${response.statusCode}`));
                        return;
                    }

                    response.pipe(file);

                    file.on("finish", () => {
                        file.close();
                        console.log("[YtDlpHelper] Download do yt-dlp.exe concluído com sucesso.");
                        resolve(YT_DLP_PATH);
                    });
                }).on("error", (err) => {
                    fs.unlink(YT_DLP_PATH, () => {});
                    reject(err);
                });
            };

            request(downloadUrl);
        });
    }

    /**
     * Baixa um vídeo compactado a partir de uma URL.
     * @param {string} url - URL do vídeo de qualquer site suportado.
     * @param {string} targetPath - Caminho onde o arquivo MP4 temporário será salvo.
     * @returns {Promise<string>} Caminho do arquivo baixado.
     */
    static async downloadVideo(url, targetPath) {
        await this.ensureBinary();
        
        // Formato: Prioriza mp4 compactado até 360p de altura para agilizar download e caber no WhatsApp (limite ~16-64MB)
        // Se não conseguir, baixa o pior vídeo disponível (mas compatível)
        const formatOpt = "worst/mp4";
        const maxDurationArg = `--max-duration ${MAX_VIDEO_DURATION_SECONDS}`;

        return new Promise((resolve, reject) => {
            const command = `"${YT_DLP_PATH}" ${maxDurationArg} -f "${formatOpt}" -o "${targetPath}" "${url}"`;
            console.log(`[YtDlpHelper] Executando download de vídeo (máx. ${MAX_VIDEO_DURATION_SECONDS}s): ${command}`);

            exec(command, { timeout: VIDEO_DOWNLOAD_TIMEOUT_MS }, (error, stdout, stderr) => {
                if (error) {
                    console.error("[YtDlpHelper] Erro no download do vídeo:", error);
                    reject(new Error(`Erro do yt-dlp: ${error.message}`));
                    return;
                }
                resolve(targetPath);
            });
        });
    }

    /**
     * Baixa apenas o áudio (MP3) a partir de uma URL.
     * @param {string} url - URL do vídeo/áudio do YouTube ou qualquer outro site.
     * @param {string} targetPath - Caminho onde o MP3 será salvo.
     * @returns {Promise<string>} Caminho do arquivo de áudio baixado.
     */
    static async downloadAudio(url, targetPath) {
        await this.ensureBinary();

        // Para evitar erros de conversão do FFMPEG no Windows da VPS caso ele não esteja no PATH,
        // faremos o download do pior formato de áudio em contêiner MP4/M4A diretamente se a conversão mp3 falhar,
        // ou faremos a extração de áudio nativa.
        return new Promise((resolve, reject) => {
            // Tentamos extrair áudio mp3 direto
            const command = `"${YT_DLP_PATH}" -x --audio-format mp3 -o "${targetPath}" "${url}"`;
            console.log(`[YtDlpHelper] Executando download de áudio: ${command}`);

            exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    console.warn("[YtDlpHelper] Falha ao extrair mp3 com ffmpeg, tentando baixar o áudio nativo sem conversão...", error);
                    
                    // Fallback: Baixa o áudio sem tentar converter
                    const targetFallback = targetPath.replace(".mp3", ".m4a");
                    const fallbackCommand = `"${YT_DLP_PATH}" -f "ba/audio" -o "${targetFallback}" "${url}"`;
                    
                    exec(fallbackCommand, { timeout: 120000 }, (errFallback, outFallback, errsFallback) => {
                        if (errFallback) {
                            reject(new Error(`Falha no download de áudio: ${errFallback.message}`));
                        } else {
                            resolve(targetFallback);
                        }
                    });
                    return;
                }
                resolve(targetPath);
            });
        });
    }
}

module.exports = YtDlpHelper;
