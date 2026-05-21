module.exports = {
    definition: {
        function: {
            name: "jogar_moeda",
            description: "Joga uma moeda virtual (Cara ou Coroa) no chat e retorna o resultado.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, { sock, from }) {
        const resultado = Math.random() < 0.5 ? "Cara" : "Coroa";
        const emoji = resultado === "Cara" ? "👦" : "👑";
        
        await sock.sendMessage(from, { text: `🪙 Jogando a moeda pra cima...\n\nE o resultado é: *${resultado}* ${emoji}` });
        return `O resultado da moeda foi ${resultado}. Você pode avisar ao usuário ou zoar ele se ele apostou errado.`;
    }
};
