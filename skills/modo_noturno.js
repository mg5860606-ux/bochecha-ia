const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database_noturno.json');

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
            name: "configurar_noturno",
            description: "Configura o horário de fechamento e abertura automática do grupo (Modo Noturno).",
            parameters: {
                type: "object",
                properties: {
                    fechar: { type: "string", description: "Horário para fechar o grupo (Ex: 23:00)." },
                    abrir: { type: "string", description: "Horário para abrir o grupo (Ex: 07:00)." },
                    estado: { type: "string", enum: ["ligar", "desligar"], description: "Ativar ou desativar o modo noturno." }
                },
                required: ["estado"]
            }
        }
    },
    async execute(args, { from }) {
        const db = getDb();
        
        if (args.estado === "desligar") {
            delete db[from];
            saveDb(db);
            return "🌙 *MODO NOTURNO DESATIVADO!* O grupo não será mais fechado automaticamente.";
        }

        if (!args.fechar || !args.abrir) return "❌ Você precisa informar o horário de fechar e abrir! Ex: /noturno 23:00 | 07:00";

        db[from] = {
            fechar: args.fechar,
            abrir: args.abrir,
            lastAction: ""
        };
        saveDb(db);

        return `🌙 *MODO NOTURNO CONFIGURADO!*\n\n🔒 *Fechar às:* ${args.fechar}\n🔓 *Abrir às:* ${args.abrir}\n\n_O Bochecha vai cuidar do sono de todos agora!_ 😴`;
    }
};
