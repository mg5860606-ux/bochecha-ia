const chalk = require('chalk');
const { isOwnerNumber } = require('../config');

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
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        // Verifica se quem pediu tem permissão (admin do grupo ou dono)
        if (!isOwner && !isGroupAdmins) {
            return `🚨 Acesso negado! Você não é admin deste grupo. Só admins e o criador Marcos podem promover ou rebaixar membros. 💀`;
        }

        const myNumber = (sock.user?.id || "").replace(/:.*/, "").replace(/@.*/, "");
        const myLid = (sock.authState?.creds?.me?.lid || "").replace(/:.*/, "").replace(/@.*/, "");

        let target = args.mencao.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        const cleanTarget = target.split('@')[0];

        const isTargetOwner = isOwnerNumber(cleanTarget);
        const isTargetMe = cleanTarget === myNumber || (myLid && cleanTarget === myLid);

        if (isTargetOwner) {
            return `🚨 Erro de segurança: Não tenho permissão para alterar o cargo do criador Marcos! 💀`;
        }

        if (isTargetMe && args.acao === "rebaixar") {
            if (!isOwner) {
                return `🚫 Que isso! Não vou me rebaixar não, @${(message.key?.participant || "").split('@')[0]}! Só o Marcos pode decidir isso. kkkkk 😂`;
            }
            // Se for o Marcos pedindo, permite
        }

        try {
            const action = args.acao === "promover" ? "promote" : "demote";
            console.log(chalk.blue(`[👑 ADMIN] ${args.acao}: ${target}`));
            await sock.groupParticipantsUpdate(from, [target], action);
            return `Membro @${cleanTarget} foi ${args.acao === "promover" ? 'promovido a administrador' : 'rebaixado a membro comum'} com sucesso.`;
        } catch (e) {
            return `Erro ao alterar cargo: Verifique se eu sou administradora do grupo.`;
        }
    }
};
