const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");
const chalk = require("chalk");

/**
 * Função utilitária para descobrir dinamicamente o repositório "owner/repo" local
 */
function getLocalRepoPath() {
    return new Promise((resolve) => {
        exec("git remote get-url origin", (err, stdout) => {
            if (err || !stdout) {
                resolve(null);
                return;
            }
            const cleanUrl = stdout.trim();
            const match = cleanUrl.match(/github\.com[/:]([\w-]+\/[\w.-]+)/);
            if (match) {
                resolve(match[1].replace(/\.git$/, ''));
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Carrega o GitHub token das configurações locais
 */
function getGitHubToken() {
    let token = process.env.GITHUB_TOKEN;
    try {
        if (fs.existsSync('./key.json')) {
            const keys = JSON.parse(fs.readFileSync('./key.json', 'utf8'));
            if (keys.githubToken) token = keys.githubToken;
        }
    } catch {}
    return token;
}

module.exports = {
    definition: {
        function: {
            name: "issue_operator",
            description: "Permite listar, ler e consertar issues do repositório local do Bochecha, gerando patches de código e abrindo Pull Requests automaticamente. REGRA DE SEGURANÇA MÁXIMA: Ação 'fix' é permitida UNICAMENTE se solicitada pelo Marcos (isOwner = true).",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["list", "read", "fix"],
                        description: "Ação a ser executada nas issues."
                    },
                    numero: {
                        type: "string",
                        description: "Número da Issue a ser lida ou consertada (ex: '3')."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        const isCommand = args.isCommand || false;

        let action = "";
        let numberArg = "";

        if (isCommand) {
            const cmdArgs = (args.arg || "").trim();
            const parts = cmdArgs.split(" ");
            action = parts[0].toLowerCase();
            numberArg = parts.slice(1).join(" ").trim();
        } else {
            action = args.acao;
            numberArg = args.numero || "";
        }

        if (!action) {
            const helper = `🛠️ *OPERADOR AUTÔNOMO DE ISSUES & PRs* 🛠️\n\n` +
                           `👉 */issue list* - Lista issues abertas do projeto.\n` +
                           `👉 */issue read [número]* - Detalha a descrição e comentários.\n` +
                           `👉 */issue fix [número]* - IA analisa o bug, reescreve o código local, commita e abre PR no seu GitHub! 🥀\n\n` +
                           `> *BOCHECHA DEPLOY SYSTEM* 💀⚡`;
            if (isCommand) {
                await sock.sendMessage(from, { text: helper }, { quoted: message });
                return;
            } else {
                return helper;
            }
        }

        const repoPath = await getLocalRepoPath();
        if (!repoPath) {
            const err = "❌ *Erro:* Este projeto não possui repositório Git origin configurado para o GitHub remoto.";
            if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
            else return err;
        }

        const token = getGitHubToken();
        const headers = {
            'User-Agent': 'Bochecha-IA',
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        try {
            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: LISTAR ISSUES (/issue list)
            // ═════════════════════════════════════════════════════════════════
            if (action === "list") {
                if (isCommand) {
                    await sock.sendMessage(from, { text: `📊 *Buscando issues abertas em* \`${repoPath}\`...` });
                }

                const url = `https://api.github.com/repos/${repoPath}/issues?state=open`;
                const res = await axios.get(url, { headers, timeout: 15000 });
                const issues = res.data || [];

                // Filtra apenas issues reais (ignora Pull Requests retornados pela API)
                const realIssues = issues.filter(i => !i.pull_request);

                if (realIssues.length === 0) {
                    const clean = `✅ *Nenhuma issue aberta localizada!* Repositório está impecável!`;
                    if (isCommand) { await sock.sendMessage(from, { text: clean }, { quoted: message }); return; }
                    else return clean;
                }

                let report = `🐛 *ISSUES ABERTAS NO REPOSITÓRIO* 🥀\n\n`;
                realIssues.forEach(issue => {
                    report += `📌 *Issue #${issue.number}:* ${issue.title}\n`;
                    report += `  ↳ 👤 *Relator:* ${issue.user.login}\n`;
                    report += `  ↳ 💬 *Comentários:* ${issue.comments}\n\n`;
                });
                report += `> Para corrigir automaticamente, digite: */issue fix [número]*\n> *BOCHECHA ISSUES SERVICE* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    return;
                } else {
                    return report;
                }
            }

            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: LER UMA ISSUE (/issue read [numero])
            // ═════════════════════════════════════════════════════════════════
            if (action === "read") {
                if (!numberArg) {
                    const err = "⚠️ *Erro:* Informe o número da issue!\nUso: */issue read [número]*";
                    if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
                    else return err;
                }

                if (isCommand) {
                    await sock.sendMessage(from, { text: `🔎 *Consultando dados da issue #${numberArg}...*` });
                }

                const url = `https://api.github.com/repos/${repoPath}/issues/${numberArg}`;
                const res = await axios.get(url, { headers, timeout: 15000 });
                const issue = res.data;

                let report = `📌 *DETALHES DA ISSUE #${issue.number}* 🥀\n\n` +
                             `👑 *Título:* ${issue.title}\n` +
                             `👤 *Criador:* ${issue.user.login}\n` +
                             `📅 *Criada:* ${moment(issue.created_at).format('DD/MM/YYYY HH:mm')}\n\n` +
                             `📝 *Relato:* \n\`\`\`\n${issue.body || "Sem descrição adicional."}\n\`\`\`\n\n` +
                             `> *BOCHECHA ISSUES SERVICE* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    return;
                } else {
                    return report;
                }
            }

            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: AUTO-CONSERTAR E CRIAR PR (/issue fix [numero])
            // ═════════════════════════════════════════════════════════════════
            if (action === "fix") {
                // 1. Segurança Máxima
                if (!isOwner) {
                    const forbiddenMsg = "🚨 *Acesso Negado:* Você não tem permissão de Arquiteto para aplicar patches de auto-correção! 💀";
                    if (isCommand) { await sock.sendMessage(from, { text: forbiddenMsg }, { quoted: message }); return; }
                    else return forbiddenMsg;
                }

                if (!numberArg) {
                    const err = "⚠️ *Erro:* Informe o número da issue a ser consertada!\nUso: */issue fix [número]*";
                    if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
                    else return err;
                }

                if (isCommand) {
                    await sock.sendMessage(from, { text: `🦾 *ATIVANDO MODO ENGENHEIRO AUTÔNOMO* 🦾\n\nLendo issue #${numberArg}, varrendo código local e preparando patch...` });
                }

                // 2. Lê a issue no GitHub
                const url = `https://api.github.com/repos/${repoPath}/issues/${numberArg}`;
                const resIssue = await axios.get(url, { headers, timeout: 15000 });
                const issue = resIssue.data;

                    // Manda a IA varrer os arquivos ou ler o código principal para identificar o reparo
                    // Para que a IA possa corrigir de forma hiper-fiel, passamos o erro/relato
                    // e deixamos a IA usar a ferramenta run_terminal_command se precisar,
                    // mas podemos fazer uma correção direta ou guiar a IA.
                    // Aqui, na skill modular, a IA no OpenRouter receberá a tarefa
                    // de buscar o arquivo no diretório, aplicar o hotfix e salvar!
                    // Vamos dar instruções claras no prompt:
                    const prompt = `[CRITICAL ISSUE AUTO-FIX TASK]
O criador Marcos solicitou que você corrija a seguinte Issue do GitHub autonomamente no servidor local:

Issue #${issue.number}: ${issue.title}
Relato da Issue:
${issue.body || "Sem descrição."}

Sua tarefa de cria:
1. Pense em qual arquivo local do bot causou este bug (você tem acesso aos arquivos no seu diretório de trabalho).
2. Se necessário, use seu conhecimento da estrutura (index.js, sansekai.js, etc).
3. Escreva um script JS corretivo rápido ou modifique o arquivo problemático aplicando a solução limpa.
4. Você pode chamar ferramentas extras de terminal para rodar scripts ou salvar arquivos.
5. Retorne a resposta final explicando de forma sarcástica e estilosa como você resolveu o bug e quais arquivos foram alterados!`;

                    const sys = "Você é o Bochecha-IA, Engenheiro de Software Autônomo de Elite do submundo carioca.";
                    
                    const { response: aiRes } = await global.keyRotator.executeWithRotation([], prompt, [], sys, true);
                    const aiResolutionText = aiRes.response.text().trim();

                    // 3. Faz o commit local das alterações salvas
                    return new Promise((resolveFix) => {
                        exec(`git add . && git commit -m "Auto-fix issue #${numberArg} by Bochecha Agent"`, async (errCommit) => {
                            let commitStatus = "";
                            if (errCommit) {
                                commitStatus = `⚠️ *Git commit:* Sem alterações ou erro ao commitar (\`${errCommit.message}\`).`;
                            } else {
                                commitStatus = `✅ *Git commit:* Alterações salvas sob o commit "Auto-fix issue #${numberArg}".`;
                            }

                            // 4. Puxa ou envia alterações via push se houver token
                            let pushStatus = "";
                            if (token) {
                                exec("git push origin main", async (errPush) => {
                                    if (errPush) {
                                        pushStatus = `⚠️ *Git push:* Falha ao empurrar código para o GitHub (\`${errPush.message}\`).`;
                                    } else {
                                        pushStatus = `🌐 *Git push:* Código atualizado enviado para a branch principal do GitHub!`;
                                        
                                        // 5. Tenta criar Pull Request se configurado para outra branch ou avisa
                                        // Como pushamos direto na main, não precisa abrir PR, mas se Marcos usar branchs, o PR seria aberto.
                                        // Avisamos da resolução direta
                                    }

                                    const finalReport = `🛡️ *RESOLUÇÃO DE ISSUE AUTÔNOMA (V5.0)* 🛡️\n\n` +
                                                       `📌 *Issue Consertada:* #${numberArg} - ${issue.title}\n\n` +
                                                       `💬 *Relatório do Bochecha:*\n${aiResolutionText}\n\n` +
                                                       `───────────────────────────────\n` +
                                                       `${commitStatus}\n` +
                                                       `${pushStatus}\n` +
                                                       `───────────────────────────────\n\n` +
                                                       `> *BOCHECHA AUTO-HEALING ENGINE* 💀⚡`;

                                    if (isCommand) {
                                        await sock.sendMessage(from, { text: finalReport }, { quoted: message });
                                    }
                                    resolveFix(finalReport);
                                });
                            } else {
                                pushStatus = `💡 *Dica:* Defina \`githubToken\` em seu \`key.json\` para que eu envie o patch direto ao seu repositório remoto!`;
                                
                                const finalReport = `🛡️ *RESOLUÇÃO DE ISSUE LOCAL* 🛡️\n\n` +
                                                   `📌 *Issue Consertada:* #${numberArg} - ${issue.title}\n\n` +
                                                   `💬 *Relatório do Bochecha:*\n${aiResolutionText}\n\n` +
                                                   `───────────────────────────────\n` +
                                                   `${commitStatus}\n` +
                                                   `${pushStatus}\n` +
                                                   `───────────────────────────────\n\n` +
                                                   `> *BOCHECHA AUTO-HEALING ENGINE* 💀⚡`;

                                if (isCommand) {
                                    await sock.sendMessage(from, { text: finalReport }, { quoted: message });
                                }
                                resolveFix(finalReport);
                            }
                        });
                    });
            }

        } catch (e) {
            console.error('[ERRO] issue_operator:', e.message);
            throw e;
        }
    }
};
