const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "github_explorer",
            description: "Permite explorar e pesquisar globalmente projetos, tendências (trending) e detalhes de códigos de qualquer usuário no GitHub usando a API pública.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["search", "trending", "inspect"],
                        description: "Ação a ser executada no GitHub."
                    },
                    argumento: {
                        type: "string",
                        description: "Termo da pesquisa (para search) ou repositório completo 'owner/repo' (para inspect)."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message } = ctx;
        const isCommand = args.isCommand || false;

        let action = "";
        let extraArg = "";

        if (isCommand) {
            const cmdArgs = (args.arg || "").trim();
            const parts = cmdArgs.split(" ");
            action = parts[0].toLowerCase();
            extraArg = parts.slice(1).join(" ").trim();
        } else {
            action = args.acao;
            extraArg = args.argumento || "";
        }

        if (!action) {
            const helper = `🕵️‍♂️ *EXPLORADOR GLOBAL DO GITHUB* 🕵️‍♂️\n\n` +
                           `👉 */github search [termo]* - Busca repositórios públicos populares.\n` +
                           `👉 */github trending* - Mostra projetos que estão bombando no GitHub.\n` +
                           `👉 */github inspect [owner/repo]* - Detalha qualquer repositório do mundo.\n\n` +
                           `> *BOCHECHA GITHUB MINER* 💀⚡`;
            if (isCommand) {
                await sock.sendMessage(from, { text: helper }, { quoted: message });
                return;
            } else {
                return helper;
            }
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: PESQUISAR REPOSITÓRIOS (/github search [termo])
            // ═════════════════════════════════════════════════════════════════
            if (action === "search") {
                if (!extraArg) {
                    const err = "⚠️ *Erro:* Forneça o termo de busca!\nUso: */github search [termo]*";
                    if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
                    else return err;
                }

                if (isCommand) {
                    await sock.sendMessage(from, { text: `🔍 *Minerando GitHub por:* \`${extraArg}\`...` });
                }

                const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(extraArg)}&sort=stars&order=desc&per_page=5`;
                const res = await axios.get(url, { headers, timeout: 15000 });
                const items = res.data.items || [];

                if (items.length === 0) {
                    const none = `❌ Não encontrei nenhum repositório no GitHub para o termo: *${extraArg}*.`;
                    if (isCommand) { await sock.sendMessage(from, { text: none }, { quoted: message }); return; }
                    else return none;
                }

                let report = `🔎 *RESULTADOS DO GITHUB: ${extraArg.toUpperCase()}* 🔎\n\n`;
                items.forEach((item, index) => {
                    report += `${index + 1}. ⭐ *${item.full_name}*\n`;
                    report += `  ↳ 📝 *Descr:* ${item.description || "Sem descrição."}\n`;
                    report += `  ↳ 💻 *Linguagem:* ${item.language || "Não detectada"}\n`;
                    report += `  ↳ 🌟 *Stars:* ${item.stargazers_count} | 🍴 *Forks:* ${item.forks_count}\n`;
                    report += `  ↳ 🔗 *Link:* ${item.html_url}\n\n`;
                });
                report += `> *BOCHECHA GITHUB MINER* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    return;
                } else {
                    return report;
                }
            }

            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: TENDÊNCIAS (/github trending)
            // ═════════════════════════════════════════════════════════════════
            if (action === "trending") {
                if (isCommand) {
                    await sock.sendMessage(from, { text: `📈 *Buscando tendências de tecnologia no GitHub...*` });
                }

                // Busca repositórios criados nos últimos 30 dias com mais estrelas
                const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
                const url = `https://api.github.com/search/repositories?q=created:>${thirtyDaysAgo}&sort=stars&order=desc&per_page=5`;
                const res = await axios.get(url, { headers, timeout: 15000 });
                const items = res.data.items || [];

                let report = `🔥 *PROJETOS TRENDING GITHUB (ÚLTIMOS 30 DIAS)* 🔥\n\n`;
                items.forEach((item, index) => {
                    report += `${index + 1}. ⭐ *${item.full_name}*\n`;
                    report += `  ↳ 📝 *Descr:* ${item.description || "Sem descrição."}\n`;
                    report += `  ↳ 💻 *Linguagem:* ${item.language || "Não especificada"}\n`;
                    report += `  ↳ 🌟 *Novas Stars:* ${item.stargazers_count}\n`;
                    report += `  ↳ 🔗 *Link:* ${item.html_url}\n\n`;
                });
                report += `> *BOCHECHA GITHUB TRENDS* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    return;
                } else {
                    return report;
                }
            }

            // ═════════════════════════════════════════════════════════════════
            // AÇÃO: INSPECIONAR REPOSITÓRIO (/github inspect [owner/repo])
            // ═════════════════════════════════════════════════════════════════
            if (action === "inspect") {
                if (!extraArg || !extraArg.includes('/')) {
                    const err = "⚠️ *Erro:* Forneça o repositório no formato 'owner/repo'!\nUso: */github inspect [owner/repo]*";
                    if (isCommand) { await sock.sendMessage(from, { text: err }, { quoted: message }); return; }
                    else return err;
                }

                if (isCommand) {
                    await sock.sendMessage(from, { text: `🕵️‍♂️ *Minerando núcleo de:* \`${extraArg}\`...` });
                }

                const url = `https://api.github.com/repos/${extraArg}`;
                const res = await axios.get(url, { headers, timeout: 15000 });
                const repo = res.data;

                let report = `🛸 *RAIO-X DE REPOSITÓRIO GITHUB* 🛸\n\n` +
                             `👑 *Nome:* ${repo.name}\n` +
                             `👤 *Dono:* ${repo.owner.login}\n` +
                             `📝 *Descrição:* ${repo.description || "Sem descrição."}\n\n` +
                             `⭐ *Estrelas:* ${repo.stargazers_count}\n` +
                             `🍴 *Forks:* ${repo.forks_count}\n` +
                             `🐛 *Issues Abertas:* ${repo.open_issues_count}\n` +
                             `💻 *Linguagem Principal:* ${repo.language || "Não identificada"}\n` +
                             `📅 *Criado em:* ${moment(repo.created_at).format('DD/MM/YYYY')}\n` +
                             `🔄 *Último Update:* ${moment(repo.updated_at).format('DD/MM/YYYY HH:mm')}\n\n` +
                             `🔗 *Link Oficial:* ${repo.html_url}\n\n` +
                             `> *BOCHECHA DEEP MINER* 💀⚡`;

                if (isCommand) {
                    await sock.sendMessage(from, { text: report }, { quoted: message });
                    return;
                } else {
                    return report;
                }
            }

        } catch (e) {
            console.error('[ERRO] github_explorer:', e.message);
            const errReport = `❌ *Erro ao interagir com API do GitHub:* Repositório não localizado ou requisição bloqueada.\nHost info: \`${e.message}\``;
            if (isCommand) {
                await sock.sendMessage(from, { text: errReport }, { quoted: message });
            }
            return errReport;
        }
    }
};
