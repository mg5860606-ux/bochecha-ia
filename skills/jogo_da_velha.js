const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database_tictactoe.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ velha: {} }));

module.exports = {
    definition: {
        function: {
            name: "jogo_da_velha",
            description: "Inicia ou faz uma jogada no tabuleiro de Jogo da Velha contra o bot. Linhas e Colunas vão de 0 a 2.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["iniciar", "jogada"], description: "Ação a executar" },
                    linha: { type: "number", description: "Linha da jogada (0, 1 ou 2)" },
                    coluna: { type: "number", description: "Coluna da jogada (0, 1 ou 2)" }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        let db = JSON.parse(fs.readFileSync(dbPath));
        if (!db.velha) db.velha = {};
        
        if (args.acao === "iniciar") {
            db.velha[from] = {
                tabuleiro: [ ["⬛", "⬛", "⬛"], ["⬛", "⬛", "⬛"], ["⬛", "⬛", "⬛"] ],
                ativa: true
            };
            fs.writeFileSync(dbPath, JSON.stringify(db));
            let board = db.velha[from].tabuleiro.map(r => r.join('')).join('\n');
            await sock.sendMessage(from, { text: `❌ *JOGO DA VELHA* ⭕\n\nJogo iniciado! Você é o ❌.\n\n${board}\n\nPara jogar, diga algo como: "Bochecha, marca a linha 1, coluna 1 no jogo da velha". (Lembre-se: é de 0 a 2).` });
            return "Jogo iniciado com sucesso.";
        }
        
        if (args.acao === "jogada") {
            const jogo = db.velha[from];
            if (!jogo || !jogo.ativa) return "Nenhum jogo ativo no momento.";
            
            let l = args.linha; let c = args.coluna;
            if (l < 0 || l > 2 || c < 0 || c > 2) return "Aviso: Linha e coluna devem ser números entre 0 e 2.";
            if (jogo.tabuleiro[l][c] !== "⬛") return "Essa posição já está ocupada! Peça para ele escolher outra vazia.";
            
            // Jogada do Usuário
            jogo.tabuleiro[l][c] = "❌";
            if (verificarVitoria(jogo.tabuleiro, "❌")) return encerrar(jogo, db, from, sock, `🏆 Parabéns! Você ganhou de mim!`);
            
            // Jogada do Bot (A IA responde automaticamente marcando a primeira posição livre aleatória)
            let vazios = [];
            for(let i=0; i<3; i++) for(let j=0; j<3; j++) if(jogo.tabuleiro[i][j] === "⬛") vazios.push({i,j});
            if (vazios.length === 0) return encerrar(jogo, db, from, sock, `Deu velha! Empatamos.`);
            
            let jB = vazios[Math.floor(Math.random() * vazios.length)];
            jogo.tabuleiro[jB.i][jB.j] = "⭕";
            if (verificarVitoria(jogo.tabuleiro, "⭕")) return encerrar(jogo, db, from, sock, `🤖 HAHAHA! O Bochecha venceu!`);
            
            vazios = vazios.filter(v => !(v.i === jB.i && v.j === jB.j));
            if (vazios.length === 0) return encerrar(jogo, db, from, sock, `Deu velha! Empatamos.`);
            
            fs.writeFileSync(dbPath, JSON.stringify(db));
            let board = jogo.tabuleiro.map(r => r.join('')).join('\n');
            await sock.sendMessage(from, { text: `❌ *JOGO DA VELHA* ⭕\n\nMinha vez! Joguei em (${jB.i}, ${jB.j}).\n\n${board}\n\nSua vez! Mande a próxima linha e coluna.` });
            return "Jogada feita, vez do usuário.";
        }
    }
};

function verificarVitoria(t, p) {
    for (let i = 0; i < 3; i++) {
        if (t[i][0] === p && t[i][1] === p && t[i][2] === p) return true;
        if (t[0][i] === p && t[1][i] === p && t[2][i] === p) return true;
    }
    if (t[0][0] === p && t[1][1] === p && t[2][2] === p) return true;
    if (t[0][2] === p && t[1][1] === p && t[2][0] === p) return true;
    return false;
}

async function encerrar(jogo, db, from, sock, msgResult) {
    let board = jogo.tabuleiro.map(r => r.join('')).join('\n');
    jogo.ativa = false;
    fs.writeFileSync(path.join(__dirname, '../database_tictactoe.json'), JSON.stringify(db));
    await sock.sendMessage(from, { text: `❌ *JOGO DA VELHA* ⭕\n\n${board}\n\n${msgResult}` });
    return "O jogo acabou.";
}
