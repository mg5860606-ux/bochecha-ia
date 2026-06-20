module.exports = {
    definition: {
        function: {
            name: "mute",
            description: "Muta o grupo (apenas admins falam). Só funciona se quem pedir for administrador do grupo ou o dono do bot.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        if (!isOwner && !isGroupAdmins) {
            return "❌ Só administrador do grupo pode mutar. Conhece teu lugar, vacilão! 💀";
        }

        try {
            await sock.groupSettingUpdate(from, 'announcement');
            return "Grupo mutado com sucesso. Informe no grupo que ele foi fechado e apenas Admins podem falar.";
        } catch (e) {
            return `Erro ao mutar o grupo: ${e.message}. Avise ao usuário que o bot precisa ser um administrador.`;
        }
    }
};
