module.exports = {
    definition: {
        function: {
            name: "verdade_desafio",
            description: "Inicia uma rodada de verdade ou desafio. O bot deve usar essa ferramenta para processar a escolha do usuário.",
            parameters: {
                type: "object",
                properties: {
                    escolha: {
                        type: "string",
                        enum: ["verdade", "desafio"],
                        description: "O que o usuário escolheu."
                    }
                },
                required: ["escolha"]
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        // A magia aqui é que a IA (Gemini) vai ler este retorno e gerar a pergunta
        // de forma super criativa e dinâmica direto na conversa, sem precisar de mensagens estáticas!
        return `O usuário @${sender.split('@')[0]} escolheu ${args.escolha.toUpperCase()}. Como IA do bot Bochecha, GERE VOCÊ MESMO UMA ${args.escolha} criativa, ousada e muito divertida para ele responder ou fazer agora no chat do WhatsApp! Não use listas pré-programadas, invente algo novo agora!`;
    }
};
