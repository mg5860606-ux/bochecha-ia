const { activeGames } = require('./games_controller');

module.exports = {
    definition: {
        function: {
            name: "velha",
            description: "Inicia um jogo da velha contra outro membro do grupo.",
            parameters: {
                type: "object",
                properties: {
                    oponente: { 
                        type: "string", 
                        description: "Menção do oponente (@usuario)." 
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, sender, message }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return "❌ Você precisa mencionar alguém para jogar! Ex: /velha @usuario";
        }

        const oponente = mentioned[0];
        if (oponente === sender) return "❌ Você não pode jogar contra si mesmo!";

        // Inicializa o jogo
        activeGames.set(from, {
            type: 'velha',
            player1: sender, // X
            player2: oponente, // O
            turn: 'X',
            board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
        });

        const text = `🎮 *JOGO DA VELHA INICIADO!*\n\n❌ *Jogador 1:* @${sender.split('@')[0]}\n⭕ *Jogador 2:* @${oponente.split('@')[0]}\n\n*COMO JOGAR:*\nDigite um número de *1 a 9* correspondente à posição no tabuleiro.\n\n┏━━━┳━━━┳━━━┓\n┃ 1 ┃ 2 ┃ 3 ┃\n┣━━━╋━━━╋━━━┫\n┃ 4 ┃ 5 ┃ 6 ┃\n┣━━━╋━━━╋━━━┫\n┃ 7 ┃ 8 ┃ 9 ┃\n┗━━━┻━━━┻━━━┛\n\nVez de: @${sender.split('@')[0]}`;

        await sock.sendMessage(from, { text, mentions: [sender, oponente] });
        return "Jogo da velha iniciado.";
    }
};
