const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

// Configura o console para silenciar avisos indesejados
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    return originalEmitWarning.call(process, warning, ...args);
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

console.log(chalk.gray("Carregando motores cognitivos do Bochecha-IA..."));
const sansekai = require("./sansekai.js");
const bochecha = sansekai.bochecha;

const banner = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                      🛸 BOCHECHA-IA - LOCAL CONSOLE 🛸                    ║
║             (Modo Offline - Funciona sem Conexão com o WhatsApp)         ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;

// Mock do Socket para simular conexões de WhatsApp localmente
const dummySock = {
    sendPresenceUpdate: async (state, jid) => {},
    sendMessage: async (jid, content, options) => {
        console.log(chalk.magenta(`\n🛸 [ENVIADO PARA WHATSAPP SIMULADO - ${jid}]:`));
        if (content.text) {
            console.log(chalk.white(content.text));
        } else {
            console.log(content);
        }
        console.log(chalk.magenta("──────────────────────────────────────────────────\n"));
        return { key: { id: "mock_" + Date.now() } };
    },
    groupMetadata: async (jid) => {
        return {
            id: jid,
            subject: "Grupo Local Simulado",
            participants: [
                { id: "551420370026@s.whatsapp.net", admin: "superadmin" }
            ]
        };
    }
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function startConsoleChat() {
    console.clear();
    console.log(chalk.cyan(banner));
    console.log(chalk.green("✅ Console de testes local carregado com sucesso!"));
    console.log(chalk.gray("Diretriz: Você está logado como Marcos (Dono Absoluto)."));
    console.log(chalk.gray("Digite 'sair' para encerrar a sessão.\n"));

    function ask() {
        rl.question(chalk.bold.yellow("Marcos 👑 > "), async (input) => {
            const trimmed = input.trim();
            if (!trimmed) {
                ask();
                return;
            }

            if (trimmed.toLowerCase() === 'sair') {
                console.log(chalk.cyan("\nAté a próxima, chefe! Desligando console local..."));
                rl.close();
                process.exit(0);
            }

            console.log(chalk.gray("\n🧠 Bochecha-IA está processando..."));

            const startTime = Date.now();
            try {
                const res = await bochecha._callAI({
                    chatId: "local_console_chat",
                    pushname: "Marcos",
                    sender: "551420370026@s.whatsapp.net", // JID do Marcos
                    prompt: trimmed,
                    isOwner: true,
                    sock: dummySock,
                    messageRef: null
                });

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                let text = res.output || "";

                // Remove Unicode isolators
                text = text.replace(/[\u2068\u2069]/g, '');

                // Intercept Reaction [REACAO: <emoji>]
                let reactionEmoji = null;
                const reactionRegex = /\[REACAO:\s*(.+?)\]/;
                const matchReaction = text.match(reactionRegex);
                if (matchReaction) {
                    reactionEmoji = matchReaction[1].trim();
                    text = text.replace(reactionRegex, "").trim();
                }

                // Intercept Sticker reaction
                let isSticker = false;
                if (text.trim() === "[FIGURINHA_REACAO]") {
                    text = chalk.italic.green("🖼️ [Enviou uma figurinha de meme/risada]");
                    isSticker = true;
                }

                // Format own mentions nicely for console visibility
                text = text.replace(/@551420370026/g, chalk.bold.yellow("@Marcos"));

                console.log(chalk.cyan(`\n🛸 Bochecha-IA [${res.modelName || 'Desconhecido'}] (${elapsed}s) 🛸`));
                console.log(chalk.white(text));
                if (reactionEmoji) {
                    console.log(chalk.green(`[Reagiu com: ${reactionEmoji}]`));
                }
                console.log(chalk.cyan("──────────────────────────────────────────────────\n"));

            } catch (err) {
                console.log(chalk.red(`\n❌ Erro no processamento: ${err.message}\n`));
            }

            ask();
        });
    }

    ask();
}

// Aguarda 3 segundos para dar tempo do boot do motor e carregamento das skills concluírem
setTimeout(() => {
    startConsoleChat();
}, 3000);
