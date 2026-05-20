const fs = require('fs');
const path = require('path');

// Inicializa variáveis globais de estado em memória para a loja se não existirem
if (!global.userImmunity) global.userImmunity = new Map(); // JID -> timestamp expiração
if (!global.userTitles) global.userTitles = new Map(); // JID -> string título
if (!global.userMirror) global.userMirror = new Map(); // JID -> timestamp expiração espelho
if (!global.userNicknames) global.userNicknames = new Map(); // JID -> { nick, expires }

module.exports = {
    definition: {
        function: {
            name: "loja_submundo",
            description: "Acessa a loja do submundo e permite comprar itens com Bochecha-Coins.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["loja", "comprar"],
                        description: "Ação a ser executada: 'loja' para ver a lista de itens ou 'comprar' para adquirir um item."
                    },
                    item: {
                        type: "string",
                        description: "Nome do item a comprar."
                    },
                    argumento: {
                        type: "string",
                        description: "Argumento adicional para a compra (alvo ou texto)."
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, sender, pushname, message } = ctx;
        const storage = global.storage || require("../sansekai").storage;
        const agora = Date.now();

        const isCommand = args.isCommand || false;
        let action = args.acao || "loja";
        let itemToBuy = args.item || "";
        let itemArg = args.argumento || "";

        if (isCommand) {
            action = args.command === "/loja" ? "loja" : "comprar";
            if (action === "comprar") {
                const parts = (args.arg || "").trim().split(" ");
                itemToBuy = parts[0] ? parts[0].toLowerCase() : "";
                itemArg = parts.slice(1).join(" ").trim();
            }
        }

        // 1. VISUALIZAR A LOJA (/loja)
        if (action === "loja") {
            const coins = await storage.addCoins(from, sender, 0);

            const shopText = `🛒 *LOJA DO SUBMUNDO - BOCHECHA-IA* 🛒\n\n` +
                             `👤 *Cliente:* ${pushname}\n` +
                             `🪙 *Seu Saldo:* *${coins} Bochecha-Coins*\n\n` +
                             `*ÍTENS DISPONÍVEIS NO MERCADO:* \n\n` +
                             `1️⃣ *silenciador* - 🪙 *50 Coins*\n` +
                             `   _Muta um membro do grupo por 5 minutos. Qualquer mensagem dele será apagada._\n` +
                             `   👉 Uso: \`/comprar silenciador @user\`\n\n` +
                             `2️⃣ *imunidade* - 🪙 *150 Coins*\n` +
                             `   _Garante imunidade contra mutes por 12 horas._\n` +
                             `   👉 Uso: \`/comprar imunidade\`\n\n` +
                             `3️⃣ *roubo* - 🪙 *30 Coins*\n` +
                             `   _Tenta roubar entre 10 e 100 coins de alguém. Chance de sucesso: 40%._\n` +
                             `   👉 Uso: \`/comprar roubo @user\`\n\n` +
                             `4️⃣ *titulo* - 🪙 *100 Coins*\n` +
                             `   _Altera seu título/cargo customizado no bot (exibido no perfil)._\n` +
                             `   👉 Uso: \`/comprar titulo <seu_titulo_de_cria>\`\n\n` +
                             `5️⃣ *espelho* - 🪙 *80 Coins*\n` +
                             `   _Ativa o Espelho Reverso por 2 horas. Se tentarem te mutar, o silenciador volta contra a própria pessoa!_\n` +
                             `   👉 Uso: \`/comprar espelho\`\n\n` +
                             `6️⃣ *alvara* - 🪙 *70 Coins*\n` +
                             `   _Remove o mute ativo de um membro do grupo imediatamente._\n` +
                             `   👉 Uso: \`/comprar alvara @user\`\n\n` +
                             `7️⃣ *ban_falso* - 🪙 *120 Coins*\n` +
                             `   _Assusta um amigo com um alerta fake do sistema de banimento com contagem regressiva!_\n` +
                             `   👉 Uso: \`/comprar ban_falso @user\`\n\n` +
                             `8️⃣ *apelido* - 🪙 *60 Coins*\n` +
                             `   _Muda o apelido de alguém no bot por 24 horas para zoar._\n` +
                             `   👉 Uso: \`/comprar apelido @user | Apelido Zoado\`\n\n` +
                             `*───────────────────────────────*\n` +
                             `_Para comprar, use o comando: /comprar <item> <alvo/texto>_ 💀🥀`;

            return shopText;
        }

        // 2. COMPRAR ITEM (/comprar <item> <argumento>)
        if (action === "comprar") {
            if (!itemToBuy) {
                return "⚠️ Informe o item que deseja comprar. Exemplo: `/comprar imunidade` ou consulte a `/loja`.";
            }

            const myCoins = await storage.addCoins(from, sender, 0);

            // ITEM 1: SILENCIADOR (50 coins)
            if (itemToBuy === "silenciador") {
                const price = 50;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                // Resolve alvo
                let target = itemArg;
                if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                    target = message.message.extendedTextMessage.contextInfo.participant;
                } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                    target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                }

                if (!target || typeof target !== 'string' || !target.includes('@')) {
                    return "⚠️ Você precisa marcar (@user) ou responder à mensagem do membro que deseja silenciar.";
                }

                if (target === sender) {
                    return "❌ Quer se mutar? Para com isso, cria!";
                }

                // Verifica se o alvo tem Espelho Reverso ativo
                const mirrorTime = global.userMirror.get(target) || 0;
                if (mirrorTime > agora) {
                    global.userMirror.delete(target); // Consome o espelho
                    await storage.addCoins(from, sender, -price);
                    if (!global.mutedUsers) global.mutedUsers = new Map();
                    global.mutedUsers.set(`${from}-${sender}`, agora + 5 * 60 * 1000); // Muta quem tentou mutar

                    return `🔮 *FEITIÇO REVERSO!* 🔮\n\n@${sender.split('@')[0]} tentou usar um silenciador contra @${target.split('@')[0]}, mas a vítima estava com o *Espelho Reverso* ativado!\n\n💥 O feitiço voltou contra o feiticeiro! @${sender.split('@')[0]} foi *MUTADO* por 5 minutos!\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins*`;
                }

                // Verifica se o alvo é imune
                const isImmune = global.userImmunity.get(target) || 0;
                if (isImmune > agora) {
                    const restanteMin = Math.ceil((isImmune - agora) / 60000);
                    return `🛡️ @${target.split('@')[0]} possui a *Carta de Imunidade* ativa! A tentativa de mute falhou miseravelmente. Restam ${restanteMin} minutos de imunidade da vítima.`;
                }

                // Efetua compra e silencia
                await storage.addCoins(from, sender, -price);
                if (!global.mutedUsers) global.mutedUsers = new Map();
                global.mutedUsers.set(`${from}-${target}`, agora + 5 * 60 * 1000); // 5 minutos

                return `🔇 *MUTE DE ECONOMIA ATIVADO!* 🔇\n\n@${sender.split('@')[0]} comprou um *silenciador* e calou a boca de @${target.split('@')[0]} por 5 minutos!\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins* 💀🥀`;
            }

            // ITEM 2: IMUNIDADE (150 coins)
            if (itemToBuy === "imunidade") {
                const price = 150;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                await storage.addCoins(from, sender, -price);
                global.userImmunity.set(sender, agora + 12 * 60 * 60 * 1000); // 12 horas

                return `🛡️ *CARTA DE IMUNIDADE COMPRADA!* 🛡️\n\nParabéns, @${sender.split('@')[0]}! Você está protegido contra qualquer comando de silenciador ou mute por 12 horas!\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins*`;
            }

            // ITEM 3: ROUBO DE COINS (30 coins)
            if (itemToBuy === "roubo") {
                const price = 30;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                // Resolve alvo
                let target = itemArg;
                if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                    target = message.message.extendedTextMessage.contextInfo.participant;
                } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                    target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                }

                if (!target || typeof target !== 'string' || !target.includes('@')) {
                    return "⚠️ Você precisa marcar (@user) ou responder à mensagem de quem deseja roubar.";
                }

                if (target === sender) {
                    return "❌ Auto-roubo? Vai se tratar, parceiro!";
                }

                const targetCoins = await storage.addCoins(from, target, 0);
                if (targetCoins < 20) {
                    return `❌ O alvo @${target.split('@')[0]} é quebrado demais (tem apenas ${targetCoins} coins). Não vale a pena roubá-lo!`;
                }

                // Efetua pagamento da taxa de roubo
                await storage.addCoins(from, sender, -price);

                const success = Math.random() < 0.4; // 40% de chance
                if (success) {
                    const stolenAmt = Math.floor(Math.random() * 91) + 10; // 10 a 100 coins
                    const actualStolen = Math.min(stolenAmt, targetCoins);

                    await storage.addCoins(from, target, -actualStolen);
                    await storage.addCoins(from, sender, actualStolen);

                    return `💰 *ROUBO COM SUCESSO!* 💰\n\n🕵️‍♂️ @${sender.split('@')[0]} invadiu a carteira de @${target.split('@')[0]} e surrupiou *${actualStolen} Bochecha-Coins*!\n🪙 *Seu Novo Saldo:* *${myCoins - price + actualStolen} Bochecha-Coins*`;
                } else {
                    const penalty = 50;
                    await storage.addCoins(from, sender, -penalty);
                    await storage.addCoins(from, target, penalty);

                    return `🚨 *ROUBO FRACASSADO!* 🚨\n\n👮‍♂️ A polícia do submundo pegou @${sender.split('@')[0]} com a mão na botija! Ele foi multado e teve que pagar *${penalty} Bochecha-Coins* diretamente para a vítima @${target.split('@')[0]}!\n🪙 *Seu Novo Saldo:* *${myCoins - price - penalty} Bochecha-Coins* 💀`;
                }
            }

            // ITEM 4: TÍTULO CUSTOMIZADO (100 coins)
            if (itemToBuy === "titulo") {
                const price = 100;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                if (!itemArg) {
                    return "⚠️ Informe o título que deseja comprar. Exemplo: `/comprar titulo Programador de Cria`";
                }

                if (itemArg.length > 30) {
                    return "❌ O título é muito longo! Limite máximo de 30 caracteres.";
                }

                await storage.addCoins(from, sender, -price);
                global.userTitles.set(sender, itemArg);

                return `🏷️ *NOVO TÍTULO CADASTRADO!* 🏷️\n\n@${sender.split('@')[0]} agora é conhecido formalmente como:\n👑 *"${itemArg}"*\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins* 🥀🛸`;
            }

            // ITEM 5: ESPELHO REVERSO (80 coins)
            if (itemToBuy === "espelho") {
                const price = 80;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                await storage.addCoins(from, sender, -price);
                global.userMirror.set(sender, agora + 2 * 60 * 60 * 1000); // 2 horas de espelho

                return `🔮 *ESPELHO REVERSO ATIVADO!* 🔮\n\n@${sender.split('@')[0]} ativou o Espelho Reverso pelas próximas 2 horas!\n👉 Se alguém tentar silenciá-lo, o mute voltará para o atacante!\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins*`;
            }

            // ITEM 6: ALVARÁ DE SOLTURA (70 coins)
            if (itemToBuy === "alvara") {
                const price = 70;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                // Resolve alvo
                let target = itemArg;
                if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                    target = message.message.extendedTextMessage.contextInfo.participant;
                } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                    target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                }

                if (!target || typeof target !== 'string' || !target.includes('@')) {
                    return "⚠️ Você precisa marcar (@user) ou responder à mensagem de quem deseja soltar.";
                }

                const isMuted = global.mutedUsers?.has(`${from}-${target}`);
                if (!isMuted) {
                    return `❌ @${target.split('@')[0]} não está silenciado no grupo.`;
                }

                await storage.addCoins(from, sender, -price);
                global.mutedUsers.delete(`${from}-${target}`);

                return `🔓 *ALVARÁ CONCEDIDO!* 🔓\n\n@${sender.split('@')[0]} comprou um alvará e libertou @${target.split('@')[0]} do mute!\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins* 💀`;
            }

            // ITEM 7: BAN FALSO (120 coins)
            if (itemToBuy === "ban_falso") {
                const price = 120;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                // Resolve alvo
                let target = itemArg;
                if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                    target = message.message.extendedTextMessage.contextInfo.participant;
                } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                    target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                }

                if (!target || typeof target !== 'string' || !target.includes('@')) {
                    return "⚠️ Você precisa marcar (@user) ou responder à mensagem do alvo.";
                }

                await storage.addCoins(from, sender, -price);

                await sock.sendMessage(from, {
                    text: `🚨 *ALERTA DE SEGURANÇA DO SUBMUNDO* 🚨\n\n⚠️ O usuário @${target.split('@')[0]} foi pego violando as diretrizes do Bochecha-IA.\n\n☠️ *BANIMENTO DO GRUPO INICIADO...*\n⏱️ _Desconexão em 10 segundos!_`,
                    mentions: [target]
                });

                setTimeout(async () => {
                    try {
                        await sock.sendMessage(from, {
                            text: `🤪 *BRINCADEIRA DE CRIA!* @${target.split('@')[0]}, seu coração quase parou, né? O banimento era FALSO!\n\n💸 Travessura encomendada por @${sender.split('@')[0]}!`,
                            mentions: [target, sender]
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }, 7000);

                return "";
            }

            // ITEM 8: APELIDO ZOADO (60 coins)
            if (itemToBuy === "apelido") {
                const price = 60;
                if (myCoins < price) {
                    return `❌ Moedas insuficientes! Você precisa de ${price} Bochecha-Coins para comprar este item.`;
                }

                let target = "";
                let newNick = "";

                if (itemArg.includes('|')) {
                    const parts = itemArg.split('|');
                    const mentionPart = parts[0].trim();
                    newNick = parts.slice(1).join('|').trim();

                    if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                        target = message.message.extendedTextMessage.contextInfo.participant;
                    } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                        target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else {
                        target = mentionPart.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
                    }
                } else {
                    return "⚠️ *Uso correto:* \`/comprar apelido @user | Apelido Zoado\`\n(Use a barra vertical '|' para separar).";
                }

                if (!target || !target.includes('@') || target.length < 15) {
                    return "⚠️ Você precisa marcar (@user) ou responder à mensagem de quem deseja renomear.";
                }

                if (!newNick) {
                    return "⚠️ Informe o apelido zoado do alvo.";
                }

                if (newNick.length > 25) {
                    return "❌ Apelido muito longo! Limite máximo de 25 caracteres.";
                }

                await storage.addCoins(from, sender, -price);
                global.userNicknames.set(target, { nick: newNick, expires: agora + 24 * 60 * 60 * 1000 });

                return `🎭 *NOVO APELIDO REGISTRADO!* 🎭\n\n@${sender.split('@')[0]} comprou um apelido e batizou @${target.split('@')[0]} de: 🤡 *"${newNick}"*\n🪙 *Novo Saldo:* *${myCoins - price} Bochecha-Coins*`;
            }

            return `❌ Item "${itemToBuy}" não existe na loja do submundo. Consulte a \`/loja\` para ver a lista de itens.`;
        }
    }
};
