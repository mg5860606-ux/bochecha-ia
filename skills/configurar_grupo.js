const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "configurar_grupo",
            description: "Altera as configurações do grupo (fechar para admins ou abrir para todos).",
            parameters: {
                type: "object",
                properties: {
                    estado: {
                        type: "string",
                        enum: ["aberto", "fechado"],
                        description: "Defina 'fechado' para apenas admins falarem ou 'aberto' para todos."
                    }
                },
                required: ["estado"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        // Fallback para comando direto: /configurar_grupo <aberto|fechado>
        if (!args.estado) {
            const texto = (args.texto || args.alvo || '').trim().toLowerCase();
            if (texto === 'aberto' || texto === 'open') args.estado = 'aberto';
            else if (texto === 'fechado' || texto === 'closed') args.estado = 'fechado';
            else return "❌ Use: /configurar_grupo aberto | /configurar_grupo fechado";
        }

        try {
            const setting = args.estado === "aberto" ? "not_announcement" : "announcement";
            console.log(chalk.yellow(`[⚙️ GRUPO] Alterando para ${args.estado}`));
            await sock.groupSettingUpdate(from, setting);
            return `O grupo foi ${args.estado === "aberto" ? 'aberto para todos os membros' : 'fechado para apenas administradores'} com sucesso.`;
        } catch (e) {
            return `Erro ao alterar configuração: Verifique se eu sou administradora do grupo.`;
        }
    }
};
