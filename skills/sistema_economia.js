const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database_economy.json');

// Inicializa o banco de dados se não existir
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

const getDb = () => JSON.parse(fs.readFileSync(dbPath));
const saveDb = (db) => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

module.exports = {
    definition: {
        function: {
            name: "sistema_economia",
            description: "Gerencia o sistema de moedas (N-Coins). Permite minerar, jogar no cassino, ver saldo ou transferir.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["minerar", "cassino", "saldo", "pix"], description: "A ação a ser realizada." },
                    valor: { type: "number", description: "Valor para transferência (apenas para ação pix)." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        let db = getDb();
        if (!db[sender]) db[sender] = { coins: 100, lastMine: 0 };

        const agora = Date.now();

        if (args.acao === "saldo") {
            return `💰 *BANCO BOCHECHA-IA*\n\nCliente: *${pushname}*\nSaldo Atual: *${db[sender].coins} N-Coins*\n\n_Use 'minerar' para ganhar mais ou 'cassino' para apostar!_`;
        }

        if (args.acao === "minerar") {
            const espera = 60000; // 1 minuto de cooldown
            if (agora - db[sender].lastMine < espera) {
                const restante = Math.ceil((espera - (agora - db[sender].lastMine)) / 1000);
                return `⏳ Suas máquinas de mineração estão superaquecidas! Volte em ${restante} segundos.`;
            }

            const ganho = Math.floor(Math.random() * 50) + 10;
            db[sender].coins += ganho;
            db[sender].lastMine = agora;
            saveDb(db);
            return `⛏️ *MINERAÇÃO CONCLUÍDA!*\n\nVocê escavou profundamente e encontrou *${ganho} N-Coins* em minérios raros!\n\nNovo Saldo: *${db[sender].coins} N-Coins*`;
        }

        if (args.acao === "cassino") {
            if (db[sender].coins < 20) return "❌ Você precisa de pelo menos 20 N-Coins para apostar no cassino!";
            
            db[sender].coins -= 20;
            const sorte = Math.random();
            let msg = "";
            
            if (sorte > 0.7) { // 30% de chance de ganhar
                const premio = 60;
                db[sender].coins += premio;
                msg = `🎰 *JACKPOT!* 🎰\n\nAs frutas alinharam perfeitamente! Você ganhou *${premio} N-Coins*!\n\nSaldo: *${db[sender].coins}*`;
            } else {
                msg = `🎰 *CASSINO* 🎰\n\nInfelizmente não foi dessa vez. Você perdeu 20 N-Coins. 💸\n\nSaldo: *${db[sender].coins}*`;
            }
            saveDb(db);
            return msg;
        }

        if (args.acao === "pix") {
            const target = message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!target) return "❌ Você precisa responder à mensagem de alguém para fazer um PIX!";
            if (!args.valor || args.valor <= 0) return "❌ Informe um valor válido para transferência.";
            if (db[sender].coins < args.valor) return "❌ Saldo insuficiente para realizar essa transferência.";

            if (!db[target]) db[target] = { coins: 0, lastMine: 0 };
            
            db[sender].coins -= args.valor;
            db[target].coins += args.valor;
            saveDb(db);
            return `💸 *PIX REALIZADO!*\n\nVocê transferiu *${args.valor} N-Coins* para o usuário citado com sucesso!`;
        }
    }
};
