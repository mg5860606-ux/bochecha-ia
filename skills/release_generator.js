const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");

module.exports = {
    definition: {
        function: {
            name: "release_generator",
            description: "Gera notas de lançamento (Changelog) estéticas e premium com base nos últimos commits locais e cria automaticamente uma tag/release do Git. REGRA DE SEGURANÇA MÁXIMA: Permitido UNICAMENTE se solicitado pelo Arquiteto Marcos (isOwner = true).",
            parameters: {
                type: "object",
                properties: {
                    tag: {
                        type: "string",
                        description: "A tag de versão a ser criada (ex: v4.6.0)."
                    }
                },
                required: ["tag"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        const isCommand = args.isCommand || false;

        // 1. SEGURANÇA MÁXIMA: Apenas Marcos
        if (!isOwner) {
            const forbiddenMsg = "🚨 *Acesso Negado:* Você não tem privilégios de Arquiteto para liberar releases no kernel do Bochecha! 💀";
            if (isCommand) {
                await sock.sendMessage(from, { text: forbiddenMsg }, { quoted: message });
                return;
            } else {
                return forbiddenMsg;
            }
        }

        const tag = isCommand ? (args.arg || "").trim() : args.tag;

        if (!tag) {
            const err = "⚠️ *Erro:* Forneça a tag de versão!\nUso: */release vX.Y.Z*";
            if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
            else return err;
        }

        if (isCommand) {
            await sock.sendMessage(from, { text: `📦 *Iniciando deploy de versão:* \`${tag}\`...\nLendo commits recentes do Git e consultando neurônios de elite.` });
        }

        return new Promise((resolve, reject) => {
            // Puxa os últimos 15 commits legíveis
            exec("git log -n 15 --pretty=format:\"- %s (%h) [%an]\"", { timeout: 15000 }, async (errLog, stdout) => {
                if (errLog) {
                    const fail = `❌ *Erro ao ler logs do Git:* Certifique-se de que o Git está inicializado e possui commits no servidor.\nHost details: \`${errLog.message}\``;
                    if (isCommand) { await sock.sendMessage(from, { text: fail }, { quoted: message }); }
                    resolve(fail);
                    return;
                }

                const commits = stdout.trim() || "- Commits iniciais (Sem histórico prévio).";

                try {
                        const prompt = `Gere uma nota de lançamento (Release Notes / Changelog) estética, robusta, premium e muito estilosa para a versão '${tag}' do Bochecha-IA.\n` +
                                       `Use a linguagem sarcástica, debochada e de cria carioca característica do Bochecha.\n` +
                                       `Destaque as novidades técnicas dividindo em seções (ex: ⚡ Novidades do Submudo, 🛠️ Ajustes de Cria, etc) e decore com emojis góticos raros (🪐 🥀 💀 ⚡ 🛸 ♰ 𖤐).\n\n` +
                                       `Aqui está a lista de commits recentes para você se basear:\n${commits}`;
                        const sys = "Você é o Bochecha-IA. Escreve notas de lançamentos premium e de cria do submundo.";

                        const { response: aiRes } = await global.keyRotator.executeWithRotation([], prompt, [], sys, true);
                        const changelog = aiRes.response.text().trim();

                        // 2. Tenta criar a tag localmente no git
                        exec(`git tag -a ${tag} -m "Release ${tag}"`, async (errTag) => {
                            let localStatus = "";
                            if (errTag) {
                                // Se a tag já existir, ignora erro para permitir re-publicar ou avisa
                                if (errTag.message.includes("already exists")) {
                                    localStatus = `ℹ️ *Tag local \`${tag}\` já existe no servidor.*`;
                                } else {
                                    localStatus = `⚠️ *Aviso:* Não consegui criar a tag local no host (\`${errTag.message}\`).`;
                                }
                            } else {
                                localStatus = `✅ *Tag local \`${tag}\` criada com absoluto sucesso no host!*`;
                            }

                            // 3. Tenta publicar a Release no GitHub remoto se houver chave token configurada
                            let gitHubStatus = "";
                            let token = process.env.GITHUB_TOKEN;
                            
                            // Verifica se há chave configurada em settings ou key.json
                            try {
                                if (fs.existsSync('./key.json')) {
                                    const keys = JSON.parse(fs.readFileSync('./key.json', 'utf8'));
                                    if (keys.githubToken) token = keys.githubToken;
                                }
                            } catch {}

                            if (token) {
                                try {
                                    // Tenta puxar a URL remota para saber owner e repo
                                    exec("git remote get-url origin", async (errUrl, stdoutUrl) => {
                                        if (!errUrl && stdoutUrl) {
                                            const cleanUrl = stdoutUrl.trim();
                                            // Extrai "owner/repo" de urls HTTPS ou SSH
                                            const repoMatch = cleanUrl.match(/github\.com[/:]([\w-]+\/[\w.-]+)/);
                                            if (repoMatch) {
                                                const repoPath = repoMatch[1].replace(/\.git$/, '');
                                                const urlRelease = `https://api.github.com/repos/${repoPath}/releases`;
                                                
                                                await axios.post(urlRelease, {
                                                    tag_name: tag,
                                                    name: `Release ${tag}`,
                                                    body: changelog,
                                                    draft: false,
                                                    prerelease: false
                                                }, {
                                                    headers: {
                                                        'Authorization': `token ${token}`,
                                                        'Accept': 'application/vnd.github.v3+json',
                                                        'User-Agent': 'Bochecha-IA'
                                                    }
                                                });
                                                gitHubStatus = `🌐 *Release publicada diretamente no seu GitHub remoto!* 🛸`;
                                            }
                                        }
                                    });
                                } catch (ghErr) {
                                    gitHubStatus = `⚠️ *GitHub API:* Conexão recusada ao postar release (\`${ghErr.message}\`).`;
                                }
                            } else {
                                gitHubStatus = `💡 *Dica:* Configure a chave \`githubToken\` em seu \`key.json\` para que eu publique a release no GitHub remoto automaticamente!`;
                            }

                            // Prepara o report estético final para mandar no WhatsApp
                            const report = `╔═══════════════════════════════╗\n` +
                                           `    🪐 BOCHECHA RELEASE ENGINE 🪐\n` +
                                           `╚═══════════════════════════════╝\n\n` +
                                           `${changelog}\n\n` +
                                           `───────────────────────────────\n` +
                                           `${localStatus}\n` +
                                           `${gitHubStatus}\n` +
                                           `───────────────────────────────\n\n` +
                                           `> *BOCHECHA DEPLOY SYSTEM* 🥀💀⚡`;

                            if (isCommand) {
                                await sock.sendMessage(from, { text: report }, { quoted: message });
                            }
                            resolve(report);
                        });

                    } catch (aiErr) {
                        reject(aiErr);
                    }
            });
        });
    }
};
