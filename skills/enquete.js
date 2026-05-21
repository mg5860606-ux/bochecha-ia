module.exports = {
    definition: {
        function: {
            name: "enquete",
            description: "Cria uma enquete interativa com opções clicáveis no grupo.",
            parameters: {
                type: "object",
                properties: {
                    pergunta: { type: "string", description: "O título ou pergunta da enquete." },
                    opcoes: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Lista de opções para votação." 
                    }
                },
                required: ["pergunta", "opcoes"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (args.opcoes.length < 2) return "❌ Você precisa de pelo menos 2 opções para criar uma enquete!";
        if (args.opcoes.length > 12) return "❌ O limite máximo é de 12 opções.";

        try {
            await sock.sendMessage(from, {
                poll: {
                    name: args.pergunta,
                    values: args.opcoes,
                    selectableCount: 1 // Apenas um voto por pessoa
                }
            });
            return "Enquete criada com sucesso!";
        } catch (e) {
            return `❌ Erro ao criar enquete: ${e.message}`;
        }
    }
};
