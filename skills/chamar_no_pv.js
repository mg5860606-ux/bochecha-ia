const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "chamar_no_pv",
            description: "Vai no PV de um membro do grupo e chama ele em nome de quem solicitou (ou do Marcos/Adm), reportando a resposta dele de volta ao grupo.",
            parameters: {
                type: "object",
                properties: {
                    alvo: {
                        type: "string",
                        description: "O número, menção ou nome da pessoa a ser chamada no PV (ex: @5594991855060, @joao, ou 'joao')"
                    }
                },
                required: ["alvo"]
            }
        }
    },
    async execute(args, { sock, from, message, isOwner, pushname }) {
        if (!from.endsWith('@g.us')) {
            return "Aviso: Esse comando só faz sentido se executado dentro de um grupo.";
        }

        const alvoStr = (args.alvo || args.texto || args.alvo || "").trim();
        if (!alvoStr) {
            return "⚠️ Uso correto: `/chamar_no_pv @membro` ou `/chamar_no_pv nome`";
        }

        const resolveTarget = async (input) => {
            if (!input) return "";
            
            const numericOnly = input.replace(/[^0-9]/g, '');
            if (numericOnly.length >= 8) {
                try {
                    const metadata = await sock.groupMetadata(from);
                    const participants = metadata.participants || [];
                    const found = participants.find(p => p.id.split('@')[0] === numericOnly);
                    if (found) return found.id;
                } catch (e) {}
                return `${numericOnly}@s.whatsapp.net`;
            }

            const nameToSearch = input.replace(/^@/, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            if (!nameToSearch) return "";

            try {
                // 1. Tenta buscar no chat_activity.json
                const dbPath = path.join(__dirname, '..', 'learnings', 'chat_activity.json');
                if (fs.existsSync(dbPath)) {
                    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                    const entries = db[from] || [];
                    const matchedEntry = entries.find(e => {
                        const normPush = e.pushname ? e.pushname.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
                        const normUser = e.user ? e.user.split('@')[0] : "";
                        return normPush.includes(nameToSearch) || normUser === nameToSearch;
                    });
                    if (matchedEntry) return matchedEntry.user;
                }
            } catch (e) {}

            try {
                // 2. Busca na lista de participantes do grupo
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];
                for (const p of participants) {
                    const pNum = p.id.split('@')[0];
                    if (pNum === nameToSearch) {
                        return p.id;
                    }
                    const contact = (global.storeRef?.contacts && global.storeRef.contacts[p.id]) || {};
                    const pName = (contact.name || contact.notify || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (pName.includes(nameToSearch)) {
                        return p.id;
                    }
                }
            } catch (e) {}

            return "";
        };

        const targetJid = await resolveTarget(alvoStr);
        if (!targetJid) {
            return `❌ Não consegui encontrar nenhum membro no grupo correspondente a "${alvoStr}". Certifique-se de marcar ou escrever o nome certinho!`;
        }

        const senderJid = message.key.participant || message.key.remoteJid;
        const senderName = pushname || senderJid.split('@')[0];

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const groupName = groupMetadata.subject || "grupo";

            // Mensagem de chamada no PV
            const pvMessage = `📢 *Bochecha Informa:* Salve! O @${senderName.split('@')[0]} (ou adm) mandou eu colar aqui pra te chamar lá no grupo *${groupName}*. Dá um pulo lá!\n\nSe estiver ocupado ou não puder ir, me responde aqui pra eu avisar ele. O que eu digo lá?`;

            // Envia a mensagem no PV do alvo
            await sock.sendMessage(targetJid, { text: pvMessage, mentions: [senderJid] });

            // Salva na memória
            const pendingSummonsFile = path.join(__dirname, '..', 'memory', 'pending_summons.json');
            let pendingSummons = new Map();
            try {
                if (fs.existsSync(pendingSummonsFile)) {
                    pendingSummons = new Map(Object.entries(JSON.parse(fs.readFileSync(pendingSummonsFile, 'utf8'))));
                }
            } catch (e) {}

            pendingSummons.set(targetJid, {
                targetJid,
                targetName: targetJid.split('@')[0],
                originGroupJid: from,
                originGroupName: groupName,
                chamadorJid: senderJid,
                chamadorNome: senderName,
                timestamp: Date.now()
            });

            try {
                const obj = Object.fromEntries(pendingSummons);
                fs.writeFileSync(pendingSummonsFile, JSON.stringify(obj, null, 2));
            } catch (e) {}

            return `blz vou ir la chamar ele`;
        } catch (err) {
            console.error(err);
            return `❌ Erro ao tentar enviar mensagem no PV do membro: ${err.message}`;
        }
    }
};
