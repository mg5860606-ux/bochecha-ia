const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database_namoro.json');

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
            name: "relacionamento",
            description: "Gerencia namoros e separações no grupo (namorar, separar, casais).",
            parameters: {
                type: "object",
                properties: {
                    acao: { 
                        type: "string", 
                        enum: ["namorar", "separar", "casais"],
                        description: "Ação a ser realizada." 
                    },
                    parceiro: { 
                        type: "string", 
                        description: "Menção do parceiro (apenas para namorar)." 
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, message }) {
        const db = getDb();
        if (!db[from]) db[from] = {};
        
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const senderId = sender;

        if (args.acao === "namorar") {
            if (mentioned.length === 0) return "❌ Você precisa mencionar quem deseja namorar!";
            const alvo = mentioned[0];
            
            if (alvo === senderId) return "❌ Você não pode namorar consigo mesmo (por enquanto)!";
            if (db[from][senderId]) return `❌ Você já está namorando com @${db[from][senderId].split('@')[0]}! Termine primeiro.`;
            if (db[from][alvo]) return `❌ @${alvo.split('@')[0]} já está em um compromisso sério!`;

            // Oficializa o namoro
            db[from][senderId] = alvo;
            db[from][alvo] = senderId;
            saveDb(db);

            const caption = `💘 *NOVO CASAL NA ÁREA!* 💘\n\n💍 @${senderId.split('@')[0]} e @${alvo.split('@')[0]} agora estão namorando oficialmente!\n\n_Que o amor de vocês dure até o próximo ban!_ 🦅✨`;
            await sock.sendMessage(from, { 
                image: { url: "https://files.catbox.moe/8t4a7v.jpg" }, 
                caption, 
                mentions: [senderId, alvo] 
            });
            return "Namoro oficializado.";
        }

        if (args.acao === "separar") {
            if (!db[from][senderId]) return "❌ Você está solteiro(a)! Não há ninguém para separar.";
            
            const ex = db[from][senderId];
            delete db[from][senderId];
            delete db[from][ex];
            saveDb(db);

            const caption = `💔 *FIM DE PAPO...* 💔\n\n😭 @${senderId.split('@')[0]} e @${ex.split('@')[0]} terminaram o namoro.\n\n_O amor acabou, mas a zoeira no grupo continua!_ 💀`;
            await sock.sendMessage(from, { 
                video: { url: "https://media.tenor.com/8N69FmRzM3AAAAAC/coffin-dance.gif" }, 
                gifPlayback: true,
                caption, 
                mentions: [senderId, ex] 
            });
            return "Separação concluída.";
        }

        if (args.acao === "casais") {
            let lista = "💍 *CASAIS OFICIAIS DO GRUPO* 💍\n\n";
            const processed = new Set();
            let count = 0;

            for (const [user, par] of Object.entries(db[from])) {
                if (!processed.has(user) && !processed.has(par)) {
                    lista += `👩‍❤️‍👨 @${user.split('@')[0]} ❤️ @${par.split('@')[0]}\n`;
                    processed.add(user);
                    processed.add(par);
                    count++;
                }
            }

            if (count === 0) return "🏮 O grupo está um deserto... nenhum casal por aqui!";
            
            return { text: lista, mentions: Array.from(processed) };
        }
    }
};
