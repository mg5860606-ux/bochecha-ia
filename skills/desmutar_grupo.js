module.exports = {
    definition: {
        function: {
            name: "unmute",
            description: "Desmuta o grupo (todos falam). Só funciona se quem pedir for administrador do grupo ou o dono do bot.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        if (!isOwner && !isGroupAdmins) {
            return "❌ Só administrador do grupo pode desmutar. Fica quieto, membro! 💀";
        }

        try {
            await sock.groupSettingUpdate(from, 'not_announcement');
            return "Grupo desmutado com sucesso. Informe no chat que o grupo foi aberto para todos.";
        } catch (e) {
            return `Erro ao desmutar o grupo: ${e.message}. Avise ao usuário que o bot precisa ser um administrador.`;
        }
    }
};
