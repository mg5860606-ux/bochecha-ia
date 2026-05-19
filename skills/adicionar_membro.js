const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "adicionar_membro",
            description: "Adiciona um novo membro ao grupo pelo número de telefone. Só funciona em grupos e se o bot for administrador.",
            parameters: {
                type: "object",
                properties: {
                    mencao: {
                        type: "string",
                        description: "O número de telefone da pessoa a ser adicionada (ex: 5511993948484 ou @5511993948484)"
                    }
                },
                required: ["mencao"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "❌ Este comando só funciona em grupos.";

        if (!args.mencao) {
            return "❌ Por favor, forneça o número da pessoa a ser adicionada.";
        }

        const cleanInput = args.mencao.replace(/[^0-9]/g, '');
        const target = `${cleanInput}@s.whatsapp.net`;

        try {
            console.log(chalk.green(`[➕ ADD] Tentando adicionar: ${target}`));
            const response = await sock.groupParticipantsUpdate(from, [target], "add");
            const status = response?.[0]?.status;

            if (status === '200' || status === 200 || !status) {
                return `✅ Membro @${cleanInput} adicionado com sucesso ao grupo!`;
            } else if (status === '403' || status === 403) {
                // Configuração de privacidade ativa no celular do usuário: envia convite no PV
                try {
                    const inviteCode = await sock.groupInviteCode(from);
                    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
                    await sock.sendMessage(target, { 
                        text: `Qual é @${cleanInput}! Tentei te adicionar no grupo, mas sua privacidade barrou. Segue o link de convite para você entrar de boa: ${inviteLink} 🛸🥀` 
                    });
                    return `⚠️ O usuário @${cleanInput} possui privacidade ativa que impede adicioná-lo diretamente, mas já mandei o link de convite no privado dele! 😉`;
                } catch (inviteErr) {
                    return `⚠️ O usuário @${cleanInput} possui privacidade ativa que impede adicioná-lo diretamente. (Não consegui gerar o link de convite do grupo).`;
                }
            } else if (status === '409' || status === 409) {
                return `⚠️ O usuário @${cleanInput} já está no grupo!`;
            } else {
                return `❌ Erro ao adicionar @${cleanInput}. Status do WhatsApp: ${status}.`;
            }
        } catch (e) {
            console.error(e);
            return `❌ Erro ao adicionar membro: Certifique-se de que eu sou administradora do grupo para poder adicionar pessoas.`;
        }
    }
};
