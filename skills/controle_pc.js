const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
    definition: {
        function: {
            name: "controle_pc",
            description: "Permite ao criador Marcos monitorar e executar ações de hardware e sistema remotamente no computador local dele (como tirar screenshot, bloquear a tela, verificar status/processos, tocar áudio, desligar, e abrir links/YouTube no navegador). Só funciona se o bot estiver rodando no PC local do Marcos e o remetente for ele.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["print", "bloquear", "status", "processos", "tocar_audio", "desligar", "cancelar_desligamento", "abrir_link"],
                        description: "A ação a ser executada no computador pessoal do Marcos."
                    },
                    parametro: {
                        type: "string",
                        description: "Parâmetro adicional. Para abrir_link: URL ou termo como 'youtube'. Para tocar_audio: caminho de áudio local ou URL. Para desligar: tempo em segundos ou minutos."
                    }
                },
                required: ["acao"]
              }
        }
    },
    async execute(args, { sock, from, isOwner }) {
        // 1. Validar se o remetente é o criador Marcos
        if (!isOwner) {
            return "🚨 Erro de segurança: Acesso negado! Apenas o meu criador @551420370026 tem autoridade suprema para executar comandos de hardware ou monitorar este PC. Não tente invadir meu sistema, parceiro! 💻🔐";
        }

        // 2. Validar se o bot está rodando no PC pessoal do Marcos (e não na VPS)
        const username = os.userInfo().username || process.env.USERNAME || process.env.USER || "";
        const isLocalPC = username.toLowerCase().includes("marcos") || __dirname.toLowerCase().includes("marcos");

        if (!isLocalPC) {
            return "⚠️ O bot está rodando na VPS Cloud em produção no momento, por isso os comandos de hardware local do seu PC pessoal não estão disponíveis aqui! Reinicie o bot no seu PC pessoal local para poder controlá-lo. 😉";
        }

        let action = (args.acao || "").trim().toLowerCase();
        let param = (args.parametro || "").trim();

        // Se veio via comando direto (/controle_pc acao parametro)
        if (!action && (args.texto || args.alvo)) {
            const rawText = (args.texto || args.alvo).trim();
            const parts = rawText.split(/\s+/);
            action = parts[0].toLowerCase();
            param = parts.slice(1).join(" ");
        }

        if (!action) {
            return "💡 Uso correto: `/controle_pc print` | `bloquear` | `status` | `processos` | `tocar_audio <caminho/url>` | `desligar <tempo>` | `cancelar_desligamento`";
        }

        try {
            switch (action) {
                case "print":
                    const tempPrintPath = path.join(__dirname, `screenshot_${Date.now()}.png`);
                    const psCommand = `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bmp.Save('${tempPrintPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bmp.Dispose();`;
                    
                    await new Promise((resolve, reject) => {
                        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });

                    if (fs.existsSync(tempPrintPath)) {
                        await sock.sendMessage(from, { 
                            image: fs.readFileSync(tempPrintPath), 
                            caption: "📸 *Screenshot em tempo real capturada com sucesso do seu PC!* 🛸🥀" 
                        });
                        fs.unlinkSync(tempPrintPath);
                        return "✅ Screenshot capturada e enviada para você!";
                    } else {
                        return "❌ Falha ao tentar capturar a tela do seu PC.";
                    }

                case "bloquear":
                    await new Promise((resolve, reject) => {
                        exec("rundll32.exe user32.dll,LockWorkStation", (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });
                    return "🔒 *Tela do seu PC pessoal bloqueada com sucesso!* Ninguém mais mexe aí! 😉";

                case "status":
                    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
                    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
                    const usedMem = totalMem - freeMem;
                    const cpuModel = os.cpus()[0]?.model || "Desconhecido";
                    const uptimeHrs = Math.round(os.uptime() / 3600);
                    const platform = os.platform();
                    
                    // Obter IP Local
                    const networkInterfaces = os.networkInterfaces();
                    let localIp = "Desconhecido";
                    for (const interfaceName in networkInterfaces) {
                        const interfaces = networkInterfaces[interfaceName];
                        for (const iface of interfaces) {
                            if (iface.family === "IPv4" && !iface.internal) {
                                localIp = iface.address;
                                break;
                            }
                        }
                        if (localIp !== "Desconhecido") break;
                    }
                    
                    // Obter IP Público
                    let publicIp = "Buscando...";
                    try {
                        const axios = require("axios");
                        const resIp = await axios.get("https://api.ipify.org", { timeout: 3000 });
                        publicIp = resIp.data.trim();
                    } catch (e) {
                        publicIp = "Não foi possível detectar (Offline/Timeout)";
                    }
                    
                    return `💻 *STATUS DO SEU PC PESSOAL* 💻\n\n` +
                           `*💻 Host OS:* Windows (${platform})\n` +
                           `*👤 Usuário Ativo:* ${username}\n` +
                           `*🌐 IP Local:* ${localIp}\n` +
                           `*🌍 IP Público:* ${publicIp}\n` +
                           `*🧠 Processador:* ${cpuModel}\n` +
                           `*💾 Memória RAM:* ${usedMem}GB usados / ${totalMem}GB totais (${freeMem}GB livres)\n` +
                           `*⏳ Tempo de Atividade (Uptime):* ${uptimeHrs} horas ativo\n` +
                           `*🔋 Status Geral:* Operando liso em ambiente local! 🚀`;

                case "processos":
                    const psProcCommand = "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table -Property ProcessName, Id, CPU -HideTableHeaders | Out-String";
                    const procOutput = await new Promise((resolve, reject) => {
                        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psProcCommand}"`, (error, stdout) => {
                            if (error) reject(error);
                            else resolve(stdout.trim());
                        });
                    });

                    return `🔥 *PROCESSOS MAIS PESADOS (CPU)* 🔥\n\n` +
                           `\`\`\`\n${procOutput}\n\`\`\`\n` +
                           `*Dica:* Se precisar matar algum processo pesado, fale para eu fazer isso que eu escrevo a skill correspondente! 😉`;

                case "tocar":
                case "play":
                case "tocar_audio": {
                    if (!param) {
                        return "⚠️ Por favor, especifique o caminho de um arquivo de áudio local ou uma URL (MP3/WAV).";
                    }

                    let audioPath = param;
                    let isTemp = false;

                    if (param.startsWith("http://") || param.startsWith("https://")) {
                        try {
                            const axios = require("axios");
                            const tempDir = path.join(__dirname, "..", "temp");
                            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                            
                            const ext = param.split("?")[0].endsWith(".wav") ? ".wav" : ".mp3";
                            audioPath = path.join(tempDir, `local_play_${Date.now()}${ext}`);
                            
                            const writer = fs.createWriteStream(audioPath);
                            const response = await axios({
                                url: param,
                                method: 'GET',
                                responseType: 'stream'
                            });
                            
                            response.data.pipe(writer);
                            await new Promise((resolve, reject) => {
                                writer.on('finish', resolve);
                                writer.on('error', reject);
                            });
                            isTemp = true;
                        } catch (downloadErr) {
                            return `❌ Falha ao baixar o áudio da URL: ${downloadErr.message}`;
                        }
                    }

                    if (!fs.existsSync(audioPath)) {
                        return `❌ Arquivo de áudio não encontrado no caminho especificado: "${audioPath}"`;
                    }

                    const isWav = audioPath.toLowerCase().endsWith(".wav");
                    let psAudioCommand;
                    if (isWav) {
                        psAudioCommand = `(New-Object System.Media.SoundPlayer('${audioPath.replace(/\\/g, '\\\\')}')).PlaySync()`;
                    } else {
                        psAudioCommand = `Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${audioPath.replace(/\\/g, '\\\\')}'); $player.Play(); Start-Sleep -Seconds 60;`;
                    }

                    const { spawn } = require("child_process");
                    const child = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psAudioCommand], {
                        detached: true,
                        stdio: 'ignore'
                    });
                    child.unref();

                    if (isTemp) {
                        setTimeout(() => {
                            try {
                                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                            } catch {}
                        }, 70000);
                    }

                    return `🎵 *Reproduzindo áudio no seu PC local!* 🔊\n*Arquivo:* \`${path.basename(audioPath)}\`\n(Duração máxima: 60 segundos)`;
                }

                case "desligar":
                case "shutdown": {
                    let seconds = 60;
                    if (param) {
                        if (param.includes("min") || param.includes("m")) {
                            const match = param.match(/\d+/);
                            if (match) {
                                seconds = parseInt(match[0]) * 60;
                            }
                        } else {
                            const match = param.match(/\d+/);
                            if (match) {
                                seconds = parseInt(match[0]);
                            }
                        }
                    }

                    await new Promise((resolve, reject) => {
                        exec(`shutdown /s /f /t ${seconds}`, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });

                    return `🖥️ *Desligamento do PC pessoal agendado!* 🔌\nO computador será desligado em *${seconds} segundos* (${Math.round(seconds / 60)} minutos).\n\n💡 Para cancelar, envie: \`/controle_pc cancelar\` ou diga para eu abortar o desligamento.`;
                }

                case "cancelar":
                case "abortar":
                case "cancelar_desligamento": {
                    await new Promise((resolve, reject) => {
                        exec("shutdown /a", (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });
                    return "✅ *Agendamento de desligamento cancelado com sucesso!* Seu computador continuará ligado normalmente. 🖥️🙌";
                }

                case "abrir_link":
                case "abrir_url":
                case "abrir":
                case "youtube": {
                    if (!param) {
                        return "⚠️ Por favor, especifique o link ou termo para abrir.";
                    }
                    let url = param;
                    if (url.toLowerCase() === "youtube") {
                        url = "https://www.youtube.com";
                    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`;
                    }

                    await new Promise((resolve, reject) => {
                        exec(`start "" "${url.replace(/"/g, '\\"')}"`, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });

                    return `🌐 *Abrindo link no seu PC local!* 🖥️\n*Destino:* ${url}`;
                }

                default:
                    return `❌ Ação de hardware desconhecida: "${action}". Use: print, bloquear, status, processos, tocar_audio, desligar, abrir_link ou cancelar_desligamento.`;
            }
        } catch (err) {
            console.error(err);
            return `❌ Erro ao executar ação no seu PC: ${err.message}`;
        }
    }
};
