const { exec } = require("child_process");
const chalk = require("chalk");

module.exports = {
    definition: {
        function: {
            name: "git_manager",
            description: "Permite gerenciar o repositório git local do bot (status, diff, pull, push, commit, clone). REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true).",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["status", "diff", "pull", "push", "commit", "clone"],
                        description: "Ação do git a ser executada."
                    },
                    argumento: {
                        type: "string",
                        description: "Mensagem do commit, url do clone ou parâmetros extras."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        const isCommand = args.isCommand || false;

        // 1. SEGURANÇA CRÍTICA: Apenas o Dono/Criador Marcos
        if (!isOwner) {
            const forbiddenMsg = "🚨 *Acesso Negado:* Você não possui privilégios de Arquiteto para acessar o kernel do Git local! 💀";
            if (isCommand) {
                await sock.sendMessage(from, { text: forbiddenMsg }, { quoted: message });
                return;
            } else {
                return forbiddenMsg;
            }
        }

        let action = "";
        let extraArg = "";

        if (isCommand) {
            // Comando direto: ex. /git status ou /git commit "minha alteração"
            const cmdArgs = (args.arg || "").trim();
            const parts = cmdArgs.split(" ");
            action = parts[0].toLowerCase();
            extraArg = parts.slice(1).join(" ").trim();
        } else {
            // Chamado pela IA (Function Calling)
            action = args.acao;
            extraArg = args.argumento || "";
        }

        if (!action) {
            const helper = `🪐 *COMANDOS GIT DO BOCHECHA* 🪐\n\n` +
                           `👉 */git status* - Mostra modificações locais.\n` +
                           `👉 */git diff* - Detalha modificações em tempo real.\n` +
                           `👉 */git pull* - Puxa atualizações do GitHub remoto.\n` +
                           `👉 */git add* - Adiciona modificações locais.\n` +
                           `👉 */git commit [mensagem]* - Commita modificações locais.\n` +
                           `👉 */git push* - Envia modificações ao GitHub remoto.\n` +
                           `👉 */git clone [url]* - Clona outros repositórios.\n\n` +
                           `> *BOCHECHA GIT ENGINE* 🥀⚡`;
            if (isCommand) {
                await sock.sendMessage(from, { text: helper }, { quoted: message });
                return;
            } else {
                return helper;
            }
        }

        let shellCmd = "";
        let visualTitle = "";

        switch (action) {
            case "status":
                shellCmd = "git status";
                visualTitle = "📊 *STATUS DO REPOSITÓRIO GIT*";
                break;
            case "diff":
                shellCmd = "git diff";
                visualTitle = "📝 *MODIFICAÇÕES EM TEMPO REAL (DIFF)*";
                break;
            case "pull":
                shellCmd = "git pull";
                visualTitle = "📥 *PUXANDO ATUALIZAÇÕES REMOTAS (PULL)*";
                break;
            case "push":
                shellCmd = "git push";
                visualTitle = "📤 *ENVIANDO ALTERAÇÕES AO GITHUB (PUSH)*";
                break;
            case "add":
                shellCmd = "git add .";
                visualTitle = "📂 *ADICIONANDO ARQUIVOS (ADD)*";
                break;
            case "commit":
                if (!extraArg) {
                    const commitErr = "⚠️ *Erro:* Informe uma mensagem de commit!\nUso: */git commit \"minha alteração\"*";
                    if (isCommand) {
                        await sock.sendMessage(from, { text: commitErr }, { quoted: message });
                        return;
                    } else {
                        return commitErr;
                    }
                }
                // Limpa aspas extras se presentes
                const cleanMsg = extraArg.replace(/^['"]|['"]$/g, '');
                shellCmd = `git add . && git commit -m "${cleanMsg}"`;
                visualTitle = "💾 *SALVANDO PONTO DO SISTEMA (COMMIT)*";
                break;
            case "clone":
                if (!extraArg) {
                    const cloneErr = "⚠️ *Erro:* Informe a URL do repositório a ser clonado!\nUso: */git clone [URL]*";
                    if (isCommand) {
                        await sock.sendMessage(from, { text: cloneErr }, { quoted: message });
                        return;
                    } else {
                        return cloneErr;
                    }
                }
                shellCmd = `git clone ${extraArg}`;
                visualTitle = "🛸 *CLONANDO REPOSITÓRIO GITHUB*";
                break;
            default:
                const unknown = `❌ Comando Git inválido: '${action}'. Digite somente */git* para ajuda.`;
                if (isCommand) {
                    await sock.sendMessage(from, { text: unknown }, { quoted: message });
                    return;
                } else {
                    return unknown;
                }
        }

        // Executa o comando em background de forma segura
        if (isCommand) {
            await sock.sendMessage(from, { text: `⚡ *Executando no Host:* \`${shellCmd}\`...` });
        }

        return new Promise((resolve) => {
            exec(shellCmd, { timeout: 45000 }, async (error, stdout, stderr) => {
                let report = `${visualTitle} 🥀\n\n`;
                
                if (error) {
                    report += `❌ *FALHA NA EXECUÇÃO:*\n\`\`\`\n${error.message}\n${stderr}\n\`\`\``;
                } else {
                    const output = stdout.trim() || stderr.trim() || "Comando executado sem saídas visíveis.";
                    // Limita a saída para não estourar o limite de caracteres do WhatsApp (máx 3500)
                    const slicedOutput = output.length > 3500 ? output.substring(0, 3500) + "\n... (saída truncada)" : output;
                    report += `\`\`\`\n${slicedOutput}\n\`\`\``;
                }
                
                report += `\n\n> *BOCHECHA AGENT v4.5* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    resolve(report);
                } else {
                    resolve(report);
                }
            });
        });
    }
};
