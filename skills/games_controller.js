const fs = require('fs');
const path = require('path');

// Memória temporária para jogos ativos
const activeGames = new Map();

module.exports = {
    activeGames,
    
    // Processa uma mensagem para ver se é uma jogada
    processMove: async (sock, from, sender, body) => {
        if (!activeGames.has(from)) return false;

        const game = activeGames.get(from);
        
        // --- JOGO DA VELHA ---
        if (game.type === 'velha') {
            const move = parseInt(body);
            if (isNaN(move) || move < 1 || move > 9) return false; // Não é uma jogada válida

            if (game.board[move - 1] !== ' ') {
                await sock.sendMessage(from, { text: "❌ Essa posição já está ocupada!" });
                return true;
            }

            // Verifica se é a vez do jogador
            const currentPlayer = game.turn === 'X' ? game.player1 : game.player2;
            if (sender !== currentPlayer) {
                // await sock.sendMessage(from, { text: "⏳ Não é sua vez!" });
                return true; 
            }

            // Faz a jogada
            game.board[move - 1] = game.turn;
            game.turn = game.turn === 'X' ? 'O' : 'X';

            // Verifica vencedor
            const winPatterns = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontais
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticais
                [0, 4, 8], [2, 4, 6]             // Diagonais
            ];

            let winner = null;
            for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                if (game.board[a] !== ' ' && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                    winner = game.board[a];
                    break;
                }
            }

            const draw = !game.board.includes(' ') && !winner;

            // Renderiza tabuleiro
            const renderBoard = () => {
                let b = game.board;
                return `┏━━━┳━━━┳━━━┓\n┃ ${b[0]} ┃ ${b[1]} ┃ ${b[2]} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${b[3]} ┃ ${b[4]} ┃ ${b[5]} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${b[6]} ┃ ${b[7]} ┃ ${b[8]} ┃\n┗━━━┻━━━┻━━━┛`;
            };

            if (winner) {
                const winnerJid = winner === 'X' ? game.player1 : game.player2;
                await sock.sendMessage(from, { text: `🎉 *PARABÉNS!* @${winnerJid.split('@')[0]} venceu o Jogo da Velha!\n\n${renderBoard()}`, mentions: [winnerJid] });
                activeGames.delete(from);
            } else if (draw) {
                await sock.sendMessage(from, { text: `🤝 *EMPATE!* O jogo terminou em velha.\n\n${renderBoard()}` });
                activeGames.delete(from);
            } else {
                const nextPlayer = game.turn === 'X' ? game.player1 : game.player2;
                await sock.sendMessage(from, { text: `🎮 *JOGO DA VELHA*\n\nVez de: @${nextPlayer.split('@')[0]}\n\n${renderBoard()}`, mentions: [nextPlayer] });
            }
            return true;
        }

        return false;
    }
};
