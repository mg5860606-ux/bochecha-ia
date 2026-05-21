const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "gerenciar_admin",
            description: "Promove ou rebaixa um membro no cargo de administrador do grupo.",
            parameters: {
                type: "object",
                properties: {
                    mencao: {
                        type: "string",
                        description: "O número ou menção da pessoa (ex: 5594991855060)"
                    },
                    acao: {
                        type: "string",
                        enum: ["promover", "rebaixar"],
                        description: "Ação a ser realizada: promover para admin ou rebaixar para membro comum."
                    }
                },
                required: ["mencao", "acao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        let target = args.mencao.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        // Capturar menção real se houver
        if (message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        try {
            const action = args.acao === "promover" ? "promote" : "demote";
            console.log(chalk.blue(`[👑 ADMIN] ${args.acao}: ${target}`));
            await sock.groupParticipantsUpdate(from, [target], action);
            return `Membro ${target.split('@')[0]} foi ${args.acao === "promover" ? 'promovido a administrador' : 'rebaixado a membro comum'} com sucesso.`;
        } catch (e) {
            return `Erro ao alterar cargo: Verifique se eu sou administradora do grupo.`;
        }
    }
};
