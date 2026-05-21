const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "gerenciar_info_grupo",
            description: "Altera o nome, descrição ou obtém o link de convite do grupo.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["mudar_nome", "mudar_descricao", "pegar_link"],
                        description: "Ação a ser realizada no grupo."
                    },
                    valor: {
                        type: "string",
                        description: "O novo nome ou nova descrição (opcional para 'pegar_link')"
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        try {
            if (args.acao === "pegar_link") {
                const code = await sock.groupInviteCode(from);
                return `Aqui está o link do grupo: https://chat.whatsapp.com/${code}`;
            } else if (args.acao === "mudar_nome") {
                await sock.groupUpdateSubject(from, args.valor);
                return `Nome do grupo alterado para: ${args.valor}`;
            } else if (args.acao === "mudar_descricao") {
                await sock.groupUpdateDescription(from, args.valor);
                return `Descrição do grupo atualizada com sucesso.`;
            }
        } catch (e) {
            return `Erro ao gerenciar grupo: Verifique se eu sou administradora.`;
        }
    }
};
