const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "bochecha_modo",
            description: "Altera o modo/personalidade de escrita e humor do Bochecha no grupo atual.",
            parameters: {
                type: "object",
                properties: {
                    modo: {
                        type: "string",
                        enum: ["cria", "coach", "baiano", "agiota", "normal"],
                        description: "O modo de personalidade a ser ativado."
                    }
                },
                required: ["modo"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "❌ Esta mudança de personalidade só pode ser feita em grupos.";

        const storage = global.storage;
        const dbPath = path.join(__dirname, 'database_personality.json');
        
        const modo = (args.modo || args.texto || args.alvo || "").trim().toLowerCase();
        
        const validModes = ["cria", "coach", "baiano", "agiota", "normal"];
        if (!validModes.includes(modo)) {
            return `❌ Modo inválido! Escolha um dos seguintes: ${validModes.join(", ")}`;
        }

        try {
            const data = await storage.read(dbPath, {});
            data[from] = modo;
            await storage.write(dbPath, data);

            const modeNames = {
                cria: "🎰 *CRIA DE COMUNIDADE* (Carioca marrento, cheio de gíria e marra) 💀",
                coach: "🧠 *COACH QUÂNTICO* (Mindset de alta performance, acordar 4:50h, banho gelado e papo chato) 🧘",
                baiano: "💤 *BAIANO PREGUIÇOSO* (Devagar, cansado, querendo deitar numa rede e sossego) 🦥",
                agiota: "💸 *AGIOTA DO SUBMUNDO* (Cobrando juros de Bochecha-Coins e fazendo ameaças sutis) 🔫",
                normal: "🛸 *ESTILO NORMAL BOCHECHA* (Equilibrado, ácido, safo e debochado) 🥀"
            };

            return `🎭 *MUTANÇÃO CONCLUÍDA!* 🎭\n\nMinha personalidade neste grupo foi alterada para: ${modeNames[modo]}!\n\n_Minha próxima resposta já virá calibrada com este temperamento!_ 🔥`;
        } catch (e) {
            console.error(e);
            return `❌ Erro ao alterar personalidade: ${e.message}`;
        }
    }
};
