module.exports = {
    definition: {
        function: {
            name: "antidemote",
            description: "Ativa ou desativa o antidemote no grupo.",
            parameters: {
                type: "object",
                properties: {
                    texto: { type: "string", description: "on para ativar, off para desativar." }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, { sock, from, isOwner, message }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";
        
        const sender = message.key.participant || message.key.remoteJid;
        let isGroupAdmins = false;
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const admins = participants.filter(p => p.admin !== null).map(p => p.id);
            isGroupAdmins = admins.includes(sender);
        } catch (e) {}

        if (!isGroupAdmins && !isOwner) {
            return "❌ Apenas administradores do grupo ou o Arquiteto podem usar este comando.";
        }

        const input = (args.texto || "").trim().toLowerCase();
        let estado = false;
        if (input === "on" || input === "ativar" || input === "true" || input === "1" || input === "sim") {
            estado = true;
        } else if (input === "off" || input === "desativar" || input === "false" || input === "0" || input === "não") {
            estado = false;
        } else {
            return "Use: */antidemote on* ou */antidemote off*";
        }

        const storage = global.storage || require("../sansekai").storage;
        await storage.updateGroupSecurity(from, "antidemote", estado);

        const status = estado ? "ATIVADO ✅ (Bochecha detectará rebaixamentos não autorizados!)" : "DESATIVADO ❌";
        await sock.sendMessage(from, { text: `🛡️ Proteção *ANTIDEMOTE* atualizada!\n\nEstado: ${status}` });
        return `O antidemote foi configurado para ${estado}.`;
    }
};
