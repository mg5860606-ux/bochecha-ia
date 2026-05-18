const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_placar.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

module.exports = {
    definition: {
        function: {
            name: "placar",
            description: "Gerencia placares e pontuações de times/jogadores no grupo. Cria placar, adiciona pontos, exibe resultados.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["criar", "ponto", "ver", "zerar", "remover", "listar"],
                        description: "Ação a executar."
                    },
                    nome: { type: "string", description: "Nome do placar ou time." },
                    pontos: { type: "number", description: "Pontos a adicionar (pode ser negativo)." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        const db = loadDB();
        const chatKey = from.replace('@g.us', '').replace('@s.whatsapp.net', '');
        if (!db[chatKey]) db[chatKey] = {};

        // ── MODO COMANDO DIRETO ──
        // /placar → exibe placares ativos
        // /placar criar Brasil x Argentina
        // /placar Brasil +1
        // /placar Brasil -1
        // /placar zerar
        // /placar zerar Brasil
        // /placar remover Brasil
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();

            if (!texto) {
                return exibirPlacar(db[chatKey]);
            }

            const low = texto.toLowerCase();

            // /placar zerar [nome]
            if (low.startsWith('zerar')) {
                const nome = texto.slice(5).trim();
                if (!nome) {
                    Object.keys(db[chatKey]).forEach(k => { db[chatKey][k].pontos = 0; });
                    saveDB(db);
                    return "✅ Todos os placares zerados! 💀";
                }
                if (!db[chatKey][nome]) return `❌ Time/jogador "${nome}" não encontrado.`;
                db[chatKey][nome].pontos = 0;
                saveDB(db);
                return `✅ Placar de *${nome}* zerado! 💀`;
            }

            // /placar remover Nome
            if (low.startsWith('remover ')) {
                const nome = texto.slice(8).trim();
                if (!db[chatKey][nome]) return `❌ "${nome}" não encontrado.`;
                delete db[chatKey][nome];
                saveDB(db);
                return `✅ *${nome}* removido do placar! 💀`;
            }

            // /placar criar Nome
            if (low.startsWith('criar ')) {
                const nome = texto.slice(6).trim();
                if (!nome) return "❌ Informe o nome.";
                db[chatKey][nome] = { pontos: 0 };
                saveDB(db);
                return `✅ *${nome}* criado no placar com 0 pontos! 💀`;
            }

            // /placar Nome +N ou /placar Nome -N
            const ptMatch = texto.match(/^(.+?)\s+([+-]\d+)$/);
            if (ptMatch) {
                const nome = ptMatch[1].trim();
                const pts = parseInt(ptMatch[2]);
                if (!db[chatKey][nome]) db[chatKey][nome] = { pontos: 0 };
                db[chatKey][nome].pontos += pts;
                saveDB(db);
                const emoji = pts > 0 ? '🟢' : '🔴';
                return `${emoji} *PLACAR ATUALIZADO!*\n\n🏆 *${nome}:* ${db[chatKey][nome].pontos} pontos (${pts > 0 ? '+' : ''}${pts}) 💀`;
            }

            // Só um nome → exibe placar desse nome
            if (db[chatKey][texto]) {
                return `🏆 *${texto}:* *${db[chatKey][texto].pontos}* pontos 💀`;
            }

            return [
                `🏆 *PLACAR - USO*`,
                ``,
                `/placar → ver placares`,
                `/placar criar Brasil → novo time`,
                `/placar Brasil +2 → adicionar pontos`,
                `/placar Brasil -1 → remover pontos`,
                `/placar zerar → zerar tudo`,
                `/placar zerar Brasil → zerar um time`,
                `/placar remover Brasil → remover time`
            ].join('\n');
        }

        // ── MODO IA ──
        switch (args.acao) {
            case "criar": {
                if (!args.nome) return "❌ Informe o nome.";
                db[chatKey][args.nome] = { pontos: 0 };
                saveDB(db);
                return `✅ *${args.nome}* criado no placar! 💀`;
            }
            case "ponto": {
                if (!args.nome) return "❌ Informe o nome.";
                if (!db[chatKey][args.nome]) db[chatKey][args.nome] = { pontos: 0 };
                const pts = args.pontos || 1;
                db[chatKey][args.nome].pontos += pts;
                saveDB(db);
                return `🏆 *${args.nome}:* ${db[chatKey][args.nome].pontos} pontos (${pts > 0 ? '+' : ''}${pts}) 💀`;
            }
            case "ver":
                return exibirPlacar(db[chatKey]);
            case "listar":
                return exibirPlacar(db[chatKey]);
            case "zerar": {
                if (args.nome) {
                    if (!db[chatKey][args.nome]) return `❌ "${args.nome}" não encontrado.`;
                    db[chatKey][args.nome].pontos = 0;
                } else {
                    Object.keys(db[chatKey]).forEach(k => { db[chatKey][k].pontos = 0; });
                }
                saveDB(db);
                return `✅ Placar ${args.nome ? `de *${args.nome}*` : ''} zerado! 💀`;
            }
            case "remover": {
                if (!args.nome) return "❌ Informe o nome.";
                if (!db[chatKey][args.nome]) return `❌ "${args.nome}" não encontrado.`;
                delete db[chatKey][args.nome];
                saveDB(db);
                return `✅ *${args.nome}* removido! 💀`;
            }
            default:
                return "❌ Ação inválida.";
        }
    }
};

function exibirPlacar(chat) {
    const entradas = Object.entries(chat || {});
    if (entradas.length === 0) return "🏆 Nenhum placar ativo. Use /placar criar <nome> para começar!";
    const ordenado = entradas.sort((a, b) => b[1].pontos - a[1].pontos);
    const medals = ['🥇', '🥈', '🥉'];
    let text = `🏆 *PLACAR DO SUBMUNDO* 🏆\n\n`;
    ordenado.forEach(([nome, info], i) => {
        const medal = medals[i] || '🔹';
        text += `${medal} *${nome}:* ${info.pontos} pontos\n`;
    });
    return text.trim() + '\n\n_ranking em tempo real. 💀_';
}
