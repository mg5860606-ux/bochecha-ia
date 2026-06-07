module.exports = {
    definition: {
        function: {
            name: "gerenciar_grupo",
            description: "Permite alterar TODAS as configurações do grupo: Nome, Descrição, Link, Foto, Privacidade (abrir/fechar), Mensagens Temporárias e Aprovação de Pedidos. O bot deve ser admin.",
            parameters: {
                type: "object",
                properties: {
                    acao: { 
                        type: "string", 
                        enum: [
                            "nome", "descricao", "link", "redefinir_link", "foto", "info",
                            "fechar_grupo", "abrir_grupo", "bloquear_info", "desbloquear_info",
                            "mensagens_temporarias", "aceitar_pedidos", "rejeitar_pedidos"
                        ], 
                        description: "A ação administrativa a ser realizada." 
                    },
                    valor: { 
                        type: "string", 
                        description: "O novo nome/descrição, ou o tempo em horas para mensagens temporárias (ex: 24, 168, 2160, ou 0 para desligar)." 
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "❌ Este comando só funciona dentro de grupos.";

        // Fallback para comando direto: /gerenciar_grupo <acao> [valor]
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();
            if (texto) {
                const partes = texto.split(' ');
                args.acao = partes[0].toLowerCase();
                if (partes.length > 1) args.valor = partes.slice(1).join(' ');
            }
        }

        if (!args.acao) return "❌ Informe a ação. Ex: /gerenciar_grupo fechar_grupo | nome Novo Nome | link | info";

        try {
            switch (args.acao) {
                case "nome":
                    if (!args.valor) return "❌ Informe o novo nome do grupo.";
                    await sock.groupUpdateSubject(from, args.valor);
                    return `✅ Nome do grupo alterado para: *${args.valor}*`;

                case "descricao":
                    if (!args.valor) return "❌ Informe a nova descrição.";
                    await sock.groupUpdateDescription(from, args.valor);
                    return "✅ Descrição do grupo atualizada com sucesso!";

                case "link":
                    const code = await sock.groupInviteCode(from);
                    return `🔗 *LINK DO GRUPO:*\nhttps://chat.whatsapp.com/${code}`;

                case "redefinir_link":
                    await sock.groupRevokeInvite(from);
                    const newCode = await sock.groupInviteCode(from);
                    return `♻️ *LINK REDEFINIDO!*\nNovo Link: https://chat.whatsapp.com/${newCode}`;

                case "foto":
                    let msgObj = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!msgObj || !msgObj.imageMessage) return "❌ Responda a uma foto pedindo para mudar a foto do grupo.";
                    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                    const stream = await downloadContentFromMessage(msgObj.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    await sock.updateProfilePicture(from, buffer);
                    return "✅ Foto do grupo alterada com sucesso!";

                case "info":
                    const metadata = await sock.groupMetadata(from);
                    return `ℹ️ *INFO DO GRUPO*\n\n*Nome:* ${metadata.subject}\n*Membros:* ${metadata.participants.length}\n*Dono:* @${metadata.owner?.split('@')[0]}\n*Criação:* ${new Date(metadata.creation * 1000).toLocaleString('pt-BR')}\n*Descrição:* ${metadata.desc || 'Sem descrição'}`;

                case "fechar_grupo":
                    await sock.groupSettingUpdate(from, 'announcement');
                    return "🔒 *Grupo fechado.* Apenas administradores podem enviar mensagens.";

                case "abrir_grupo":
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    return "🔓 *Grupo aberto.* Todos os participantes podem enviar mensagens.";

                case "bloquear_info":
                    await sock.groupSettingUpdate(from, 'locked');
                    return "🔐 *Edição bloqueada.* Apenas administradores podem alterar os dados do grupo.";

                case "desbloquear_info":
                    await sock.groupSettingUpdate(from, 'unlocked');
                    return "🔓 *Edição desbloqueada.* Qualquer participante pode alterar os dados do grupo.";

                case "mensagens_temporarias":
                    let horas = parseInt(args.valor);
                    let segundos = 0;
                    if (horas === 24) segundos = 86400;
                    else if (horas === 168 || horas === 7) segundos = 604800; // 7 dias
                    else if (horas === 2160 || horas === 90) segundos = 7776000; // 90 dias
                    else if (horas === 0) segundos = 0; // Desativar
                    else return "❌ Informe um valor válido para mensagens temporárias: 24, 168 (7 dias), 2160 (90 dias) ou 0 para desligar.";
                    
                    await sock.groupToggleEphemeral(from, segundos);
                    if (segundos === 0) return "✅ Mensagens temporárias *desativadas*.";
                    return `✅ Mensagens temporárias ativadas para expirar em *${horas > 90 ? horas/24 : horas} dias*.`;

                case "aceitar_pedidos":
                    const requestsToApprove = await sock.groupRequestParticipantsList(from);
                    if (!requestsToApprove || requestsToApprove.length === 0) return "✅ Nenhum pedido de entrada pendente.";
                    const jidsToApprove = requestsToApprove.map(r => r.jid);
                    await sock.groupRequestParticipantsUpdate(from, jidsToApprove, 'approve');
                    return `✅ Foram aceitos *${jidsToApprove.length}* membros pendentes no grupo!`;

                case "rejeitar_pedidos":
                    const requestsToReject = await sock.groupRequestParticipantsList(from);
                    if (!requestsToReject || requestsToReject.length === 0) return "✅ Nenhum pedido de entrada pendente.";
                    const jidsToReject = requestsToReject.map(r => r.jid);
                    await sock.groupRequestParticipantsUpdate(from, jidsToReject, 'reject');
                    return `✅ Foram rejeitados *${jidsToReject.length}* pedidos pendentes.`;

                default:
                    return "❌ Ação desconhecida.";
            }
        } catch (e) {
            return `❌ Erro ao gerenciar grupo: ${e.message}. (O bot precisa ser administrador para executar esta ação).`;
        }
    }
};
