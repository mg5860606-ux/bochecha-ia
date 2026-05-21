module.exports = {
    definition: {
        function: {
            name: "unmute",
            description: "Desmuta o grupo (todos falam).",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from }) {
        try {
            await sock.groupSettingUpdate(from, 'not_announcement');
            return "Grupo desmutado com sucesso. Informe no chat que o grupo foi aberto para todos.";
        } catch (e) {
            return `Erro ao desmutar o grupo: ${e.message}. Avise ao usuário que o bot precisa ser um administrador.`;
        }
    }
};
