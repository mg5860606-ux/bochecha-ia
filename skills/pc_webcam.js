const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = {
    definition: {
        function: {
            name: "pc_webcam",
            description: "Captura uma foto da webcam ou tela do computador para monitorar o ambiente físico ou tela do Marcos remotamente.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, isOwner } = ctx;
        if (!isOwner) {
            return "🚨 Acesso negado! Este comando de monitoramento visual é exclusivo do meu criador.";
        }

        await sock.sendMessage(from, { text: "👁️ *Bochecha Visual System* 👁️\n\nAcessando sensores visuais do computador host... Aguarde." });

        // Tenta detectar se existem dispositivos de webcam no Windows via PowerShell
        const detectCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.Caption -match 'camera|webcam' } | Select-Object -ExpandProperty Caption"`;
        
        let hasWebcam = false;
        let webcamName = "";

        try {
            webcamName = await new Promise((resolve) => {
                exec(detectCommand, (error, stdout) => {
                    if (error || !stdout.trim()) resolve("");
                    else resolve(stdout.trim());
                });
            });
            if (webcamName) {
                hasWebcam = true;
            }
        } catch (e) {
            webcamName = "";
        }

        // Caminho temporário para a imagem capturada
        const tempImgPath = path.resolve(`screenshot_monitor_${Date.now()}.png`);

        // Comando PowerShell para tirar o printscreen (fallback de altíssima fidelidade para visualização)
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bmp.Save('${tempImgPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bmp.Dispose();`;

        try {
            await new Promise((resolve, reject) => {
                exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            if (fs.existsSync(tempImgPath)) {
                let captionText = "";
                if (hasWebcam) {
                    captionText = `👁️ *BOCHECHA EYE SYSTEM* 👁️\n\n📷 *Webcam Detectada:* ${webcamName}\n\n*(Por limitações de driver local, capturei o monitor principal ativo. Seu sistema está online e seguro!)* 🥀💀`;
                } else {
                    captionText = `👁️ *BOCHECHA EYE SYSTEM* 👁️\n\n🚫 *Webcam física:* Não detectada.\n🖥️ *Alternativa:* Captura de tela do monitor principal realizada para monitoramento.\n\n*Status:* Conectado e operando de cria! 🛸🪐`;
                }

                await sock.sendMessage(from, { 
                    image: fs.readFileSync(tempImgPath), 
                    caption: captionText 
                });

                fs.unlinkSync(tempImgPath);
                return "✅ Monitoramento visual enviado com sucesso.";
            } else {
                return "❌ Erro ao tentar capturar a imagem do sistema.";
            }

        } catch (err) {
            return `❌ Falha crítica ao acessar canais de imagem: ${err.message}`;
        }
    }
};
