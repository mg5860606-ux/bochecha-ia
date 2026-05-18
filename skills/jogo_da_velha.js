const fs = require('fs');
const path = require('path');

// Usa o games_controller para guardar estado em memória (interceptado antes da IA)
let gamesController;
try { gamesController = require('./games_controller'); } catch {}

module.exports = {
    definition: {
        function: {
            name: "jogo_da_velha",
            description: "Inicia um Jogo da Velha entre dois jogadores ou contra o bot. Use /velha @usuario para desafiar alguém.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["iniciar", "jogada", "desistir"], description: "Ação" },
                    linha: { type: "number", description: "Linha (0-2)" },
                    coluna: { type: "number", description: "Coluna (0-2)" }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        const raw = (args.texto || args.alvo || '').trim();

        // ── MODO COMANDO DIRETO ──
        // /velha           → jogo solo contra o bot
        // /velha @usuario  → desafio 2 jogadores
        // /velha desistir  → abandona jogo ativo
        if (!args.acao) {
            const low = raw.toLowerCase();

            if (low === 'desistir' || low === 'sair' || low === 'cancelar') {
                if (gamesController?.activeGames?.has(from)) {
                    gamesController.activeGames.delete(from);
                    return `🏳️ *${pushname}* desistiu do jogo da velha! 💀`;
                }
                return "❌ Nenhum jogo ativo pra desistir.";
            }

            // Verifica se já tem jogo ativo
            if (gamesController?.activeGames?.has(from)) {
                const g = gamesController.activeGames.get(from);
                return `⚠️ Já tem um jogo ativo!\n\n${renderBoard(g.board)}\n\nVez de: @${(g.turn === 'X' ? g.player1 : g.player2).split('@')[0]}\n\nDigita um número de 1-9 pra jogar ou /velha desistir.`;
            }

            // Verifica menções para 2 jogadores
            const mentioned = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            const opponent = mentioned && mentioned[0] ? mentioned[0] : null;

            const board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];

            if (opponent && opponent !== sender) {
                // 2 jogadores
                if (gamesController) {
                    gamesController.activeGames.set(from, {
                        type: 'velha',
                        board,
                        turn: 'X',
                        player1: sender,      // X
                        player2: opponent,    // O
                        vsBot: false
                    });
                }
                await sock.sendMessage(from, {
                    text: `❌⭕ *JOGO DA VELHA* ❌⭕\n\n🆚 @${sender.split('@')[0]} *(X)* vs @${opponent.split('@')[0]} *(O)*\n\n${renderBoard(board)}\n\n${renderGuia()}\n\nVez de: @${sender.split('@')[0]} *(X)*\nDigita o número da posição (1-9)!`,
                    mentions: [sender, opponent]
                });
                return "Jogo iniciado!";
            } else {
                // Solo contra o bot
                if (gamesController) {
                    gamesController.activeGames.set(from, {
                        type: 'velha',
                        board,
                        turn: 'X',
                        player1: sender,
                        player2: 'BOT',
                        vsBot: true
                    });
                }
                await sock.sendMessage(from, {
                    text: `❌⭕ *JOGO DA VELHA* ❌⭕\n\n🤖 @${sender.split('@')[0]} *(X)* vs *BOCHECHA (O)*\n\n${renderBoard(board)}\n\n${renderGuia()}\n\nSua vez! Digita o número (1-9):`,
                    mentions: [sender]
                });
                return "Jogo iniciado!";
            }
        }

        // ── MODO IA (compatibilidade antiga) ──
        if (args.acao === 'desistir') {
            gamesController?.activeGames?.delete(from);
            return "🏳️ Jogo encerrado.";
        }

        if (args.acao === 'iniciar') {
            const board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
            if (gamesController) {
                gamesController.activeGames.set(from, {
                    type: 'velha', board, turn: 'X',
                    player1: sender, player2: 'BOT', vsBot: true
                });
            }
            await sock.sendMessage(from, {
                text: `❌⭕ *JOGO DA VELHA*\n\n${renderBoard(board)}\n\n${renderGuia()}\n\nDigita o número da posição (1-9):`,
                mentions: [sender]
            });
            return "Jogo da velha iniciado!";
        }
    }
};

function renderBoard(b) {
    return `┏━━━┳━━━┳━━━┓\n┃ ${fmt(b[0],1)} ┃ ${fmt(b[1],2)} ┃ ${fmt(b[2],3)} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${fmt(b[3],4)} ┃ ${fmt(b[4],5)} ┃ ${fmt(b[5],6)} ┃\n┣━━━╋━━━╋━━━┫\n┃ ${fmt(b[6],7)} ┃ ${fmt(b[7],8)} ┃ ${fmt(b[8],9)} ┃\n┗━━━┻━━━┻━━━┛`;
}

function fmt(val, num) {
    if (val === 'X') return '❌';
    if (val === 'O') return '⭕';
    return num;
}

function renderGuia() {
    return `📌 *Posições:*\n┌1┬2┬3┐\n├4┼5┼6┤\n└7┴8┴9┘`;
}
