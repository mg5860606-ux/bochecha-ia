const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
    definition: {
        function: {
            name: "controle_pc",
            description: "Permite ao criador Marcos monitorar e executar ações de hardware remotamente no computador local dele. Só funciona se o bot estiver rodando no PC local do Marcos e o remetente for ele.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["print", "bloquear", "status", "processos"],
                        description: "A ação a ser executada no computador pessoal do Marcos."
                    }
                },
                required: ["acao"]
              }
        }
    },
    async execute(args, { sock, from, isOwner }) {
        // 1. Validar se o remetente é o criador Marcos
        if (!isOwner) {
            return "🚨 Erro de segurança: Acesso negado! Apenas o meu criador @551420370091 tem autoridade suprema para executar comandos de hardware ou monitorar este PC. Não tente invadir meu sistema, parceiro! 💻🔐";
        }

        // 2. Validar se o bot está rodando no PC pessoal do Marcos (e não na VPS)
        const username = os.userInfo().username || process.env.USERNAME || process.env.USER || "";
        const isLocalPC = username.toLowerCase().includes("marcos") || __dirname.toLowerCase().includes("marcos");

        if (!isLocalPC) {
            return "⚠️ O bot está rodando na VPS Cloud em produção no momento, por isso os comandos de hardware local do seu PC pessoal não estão disponíveis aqui! Reinicie o bot no seu PC pessoal local para poder controlá-lo. 😉";
        }

        // Extrai a ação suportando tanto chamada estruturada da IA (acao) quanto comando direto no chat (texto/alvo)
        const action = (args.acao || args.texto || args.alvo || "").trim().toLowerCase();

        if (!action) {
            return "💡 Uso correto: `/controle_pc print` | `bloquear` | `status` | `processos`";
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
                    
                    return `💻 *STATUS DO SEU PC PESSOAL* 💻\n\n` +
                           `*💻 Host OS:* Windows (${platform})\n` +
                           `*👤 Usuário Ativo:* ${username}\n` +
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

                default:
                    return `❌ Ação de hardware desconhecida: "${action}". Use: print, bloquear, status ou processos.`;
            }
        } catch (err) {
            console.error(err);
            return `❌ Erro ao executar ação no seu PC: ${err.message}`;
        }
    }
};
