module.exports = {
    definition: {
        function: {
            name: "roleta_russa",
            description: "Um jogo de sorte perigoso onde o bot sorteia se o usuário sobrevive ou leva um 'tiro' virtual.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        // Chance de 1 em 6 de morrer
        const tiro = Math.floor(Math.random() * 6) + 1;
        const morreu = (tiro === 1);
        
        let msg = `🔫 *ROLETA RUSSA* 🔫\n\n`;
        msg += `@${sender.split('@')[0]} girou o tambor, engatilhou a arma na cabeça e puxou o gatilho...\n\n`;
        
        if (morreu) {
            msg += `💥 *BAM!* Você levou um tiro na cabeça! 😵💀`;
        } else {
            msg += `💨 *Click.* Foi por pouco... não tinha bala. Você sobreviveu dessa vez! 😮‍💨`;
        }
        
        await sock.sendMessage(from, { text: msg, mentions: [sender] });
        return `O resultado da roleta russa foi: ${morreu ? "MORTO" : "VIVO"}.`;
    }
};
