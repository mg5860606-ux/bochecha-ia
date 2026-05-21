module.exports = {
    definition: {
        function: {
            name: "mute",
            description: "Muta o grupo (apenas admins falam).",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from }) {
        try {
            await sock.groupSettingUpdate(from, 'announcement');
            return "Grupo mutado com sucesso. Informe no grupo que ele foi fechado e apenas Admins podem falar.";
        } catch (e) {
            return `Erro ao mutar o grupo: ${e.message}. Avise ao usuário que o bot precisa ser um administrador.`;
        }
    }
};
