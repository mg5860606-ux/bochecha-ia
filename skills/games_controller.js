// ════════════════════════════════════════════════
//  GAMES CONTROLLER — Interceptor de Jogadas
//  Roda ANTES da IA. Processa jogadas em tempo real.
// ════════════════════════════════════════════════

const activeGames = new Map();

module.exports = {
    activeGames,

    // Chamado pelo sansekai.js ANTES da IA para interceptar jogadas
    processMove: async (sock, from, sender, body) => {
        if (!activeGames.has(from)) return false;

        const game = activeGames.get(from);

        // ══════════════════════════
        //  JOGO DA VELHA
        // ══════════════════════════
        if (game.type === 'velha') {
            const move = parseInt(body.trim());
            if (isNaN(move) || move < 1 || move > 9) return false;

            // Posição já ocupada
            if (game.board[move - 1] !== ' ') {
                await sock.sendMessage(from, { text: "❌ Essa posição já está ocupada! Escolhe outra de 1-9." });
                return true;
            }

            // Verifica vez (modo 2 jogadores)
            if (!game.vsBot) {
                const currentPlayer = game.turn === 'X' ? game.player1 : game.player2;
                if (sender !== currentPlayer) return true; // silencioso — não é a vez dele
            } else {
                // Modo vs bot: só o player1 joga
                if (sender !== game.player1) return false;
            }

            // Jogada do humano
            game.board[move - 1] = game.turn;

            // Checa vitória/empate do humano
            const winnerH = checkWinner(game.board);
            const drawH = !game.board.includes(' ') && !winnerH;

            if (winnerH || drawH) {
                if (winnerH) {
                    const winnerJid = game.turn === 'X' ? game.player1 : game.player2;
                    const loserName = game.vsBot ? 'BOCHECHA' : `@${(game.turn === 'X' ? game.player2 : game.player1).split('@')[0]}`;
                    await sock.sendMessage(from, {
                        text: `🏆 *VITÓRIA!* @${winnerJid.split('@')[0]} ganhou! 🔥\n\n${renderBoard(game.board)}\n\n_o ${loserName} foi humilhado. 💀_`,
                        mentions: winnerJid !== 'BOT' ? [winnerJid] : []
                    });
                } else {
                    await sock.sendMessage(from, {
                        text: `🤝 *EMPATE!* Ninguém venceu.\n\n${renderBoard(game.board)}\n\n_velha rainha. 💀_`
                    });
                }
                activeGames.delete(from);
                return true;
            }

            // Modo vs Bot: bot joga
            if (game.vsBot) {
                const botMove = getBotMove(game.board);
                game.board[botMove] = 'O';

                const winnerB = checkWinner(game.board);
                const drawB = !game.board.includes(' ') && !winnerB;

                if (winnerB) {
                    await sock.sendMessage(from, {
                        text: `🤖 *BOCHECHA GANHOU!* hahahaha fácil demais.\n\n${renderBoard(game.board)}\n\n_não tem nível pra me vencer. 💀_`,
                        mentions: [game.player1]
                    });
                    activeGames.delete(from);
                    return true;
                }
                if (drawB) {
                    await sock.sendMessage(from, {
                        text: `🤝 *EMPATE!* Tá bom, dessa vez você sobreviveu.\n\n${renderBoard(game.board)}\n\n_considere um feito. 💀_`
                    });
                    activeGames.delete(from);
                    return true;
                }

                // Jogo continua
                await sock.sendMessage(from, {
                    text: `❌⭕ *JOGO DA VELHA*\n\n🤖 Joguei na posição ${botMove + 1}.\n\n${renderBoard(game.board)}\n\nSua vez, @${game.player1.split('@')[0]}! (1-9)`,
                    mentions: [game.player1]
                });
                return true;
            }

            // Modo 2 jogadores: alterna turno
            game.turn = game.turn === 'X' ? 'O' : 'X';
            const nextPlayer = game.turn === 'X' ? game.player1 : game.player2;
            await sock.sendMessage(from, {
                text: `❌⭕ *JOGO DA VELHA*\n\n${renderBoard(game.board)}\n\nVez de: @${nextPlayer.split('@')[0]} *(${game.turn})*\nDigita o número (1-9):`,
                mentions: [nextPlayer]
            });
            return true;
        }

        return false;
    }
};

// ── Lógica do bot (minimax simplificado) ──
function getBotMove(board) {
    // 1. Tenta vencer
    for (let i = 0; i < 9; i++) {
        if (board[i] === ' ') {
            board[i] = 'O';
            if (checkWinner(board)) { board[i] = ' '; return i; }
            board[i] = ' ';
        }
    }
    // 2. Bloqueia jogador
    for (let i = 0; i < 9; i++) {
        if (board[i] === ' ') {
            board[i] = 'X';
            if (checkWinner(board)) { board[i] = ' '; return i; }
            board[i] = ' ';
        }
    }
    // 3. Centro
    if (board[4] === ' ') return 4;
    // 4. Cantos
    const corners = [0, 2, 6, 8].filter(i => board[i] === ' ');
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    // 5. Qualquer vazio
    return board.findIndex(v => v === ' ');
}

function checkWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of lines) {
        if (board[a] !== ' ' && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function renderBoard(b) {
    return `┏━━━┳━━━┳━━━┓\n┃ ${fmt(b[0],1)} ┃ ${fmt(b[1],2)} ┃ ${fmt(b[2],3)} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${fmt(b[3],4)} ┃ ${fmt(b[4],5)} ┃ ${fmt(b[5],6)} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${fmt(b[6],7)} ┃ ${fmt(b[7],8)} ┃ ${fmt(b[8],9)} ┃\n┗━━━┻━━━┻━━━┛`;
}

function fmt(val, num) {
    if (val === 'X') return '❌';
    if (val === 'O') return '⭕';
    return num;
}
