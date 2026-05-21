const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "casar",
            description: "Propõe casamento a outro membro do grupo ou aceita uma proposta pendente.",
            parameters: {
                type: "object",
                properties: {
                    alvo: {
                        type: "string",
                        description: "O JID ou menção do contato com quem deseja se casar."
                    },
                    opcao: {
                        type: "string",
                        description: "Opção como 'aceitar' ou 'sim' para aprovar a proposta."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ Casamentos legítimos só podem ser firmados em grupos público-profanos!";

        const storage = global.storage;
        const dbPath = path.join(__dirname, 'database_marry.json');

        // Determina o alvo (por menção, marcação ou argumento)
        let target = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
        if (!target && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        const cleanSender = sender.split('@')[0];

        // Inicializa a memória global de propostas pendentes
        if (!global.pendingMarriages) global.pendingMarriages = new Map();
        const marriageKey = `${from}-${sender}`; // chave baseada no desafiado/alvo que deve aceitar

        // 1. ACEITAR CASAMENTO PENDENTE
        const opt = (args.opcao || args.texto || "").trim().toLowerCase();
        if (opt === "aceitar" || opt === "sim" || args.alvo === "aceitar") {
            // Procura se há alguma proposta pendente onde o sender atual é o alvo
            let challenger = null;
            for (const [key, value] of global.pendingMarriages.entries()) {
                if (key.startsWith(from + "-") && value.target === sender) {
                    challenger = value.challenger;
                    global.pendingMarriages.delete(key);
                    break;
                }
            }

            if (!challenger) {
                return "❌ Ninguém te pediu em casamento recentemente aqui, emocionado(a)!";
            }

            const cleanChallenger = challenger.split('@')[0];

            try {
                const marryDb = await storage.read(dbPath, {});
                
                // Salva o casamento mútuo
                marryDb[sender] = challenger;
                marryDb[challenger] = sender;
                await storage.write(dbPath, marryDb);

                return `🎉💍 *UNIDOS NO SUBMUNDO!* 💍🎉\n\n@${cleanSender} aceitou a mão de @${cleanChallenger}!\n\nVocês estão oficialmente *CASADOS*! O Bochecha abençoa esta união profana. Que dure até que a morte (ou o divórcio forçado com pensão alimentícia de 50%) os separe! 🥀❤️\n\n_As economias de vocês agora correm sério risco!_`;
            } catch (e) {
                console.error(e);
                return `❌ Erro ao registrar matrimônio: ${e.message}`;
            }
        }

        if (!target) {
            return "❌ Você precisa marcar (@número) ou responder à mensagem de quem você deseja pedir em casamento!";
        }

        if (target === sender) {
            return "❌ Você não pode se casar consigo mesmo, narcisista do caralho! Procure um amor real.";
        }

        const cleanTarget = target.split('@')[0];

        try {
            const marryDb = await storage.read(dbPath, {});

            // Verifica se o solicitante já está casado
            if (marryDb[sender]) {
                const partner = marryDb[sender].split('@')[0];
                return `🚨 *INFIDELIDADE DETECTADA!* 🚨\n\nVocê já é casado com @${partner}! Resolva seu divórcio antes de tentar dar o golpe em outra pessoa!`;
            }

            // Verifica se o alvo já está casado
            if (marryDb[target]) {
                const partner = marryDb[target].split('@')[0];
                return `❌ Acesso Negado! @${cleanTarget} já é casado(a) com @${partner}. Respeite o lar alheio!`;
            }

            // Lança a proposta pendente
            const proposalKey = `${from}-${target}`; // O alvo precisa responder
            global.pendingMarriages.set(proposalKey, { challenger: sender, target, time: Date.now() });

            // Expira em 60 segundos
            setTimeout(() => {
                if (global.pendingMarriages.has(proposalKey)) {
                    global.pendingMarriages.delete(proposalKey);
                }
            }, 60000);

            return `💍 *PROPOSTA DE CASAMENTO LANÇADA!* 💍\n\n@${cleanSender} pediu solenemente a mão de @${cleanTarget} em casamento!\n\n👉 @${cleanTarget}, responda esta mensagem dizendo *"sim"* ou *"/casar aceitar"* em 60 segundos para declarar seu amor eterno no submundo! 🥀❤️`;

        } catch (e) {
            console.error(e);
            return `❌ Erro ao processar proposta: ${e.message}`;
        }
    }
};
