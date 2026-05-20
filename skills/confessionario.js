const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "confessionario",
            description: "Envia um segredo ou fofoca de forma 100% anônima para o grupo a partir do PV.",
            parameters: {
                type: "object",
                properties: {
                    mensagem: {
                        type: "string",
                        description: "O segredo ou fofoca que deseja enviar de forma anônima."
                    }
                },
                required: ["mensagem"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, sender, message } = ctx;
        const isGroup = from.endsWith('@g.us');

        // Se for enviado no grupo, alerta o usuário
        if (isGroup) {
            return `🚨 *AVISO DE CRIA:* Para mandar fofoca/segredo *100% anônimo*, você deve mandar o comando no meu chat privado (PV)!\nSe você mandar aqui no grupo, todo mundo vai ver que é você.`;
        }

        let rawArg = (args.mensagem || args.texto || args.arg || "").trim();

        if (args.isCommand) {
            rawArg = (args.arg || "").trim();
        }

        if (!rawArg) {
            return `⚠️ *Uso:* Digite \`/segredo <sua fofoca/segredo>\` para enviar anonimamente no grupo.\n\n*Exemplo:* \`/segredo Acho que o admin do grupo está meio sumido...\``;
        }

        // Tenta abrir o banco de dados de histórico para encontrar grupos compartilhados
        let groupsUserIsIn = [];
        try {
            const historyPath = path.join(__dirname, 'database_history.json');
            if (fs.existsSync(historyPath)) {
                const historyDb = JSON.parse(fs.readFileSync(historyPath, 'utf8') || '{}');
                const userNum = sender.split('@')[0];

                for (const groupJid of Object.keys(historyDb)) {
                    if (groupJid.endsWith('@g.us') && historyDb[groupJid][userNum]) {
                        groupsUserIsIn.push(groupJid);
                    }
                }
            }
        } catch (err) {
            console.error("[Confessionario] Erro ao ler histórico:", err);
        }

        // Se não encontrou no histórico, tenta buscar todos os grupos participantes (se o store/sock permitir)
        if (groupsUserIsIn.length === 0) {
            try {
                const chats = await sock.groupFetchAllParticipating();
                groupsUserIsIn = Object.keys(chats);
            } catch (err) {
                console.error("[Confessionario] Erro ao buscar grupos ativos:", err);
            }
        }

        if (groupsUserIsIn.length === 0) {
            return "❌ Não consegui identificar em qual grupo você está. Por favor, envie pelo menos uma mensagem normal no grupo antes para que eu possa registrar sua presença!";
        }

        // Resolve os nomes de cada grupo JID
        const groupsList = [];
        for (const jid of groupsUserIsIn) {
            try {
                const metadata = await sock.groupMetadata(jid);
                if (metadata && metadata.subject) {
                    groupsList.push({ jid, name: metadata.subject });
                }
            } catch {
                // Silencia falhas se o bot não estiver mais no grupo
            }
        }

        if (groupsList.length === 0) {
            return "❌ Não encontrei nenhum grupo ativo compartilhado com você no momento.";
        }

        let targetJid = "";
        let targetName = "";
        let confessionText = rawArg;

        // Se o usuário está em múltiplos grupos, precisamos saber qual enviar
        if (groupsList.length > 1) {
            if (rawArg.includes('|')) {
                const parts = rawArg.split('|');
                const groupQuery = parts[0].trim().toLowerCase();
                confessionText = parts.slice(1).join('|').trim();

                // Procura grupo correspondente por nome ou JID
                const matches = groupsList.filter(g => g.name.toLowerCase().includes(groupQuery) || g.jid.includes(groupQuery));
                if (matches.length === 1) {
                    targetJid = matches[0].jid;
                    targetName = matches[0].name;
                } else if (matches.length > 1) {
                    let msg = `⚠️ *Múltiplos grupos coincidem com sua busca:* \n\n`;
                    matches.forEach((g, index) => {
                        msg += `${index + 1}. *${g.name}*\n`;
                    });
                    msg += `\nSeja mais específico no nome do grupo. Exemplo: \`/segredo ${matches[0].name} | ${confessionText}\``;
                    return msg;
                } else {
                    return `❌ Nenhum grupo correspondente a "${parts[0].trim()}" foi encontrado. Seus grupos são:\n\n` + 
                           groupsList.map(g => `• *${g.name}*`).join('\n');
                }
            } else {
                let msg = `⚠️ *Você participa de múltiplos grupos onde o Bochecha está ativo!* \n` +
                          `Especifique para qual grupo deseja enviar fofoca usando uma barra vertical (|).\n\n` +
                          `*Formato:* \`/segredo Nome do Grupo | Sua Fofoca\`\n\n` +
                          `*Grupos Disponíveis:*\n`;
                
                groupsList.forEach(g => {
                    msg += `• *${g.name}*\n`;
                });
                return msg;
            }
        } else {
            // Apenas 1 grupo: envia direto
            targetJid = groupsList[0].jid;
            targetName = groupsList[0].name;
        }

        if (!confessionText) {
            return "⚠️ A mensagem do segredo não pode ficar em branco.";
        }

        try {
            // Envia o segredo anonimamente para o grupo de destino
            const report = `🕵️‍♂️ *CONFESSIONÁRIO ANÔNIMO* 🕵️‍♂️\n\n` +
                           `💬 *Fofoca do Submundo:* \n` +
                           `"${confessionText}"\n\n` +
                           `_(Segredo enviado anonimamente no PV do Bochecha)_ 🤫🥀`;

            await sock.sendMessage(targetJid, { text: report });
            
            // Confirma ao remetente no PV
            return `✅ *Fofoca enviada de forma 100% anônima para o grupo "${targetName}"!* Seu nome não foi revelado. 😉🤐`;
        } catch (err) {
            return `❌ Falha ao tentar postar o segredo no grupo: ${err.message}`;
        }
    }
};
