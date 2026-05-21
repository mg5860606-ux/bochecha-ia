module.exports = {
    definition: {
        function: {
            name: "jokenpo",
            description: "Joga Pedra, Papel ou Tesoura (Jokenpô) contra o usuário.",
            parameters: {
                type: "object",
                properties: {
                    escolha_usuario: {
                        type: "string",
                        enum: ["pedra", "papel", "tesoura"],
                        description: "A escolha do usuário."
                    }
                },
                required: ["escolha_usuario"]
            }
        }
    },
    async execute(args, { sock, from }) {
        const opcoes = ["pedra", "papel", "tesoura"];
        const escolhaBot = opcoes[Math.floor(Math.random() * opcoes.length)];
        const escolhaUser = args.escolha_usuario.toLowerCase();
        
        const emojis = { pedra: "✊", papel: "✋", tesoura: "✌️" };
        
        if (!opcoes.includes(escolhaUser)) {
            return "Avise ao usuário que ele precisa escolher apenas entre 'pedra', 'papel' ou 'tesoura'.";
        }
        
        let resultado = "";
        if (escolhaBot === escolhaUser) {
            resultado = "empate";
        } else if (
            (escolhaUser === "pedra" && escolhaBot === "tesoura") ||
            (escolhaUser === "papel" && escolhaBot === "pedra") ||
            (escolhaUser === "tesoura" && escolhaBot === "papel")
        ) {
            resultado = "usuario_venceu";
        } else {
            resultado = "bot_venceu";
        }
        
        let msg = `🎮 *JOKENPÔ* 🎮\n\n`;
        msg += `Você jogou: ${escolhaUser.toUpperCase()} ${emojis[escolhaUser]}\n`;
        msg += `Bochecha jogou: ${escolhaBot.toUpperCase()} ${emojis[escolhaBot]}\n\n`;
        
        if (resultado === "empate") msg += "Empatamos! As mentes brilhantes pensam igual. 😑";
        if (resultado === "usuario_venceu") msg += "Droga, você me venceu dessa vez! 😭";
        if (resultado === "bot_venceu") msg += "HA HA HA! O Bochecha é o campeão invicto! 🤖🏆";
        
        await sock.sendMessage(from, { text: msg });
        return `O jogo terminou. O resultado foi: ${resultado}. Use a emoção apropriada na sua resposta (exulte se ganhou, fique triste se perdeu).`;
    }
};
