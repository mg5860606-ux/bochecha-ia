const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database_autoreply.json');

const getDb = () => {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(dbPath));
};

const saveDb = (db) => {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

module.exports = {
    definition: {
        function: {
            name: "configurar_autoreposta",
            description: "Ensina ou remove respostas automáticas do bot para palavras específicas.",
            parameters: {
                type: "object",
                properties: {
                    acao: { 
                        type: "string", 
                        enum: ["ensinar", "esquecer", "listar"],
                        description: "Ação a ser realizada." 
                    },
                    gatilho: { 
                        type: "string", 
                        description: "A palavra que ativa a resposta." 
                    },
                    resposta: { 
                        type: "string", 
                        description: "O texto que o bot deve responder." 
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { from }) {
        const db = getDb();
        if (!db[from]) db[from] = {};

        // Fallback para comando direto: /auto_resposta <acao> [gatilho | resposta]
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();
            if (texto) {
                const partes = texto.split('|').map(s => s.trim());
                const acoes = ['ensinar', 'esquecer', 'listar'];
                const primeiroToken = partes[0].split(/\s+/)[0].toLowerCase();
                if (acoes.includes(primeiroToken)) {
                    args.acao = primeiroToken;
                    const restoPrimeiro = partes[0].slice(primeiroToken.length).trim();
                    if (restoPrimeiro) args.gatilho = restoPrimeiro;
                    if (partes[1]) args.resposta = partes[1];
                }
            }
            if (!args.acao) return "❌ Use: /auto_resposta ensinar <gatilho> | <resposta>\nOu: /auto_resposta esquecer <gatilho> | /auto_resposta listar";
        }

        if (args.acao === "ensinar") {
            if (!args.gatilho || !args.resposta) return "❌ Você precisa dizer o gatilho e a resposta! Ex: /ensinar oi | olá tudo bem?";
            const gatilho = args.gatilho.toLowerCase().trim();
            db[from][gatilho] = args.resposta;
            saveDb(db);
            return `✅ *ENSINADO!* Agora quando alguém disser "${gatilho}", eu responderei: "${args.resposta}"`;
        }

        if (args.acao === "esquecer") {
            if (!args.gatilho) return "❌ Diga qual palavra devo esquecer.";
            const gatilho = args.gatilho.toLowerCase().trim();
            if (!db[from][gatilho]) return `❌ Eu não conheço nenhuma resposta para "${gatilho}".`;
            delete db[from][gatilho];
            saveDb(db);
            return `🗑️ *ESQUECIDO!* Não responderei mais à palavra "${gatilho}".`;
        }

        if (args.acao === "listar") {
            const keys = Object.keys(db[from]);
            if (keys.length === 0) return "🏮 Não tenho nenhuma resposta automática configurada neste grupo.";
            let text = "🗣️ *MINHAS RESPOSTAS AUTOMÁTICAS* 🗣️\n\n";
            keys.forEach(k => text += `• *${k}:* ${db[from][k]}\n`);
            return text;
        }
    }
};
