module.exports = {
    definition: {
        function: {
            name: "criar_enquete",
            description: "Cria uma enquete nativa no WhatsApp para o grupo votar.",
            parameters: {
                type: "object",
                properties: {
                    pergunta: {
                        type: "string",
                        description: "A pergunta principal da enquete."
                    },
                    opcoes: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de opções para as pessoas votarem (máximo 12 opções)."
                    },
                    multipla_escolha: {
                        type: "boolean",
                        description: "Se os usuários podem votar em mais de uma opção (padrão: false)."
                    }
                },
                required: ["pergunta", "opcoes"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.opcoes || args.opcoes.length < 2) {
            return "Avise ao usuário que uma enquete precisa de pelo menos 2 opções para funcionar.";
        }
        
        try {
            await sock.sendMessage(from, {
                poll: {
                    name: args.pergunta,
                    values: args.opcoes.slice(0, 12),
                    selectableCount: args.multipla_escolha ? 0 : 1
                }
            });
            return "Enquete criada e enviada com sucesso no grupo.";
        } catch (e) {
            return `Erro ao criar enquete: ${e.message}`;
        }
    }
};
