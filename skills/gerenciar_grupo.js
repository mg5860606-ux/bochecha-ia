module.exports = {
    definition: {
        function: {
            name: "gerenciar_grupo",
            description: "Permite alterar configurações do grupo como Nome, Descrição, Link ou Foto. O bot deve ser admin.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["nome", "descricao", "link", "redefinir_link", "foto", "info"], description: "A ação administrativa a ser realizada." },
                    valor: { type: "string", description: "O novo nome ou nova descrição a ser aplicada." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        if (!from.endsWith('@g.us')) return "❌ Este comando só funciona dentro de grupos.";

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
                    // Verifica se o usuário citou uma imagem
                    let msgObj = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!msgObj || !msgObj.imageMessage) return "❌ Responda a uma foto dizendo 'Bochecha, muda a foto do grupo'.";
                    
                    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                    const stream = await downloadContentFromMessage(msgObj.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    
                    await sock.updateProfilePicture(from, buffer);
                    return "✅ Foto do grupo alterada com sucesso!";

                case "info":
                    const metadata = await sock.groupMetadata(from);
                    return `ℹ️ *INFO DO GRUPO*\n\n*Nome:* ${metadata.subject}\n*Membros:* ${metadata.participants.length}\n*Dono:* @${metadata.owner?.split('@')[0]}\n*Criação:* ${new Date(metadata.creation * 1000).toLocaleString('pt-BR')}\n*Descrição:* ${metadata.desc || 'Sem descrição'}`;

                default:
                    return "❌ Ação desconhecida.";
            }
        } catch (e) {
            return `❌ Erro ao gerenciar grupo: ${e.message}. (Verifique se o bot é administrador).`;
        }
    }
};
