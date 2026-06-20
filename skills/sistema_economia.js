const moment = require('moment-timezone');

module.exports = {
    definition: {
        function: {
            name: "sistema_economia",
            description: "Gerencia a economia (Bochecha-Coins) e Cassino. Suporta: saldo, minerar, diario, trabalhar, pix, blackjack, roleta, duelo, silenciar e ricos.",
            parameters: {
                type: "object",
                properties: {
                    acao: { 
                        type: "string", 
                        enum: ["saldo", "minerar", "diario", "trabalhar", "pix", "blackjack", "roleta", "duelo", "silenciar", "ricos"], 
                        description: "Ação a ser executada." 
                    },
                    valor: { type: "number", description: "O valor da aposta, pix ou pagamento." },
                    alvo: { type: "string", description: "O JID do usuário alvo (para pix, silenciar ou duelo)." },
                    opcao: { type: "string", description: "Opção para a roleta (ex: 'preto', 'vermelho', 'par', 'impar') ou blackjack (ex: 'comprar', 'parar')." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, ctx) {
        const { sock, from, sender, pushname, message } = ctx;
        // Obter referências globais do storage
        const storage = global.storage || require("../sansekai").storage;
        const agora = Date.now();

        // 1. SALDO
        if (args.acao === "saldo") {
            const coins = await storage.addCoins(from, sender, 0); // Garante inicialização
            return `💰 *BANCO BOCHECHA-IA* 💰\n\n👤 *Cliente:* ${pushname}\n🪙 *Saldo:* *${coins} Bochecha-Coins*\n\n_Diga 'Bochecha, minerar' para obter moedas de graça!_ 💀🥀`;
        }

        // 2. MINERAR
        if (args.acao === "minerar") {
            // Usar cache de cooldown na memória
            if (!global.mineCooldowns) global.mineCooldowns = new Map();
            const lastMine = global.mineCooldowns.get(sender) || 0;
            const espera = 60 * 1000; // 1 minuto

            if (agora - lastMine < espera) {
                const restante = Math.ceil((espera - (agora - lastMine)) / 1000);
                return `⏳ *MÁQUINAS SUPERAQUECIDAS!* ⏳\n\nSuas perfuratrizes do submundo estão resfriando. Volte em *${restante} segundos*! 💀`;
            }

            const ganho = Math.floor(Math.random() * 41) + 10; // 10 a 50 coins
            const novoSaldo = await storage.addCoins(from, sender, ganho);
            global.mineCooldowns.set(sender, agora);

            return `⛏️ *MINERAÇÃO NO SUBMUNDO!* ⛏️\n\nVocê cavou nas profundezas do chat e extraiu *${ganho} Bochecha-Coins*!\n\n🪙 *Novo Saldo:* *${novoSaldo} Bochecha-Coins* 💀🥀`;
        }

        // 3. PIX
        if (args.acao === "pix") {
            let target = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!target && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            if (!target) return "❌ Você precisa responder à mensagem de alguém ou marcar o contato para fazer um PIX!";
            
            const valorTransferencia = Math.floor(args.valor || 0);
            if (valorTransferencia <= 0) return "❌ Informe um valor de Bochecha-Coins válido para transferir.";

            const myCoins = await storage.addCoins(from, sender, 0);
            if (myCoins < valorTransferencia) return `❌ Saldo insuficiente! Você possui apenas ${myCoins} Bochecha-Coins.`;

            await storage.addCoins(from, sender, -valorTransferencia);
            const targetCoins = await storage.addCoins(from, target, valorTransferencia);

            return `💸 *PIX REALIZADO COM SUCESSO!* 💸\n\nVocê enviou *${valorTransferencia} Bochecha-Coins* para @${target.split('@')[0]}!\n\n🪙 *Seu Saldo:* *${myCoins - valorTransferencia} Bochecha-Coins*`;
        }

        // 4. BLACKJACK (21)
        if (args.acao === "blackjack") {
            const bet = Math.floor(args.valor || 20);
            if (bet <= 0) return "❌ Aposta inválida!";

            const myCoins = await storage.addCoins(from, sender, 0);
            if (myCoins < bet) return `❌ Você não tem moedas suficientes! Aposta: ${bet} | Saldo: ${myCoins}`;

            // Gerenciar estados de Blackjack ativos na memória do grupo
            if (!global.blackjackGames) global.blackjackGames = new Map();
            const gameKey = `${from}-${sender}`;

            let activeGame = global.blackjackGames.get(gameKey);

            if (!activeGame) {
                // Iniciar jogo
                await storage.addCoins(from, sender, -bet);

                const deck = [];
                const suits = ['♥️', '♦️', '♣️', '♠️'];
                const values = [
                    { name: '2', value: 2 }, { name: '3', value: 3 }, { name: '4', value: 4 },
                    { name: '5', value: 5 }, { name: '6', value: 6 }, { name: '7', value: 7 },
                    { name: '8', value: 8 }, { name: '9', value: 9 }, { name: '10', value: 10 },
                    { name: 'Valete', value: 10 }, { name: 'Dama', value: 10 }, { name: 'Rei', value: 10 },
                    { name: 'Ás', value: 11 }
                ];
                
                for (const suit of suits) {
                    for (const val of values) {
                        deck.push({ ...val, suit });
                    }
                }

                // Embaralhar
                deck.sort(() => Math.random() - 0.5);

                const playerHand = [deck.pop(), deck.pop()];
                const dealerHand = [deck.pop(), deck.pop()];

                const getScore = (hand) => {
                    let score = hand.reduce((sum, card) => sum + card.value, 0);
                    let aces = hand.filter(card => card.name === 'Ás').length;
                    while (score > 21 && aces > 0) {
                        score -= 10;
                        aces--;
                    }
                    return score;
                };

                activeGame = { bet, deck, playerHand, dealerHand, getScore };
                global.blackjackGames.set(gameKey, activeGame);

                const playerScore = getScore(playerHand);
                if (playerScore === 21) {
                    // Blackjack imediato!
                    const win = Math.floor(bet * 2.5);
                    await storage.addCoins(from, sender, win);
                    global.blackjackGames.delete(gameKey);
                    return `🎰 *BLACKJACK NATURAL!* 🎰\n\nSuas cartas: ${playerHand.map(c => c.name + c.suit).join(', ')} (${playerScore})\nBanca: ${dealerHand[0].name + dealerHand[0].suit}\n\nVocê ganhou *${win} Bochecha-Coins*! 🎉`;
                }

                return `🃏 *BLACKJACK DO SUBMUNDO* 🃏\n\n👤 *Apostador:* ${pushname}\n💵 *Aposta:* ${bet} Bochecha-Coins\n\n🃏 *Suas Cartas:* ${playerHand.map(c => c.name + c.suit).join(', ')} (Pontos: *${playerScore}*)\n🏛️ *Banca:* ${dealerHand[0].name + dealerHand[0].suit} e 🃏 Oculta\n\n_Escolha 'comprar' para pedir carta ou 'parar' para encerrar!_ 💀`;
            }

            // Ação de comprar/parar
            const action = args.opcao || "comprar";
            const playerScore = activeGame.getScore(activeGame.playerHand);

            if (action === "comprar") {
                const newCard = activeGame.deck.pop();
                activeGame.playerHand.push(newCard);
                const score = activeGame.getScore(activeGame.playerHand);

                if (score > 21) {
                    global.blackjackGames.delete(gameKey);
                    return `💥 *ESTOUROU! (BUST)* 💥\n\nSuas cartas: ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (Pontos: *${score}*)\n\nVocê estourou o limite de 21 pontos e perdeu *${bet} Bochecha-Coins*! 💸`;
                }

                return `🃏 *BLACKJACK - PEDIR CARTA* 🃏\n\nVocê comprou: ${newCard.name + newCard.suit}\n\n🃏 *Suas Cartas:* ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (Pontos: *${score}*)\n🏛️ *Banca:* ${activeGame.dealerHand[0].name + activeGame.dealerHand[0].suit}\n\n_Diga 'comprar' para continuar ou 'parar' para encerrar!_`;
            }

            if (action === "parar") {
                // Turno da banca (pega carta até ter pelo menos 17)
                let dealerScore = activeGame.getScore(activeGame.dealerHand);
                while (dealerScore < 17) {
                    activeGame.dealerHand.push(activeGame.deck.pop());
                    dealerScore = activeGame.getScore(activeGame.dealerHand);
                }

                const finalPlayerScore = activeGame.getScore(activeGame.playerHand);
                global.blackjackGames.delete(gameKey);

                let result = "";
                if (dealerScore > 21) {
                    const win = bet * 2;
                    await storage.addCoins(from, sender, win);
                    result = `🎉 *A BANCA ESTOUROU!* 🎉\n\nSuas cartas: ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (${finalPlayerScore})\nBanca: ${activeGame.dealerHand.map(c => c.name + c.suit).join(', ')} (${dealerScore})\n\nVocê venceu e ganhou *${win} Bochecha-Coins*!`;
                } else if (finalPlayerScore > dealerScore) {
                    const win = bet * 2;
                    await storage.addCoins(from, sender, win);
                    result = `🎉 *VOCÊ VENCEU!* 🎉\n\nSuas cartas: ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (${finalPlayerScore})\nBanca: ${activeGame.dealerHand.map(c => c.name + c.suit).join(', ')} (${dealerScore})\n\nVocê ganhou *${win} Bochecha-Coins*!`;
                } else if (finalPlayerScore < dealerScore) {
                    result = `💸 *A BANCA VENCEU!* 💸\n\nSuas cartas: ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (${finalPlayerScore})\nBanca: ${activeGame.dealerHand.map(c => c.name + c.suit).join(', ')} (${dealerScore})\n\nVocê perdeu *${bet} Bochecha-Coins*!`;
                } else {
                    await storage.addCoins(from, sender, bet); // Devolve aposta
                    result = `🤝 *EMPATE (PUSH)!* 🤝\n\nSuas cartas: ${activeGame.playerHand.map(c => c.name + c.suit).join(', ')} (${finalPlayerScore})\nBanca: ${activeGame.dealerHand.map(c => c.name + c.suit).join(', ')} (${dealerScore})\n\nSua aposta de *${bet} Bochecha-Coins* foi devolvida!`;
                }

                return result;
            }
        }

        // 5. ROLETA DO CASSINO
        if (args.acao === "roleta") {
            const bet = Math.floor(args.valor || 20);
            const betType = args.opcao ? args.opcao.toLowerCase() : "preto";

            if (bet <= 0) return "❌ Aposta inválida!";
            const myCoins = await storage.addCoins(from, sender, 0);
            if (myCoins < bet) return `❌ Saldo insuficiente!`;

            await storage.addCoins(from, sender, -bet);

            const num = Math.floor(Math.random() * 37);
            const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);
            const color = num === 0 ? "verde" : (isRed ? "vermelho" : "preto");
            const isEven = num !== 0 && num % 2 === 0;

            let won = false;
            let multiplier = 2;

            if (betType === "preto" && color === "preto") won = true;
            else if (betType === "vermelho" && color === "vermelho") won = true;
            else if (betType === "par" && isEven) won = true;
            else if (betType === "impar" && !isEven && num !== 0) won = true;
            else if (!isNaN(betType) && parseInt(betType) === num) {
                won = true;
                multiplier = 35; // Acertar número cheio
            }

            if (won) {
                const winAmt = bet * multiplier;
                const balance = await storage.addCoins(from, sender, winAmt);
                return `🎰 *ROLETA DO SUBMUNDO* 🎰\n\n🎯 A bola caiu no: *${num} (${color.toUpperCase()})*\n\n🎉 *VOCÊ GANHOU!* Você faturou *${winAmt} Bochecha-Coins*!\n🪙 *Novo Saldo:* *${balance} Bochecha-Coins* 💀🥀`;
            } else {
                const balance = await storage.addCoins(from, sender, 0);
                return `🎰 *ROLETA DO SUBMUNDO* 🎰\n\n🎯 A bola caiu no: *${num} (${color.toUpperCase()})*\n\n💸 *PERDEU!* Você perdeu *${bet} Bochecha-Coins*.\n🪙 *Saldo:* *${balance} Bochecha-Coins*`;
            }
        }

        // 6. DUELO (ROLETA RUSSA DE COINS)
        if (args.acao === "duelo") {
            let target = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!target && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            if (!global.pendingDuels) global.pendingDuels = new Map();

            // Checar se o desafiado respondeu aceitando
            if (args.opcao === "aceitar") {
                let activeDuel = null;
                let foundKey = null;

                if (target) {
                    const checkKey = `${from}-${target}`;
                    const duel = global.pendingDuels.get(checkKey);
                    if (duel && duel.target === sender) {
                        activeDuel = duel;
                        foundKey = checkKey;
                    }
                } else {
                    // Busca qualquer duelo pendente nesta sala onde o desafiado seja o sender
                    for (const [key, duel] of global.pendingDuels.entries()) {
                        if (key.startsWith(`${from}-`) && duel.target === sender) {
                            activeDuel = duel;
                            foundKey = key;
                            target = duel.challenger;
                            break;
                        }
                    }
                }

                if (!activeDuel) {
                    return "❌ Não há nenhum duelo pendente lançado contra você.";
                }

                const bet = activeDuel.bet;
                const myCoins = await storage.addCoins(from, sender, 0);
                const targetCoins = await storage.addCoins(from, target, 0);

                if (myCoins < bet) return `❌ Você não possui moedas suficientes (${myCoins} coins).`;
                if (targetCoins < bet) return `❌ O oponente é quebrado e não tem moedas suficientes! (${targetCoins} coins).`;

                global.pendingDuels.delete(foundKey);

                // Executar o Duelo
                const shooter = Math.random() < 0.5 ? sender : target;
                const winner = shooter === sender ? target : sender;

                await storage.addCoins(from, winner, bet);
                await storage.addCoins(from, shooter, -bet);

                const winnerCoins = await storage.addCoins(from, winner, 0);

                return `🔫 *DUELO RUSSO DE COINS* 🔫\n\n*${pushname}* aceitou o duelo de *${bet} Bochecha-Coins*!\n\n*ENGATILHANDO O REVOLVER...* 💥\n\n💀 @${shooter.split('@')[0]} tomou o tiro na testa e capotou!\n\n🏆 *VENCEDOR:* @${winner.split('@')[0]} faturou a aposta!\n🪙 *Saldo do Vencedor:* *${winnerCoins} Bochecha-Coins*`;
            }

            // Caso contrário, é o lançamento de um novo desafio
            if (!target) return "❌ Você precisa desafiar ou marcar um usuário do grupo!";
            if (target === sender) return "❌ Você não pode duelar consigo mesmo, maluco!";

            const bet = Math.floor(args.valor || 50);
            if (bet <= 0) return "❌ Aposta inválida!";

            const myCoins = await storage.addCoins(from, sender, 0);
            const targetCoins = await storage.addCoins(from, target, 0);

            if (myCoins < bet) return `❌ Você não possui moedas suficientes (${myCoins} coins).`;
            if (targetCoins < bet) return `❌ O oponente é quebrado e não tem moedas suficientes! (${targetCoins} coins).`;

            // Lançar desafio
            global.pendingDuels.set(`${from}-${sender}`, { challenger: sender, target: target, bet });
            // Expira em 1 minuto
            setTimeout(() => {
                global.pendingDuels.delete(`${from}-${sender}`);
            }, 60000);

            return `⚔️ *DESAFIO DE DUELO LANÇADO!* ⚔️\n\n@${sender.split('@')[0]} desafiou @${target.split('@')[0]} para um Duelo Russo de *${bet} Bochecha-Coins*!\n\n👉 @${target.split('@')[0]}, responda com *"aceitar"* em 60 segundos ou será considerado covarde! 💀🥀`;
        }

        // 7. SILENCIAR USUÁRIO CHATO (MUTE DE MOEDAS)
        if (args.acao === "silenciar") {
            let target = args.alvo || message.message?.extendedTextMessage?.contextInfo?.participant;
            if (!target && message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            if (!target) return "❌ Você precisa responder ou marcar a pessoa chata que quer silenciar!";

            const myCoins = await storage.addCoins(from, sender, 0);
            const precoMute = 50; // Preço fixo de 50 moedas

            if (myCoins < precoMute) return `❌ Saldo insuficiente! Silenciar alguém custa *${precoMute} Bochecha-Coins*.`;

            await storage.addCoins(from, sender, -precoMute);

            // Adiciona o usuário na lista global de silenciados
            if (!global.mutedUsers) global.mutedUsers = new Map();
            const muteDuration = 5 * 60 * 1000; // 5 minutos
            global.mutedUsers.set(`${from}-${target}`, agora + muteDuration);

            return `🔇 *MUTE DE ECONOMIA ADQUIRIDO!* 🔇\n\n@${sender.split('@')[0]} pagou *50 Bochecha-Coins* para calar a boca de @${target.split('@')[0]}!\n\n👉 @${target.split('@')[0]} foi *MUTADO* por 5 minutos no submundo! Qualquer mensagem enviada por ele será apagada! 💀🥀`;
        }

        // 8. RICOS LEADERBOARD
        if (args.acao === "ricos") {
            const ricos = await storage.getRicos(from);
            if (ricos.length === 0) return "🏮 O submundo está pobre. Ninguém tem moedas acumuladas ainda!";

            let text = `╔═══════════════════════════════╗\n` +
                       `   🪙 *BOCHECHA RICOS RANK v4.0* 🪙\n` +
                       `╚═══════════════════════════════╝\n\n` +
                       `🔥 *OS PROPRIETÁRIOS DO SUBMUNDO* 🔥\n`;

            const medals = ["🥇", "🥈", "🥉", "💰", "💰", "💰", "💰", "💰", "💰", "💰"];
            const mentions = [];

            ricos.forEach((r, index) => {
                const jid = r.user + "@s.whatsapp.net";
                mentions.push(jid);
                text += `\n${medals[index] || "👤"} *#${index + 1}º* - @${r.user}\n`;
                text += `┇ 🪙 *Riqueza:* *${r.coins} Bochecha-Coins*\n`;
            });

            text += `\n*───────────────────────────────*\n`;
            text += `_Interaja no grupo para minerar moedas e subir no ranking!_ 🚀🥀`;

            await sock.sendMessage(from, { text, mentions });
            return "Ranking de riquezas exibido com sucesso.";
        }

        // 9. DIÁRIO (DAILY REWARD)
        if (args.acao === "diario") {
            if (!global.dailyCooldowns) global.dailyCooldowns = new Map();
            const lastDaily = global.dailyCooldowns.get(sender) || 0;
            const espera = 24 * 60 * 60 * 1000; // 24 horas

            if (agora - lastDaily < espera) {
                const restanteMs = espera - (agora - lastDaily);
                const horas = Math.floor(restanteMs / 3600000);
                const minutos = Math.floor((restanteMs % 3600000) / 60000);
                return `⏳ *RECOMPENSA DIÁRIA RETIRADA!* ⏳\n\nVocê já resgatou seu prêmio hoje. Volte em *${horas}h e ${minutos}m*! 💀`;
            }

            const ganho = Math.floor(Math.random() * 201) + 100; // 100 a 300 coins
            const novoSaldo = await storage.addCoins(from, sender, ganho);
            global.dailyCooldowns.set(sender, agora);

            return `🎁 *BOLSINHA DIÁRIA DO SUBMUNDO!* 🎁\n\nVocê resgatou sua recompensa diária e recebeu *${ganho} Bochecha-Coins*!\n\n🪙 *Novo Saldo:* *${novoSaldo} Bochecha-Coins* 🥀🛸`;
        }

        // 10. TRABALHAR
        if (args.acao === "trabalhar") {
            if (!global.workCooldowns) global.workCooldowns = new Map();
            const lastWork = global.workCooldowns.get(sender) || 0;
            const espera = 30 * 60 * 1000; // 30 minutos

            if (agora - lastWork < espera) {
                const restanteMin = Math.ceil((espera - (agora - lastWork)) / 60000);
                return `⏳ *TRABALHADOR CANSADO!* ⏳\n\nVocê está exausto dos bicos no submundo. Descanse por mais *${restanteMin} minutos*! 💀`;
            }

            const trabalhos = [
                { desc: "vendeu bala no semáforo do submundo", min: 30, max: 70 },
                { desc: "lavou os carros blindados dos admins", min: 40, max: 80 },
                { desc: "entregou encomendas misteriosas na favela", min: 50, max: 100 },
                { desc: "hackeou uma conta antiga de Orkut", min: 35, max: 75 },
                { desc: "limpou as jaulas dos dragões do cassino", min: 45, max: 90 }
            ];

            const job = trabalhos[Math.floor(Math.random() * trabalhos.length)];
            const ganho = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
            const novoSaldo = await storage.addCoins(from, sender, ganho);
            global.workCooldowns.set(sender, agora);

            return `💼 *BICO DO SUBMUNDO!* 💼\n\nVocê *${job.desc}* e faturou *${ganho} Bochecha-Coins*!\n\n🪙 *Novo Saldo:* *${novoSaldo} Bochecha-Coins* 💀🥀`;
        }
    }
};
