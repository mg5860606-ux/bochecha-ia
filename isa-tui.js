const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

const METRICS_FILE = path.join(__dirname, 'learnings', 'key_metrics.json');

function clearScreen() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
}

function getProgressBar(percent, isCooldown) {
    const totalSegments = 10;
    const filledSegments = Math.round((percent / 100) * totalSegments);
    const emptySegments = totalSegments - filledSegments;

    const block = "█";
    const dot = "░";

    const filledStr = block.repeat(filledSegments);
    const emptyStr = dot.repeat(emptySegments);

    if (isCooldown) {
        return chalk.red(filledStr) + chalk.gray(emptyStr);
    }

    if (percent < 35) {
        return chalk.green(filledStr) + chalk.gray(emptyStr);
    } else if (percent < 70) {
        return chalk.yellow(filledStr) + chalk.gray(emptyStr);
    } else {
        return chalk.red(filledStr) + chalk.gray(emptyStr);
    }
}

function renderDashboard() {
    if (!fs.existsSync(METRICS_FILE)) {
        clearScreen();
        console.log(chalk.cyan("\n╔═════════════════════════════════════════════════════════════════╗"));
        console.log(chalk.cyan(`║               ${chalk.bold.yellow("PAINEL TERMINAL BOCHECHA-IA TUI")}                   ║`));
        console.log(chalk.cyan("╚═════════════════════════════════════════════════════════════════╝"));
        console.log(chalk.white("\n ⌛ ") + chalk.yellow("Aguardando o motor do Bochecha-IA iniciar para gerar métricas..."));
        console.log(chalk.gray(" Certifique-se de que o bot está rodando em outra aba do terminal.\n"));
        return;
    }

    try {
        const raw = fs.readFileSync(METRICS_FILE, 'utf8');
        const data = JSON.parse(raw);

        clearScreen();

        // ══════════════════════════════
        // 1. CABEÇALHO DO PAINEL
        // ══════════════════════════════
        console.log(chalk.cyan("╔" + "═".repeat(95) + "╗"));
        
        const lineText = `  ${chalk.bold.green("🤖 Modelo Primário:")} ${chalk.white(data.activeModel || "gemini-2.5-flash")}  |  ${chalk.bold.yellow("📄 Fallback:")} ${chalk.white(data.fallbackModel || "gemini-3.1-flash-lite")}  `;
        const centerPadding = Math.max(0, Math.floor((95 - lineText.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?::[0-9]{1,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length) / 2));
        console.log(chalk.cyan("║") + " ".repeat(centerPadding) + lineText + " ".repeat(95 - centerPadding - lineText.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?::[0-9]{1,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length) + chalk.cyan("║"));

        const statsText = `  ${chalk.cyan("🔑 Chaves:")} ${chalk.bold.white(data.activeKeys + "/" + data.totalKeys)}  |  ${chalk.yellow("📈 Divisão 50/50:")} ${chalk.red("DESATIVADA")}  |  ${chalk.green("⚡ Monitor:")} ${chalk.white("ONLINE")}  `;
        const statsPadding = Math.max(0, Math.floor((95 - statsText.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?::[0-9]{1,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length) / 2));
        console.log(chalk.cyan("║") + " ".repeat(statsPadding) + statsText + " ".repeat(95 - statsPadding - statsText.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?::[0-9]{1,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length) + chalk.cyan("║"));
        
        console.log(chalk.cyan("╚" + "═".repeat(95) + "╝"));

        // ══════════════════════════════
        // 2. TABELA DE APIS
        // ══════════════════════════════
        console.log("");
        // Cabeçalhos alinhados com espaçamento fixo
        console.log(
            chalk.bold.white("  #  ") +
            chalk.bold.white("Email / Token de Acesso   ").padEnd(32) +
            chalk.bold.white("Uso (Reqs) ").padEnd(12) +
            chalk.bold.white("Gráfico      ").padEnd(16) +
            chalk.bold.white("Restante   ").padEnd(14) +
            chalk.bold.white("Latência  ").padEnd(12) +
            chalk.bold.white("Status")
        );
        console.log(chalk.cyan("  " + "─".repeat(93)));

        if (!data.keys || data.keys.length === 0) {
            console.log(chalk.yellow("  Nenhuma chave cadastrada em key.json."));
        } else {
            data.keys.forEach((k, idx) => {
                const num = String(idx + 1).padStart(2, " ");
                const keyMask = k.keyMasked.padEnd(25);
                const successCount = String(k.success).padStart(4, " ") + " ok";
                const bar = getProgressBar(k.usagePercent || 0, k.status === "COOLDOWN");
                
                let cdLeft = "PRONTA".padEnd(8);
                if (k.status === "COOLDOWN") {
                    const m = Math.floor(k.cooldownLeft / 60);
                    const s = k.cooldownLeft % 60;
                    cdLeft = chalk.yellow(`${m}m ${s}s`.padEnd(8));
                } else {
                    cdLeft = chalk.green(cdLeft);
                }

                const latencyStr = String(k.latency || "0ms").padStart(6, " ");
                
                let statusBadge = "";
                if (k.status === "ATIVA") {
                    statusBadge = chalk.bgGreen.black.bold("   ATIVA   ");
                } else {
                    statusBadge = chalk.bgYellow.black.bold("  COOLDOWN ");
                }

                console.log(
                    `  ${chalk.gray(num)}  ` +
                    `${chalk.cyan(keyMask)} ` +
                    `${chalk.white(successCount)}   ` +
                    `${bar}   ` +
                    `${cdLeft}   ` +
                    `${chalk.white(latencyStr)}    ` +
                    `${statusBadge}`
                );
            });
        }
        console.log("");
        console.log(chalk.gray("  Pressione CTRL+C para sair do painel de monitoramento."));
    } catch (e) {
        // Silencioso em caso de leitura simultânea temporária
    }
}

// Limpa o console na inicialização inicial
console.clear();
renderDashboard();

// Atualiza o painel a cada 2 segundos
setInterval(renderDashboard, 2000);
