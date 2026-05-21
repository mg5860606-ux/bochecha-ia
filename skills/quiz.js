module.exports = {
    definition: {
        function: {
            name: "quiz",
            description: "Inicia um jogo de perguntas e respostas (Quiz/Curiosidades) com o usuário.",
            parameters: {
                type: "object",
                properties: {
                    dificuldade: {
                        type: "string",
                        enum: ["facil", "medio", "dificil"],
                        description: "A dificuldade desejada pelo usuário."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        // A IA (Gemini) vai atuar como o Mestre do Jogo!
        return `O usuário pediu um QUIZ de conhecimentos gerais nível ${args.dificuldade || "aleatório"}. GERE VOCÊ MESMO UMA pergunta super interessante agora com 4 alternativas (A, B, C, D), mas NÃO dê a resposta. O usuário responderá na próxima mensagem. Assuma o papel de um apresentador de Game Show! Lembre-se mentalmente da resposta para validar quando ele responder.`;
    }
};
