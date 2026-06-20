const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "eleicao_imperador",
            description: "Inicia uma eleição pública para Imperador do Submundo neste grupo. Qualquer um pode concorrer digitando 'eu imperador' nos primeiros 20s. Depois, abre-se votação por 40s.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["iniciar", "status", "cancelar", "atual"],
                        description: "Ação a executar."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ A eleição para Imperador só tem validade dentro do império dos grupos!";

        if (!global.activeElections) global.activeElections = new Map();
        if (!global.currentImperadors) global.currentImperadors = new Map();

        // ATUAL
        if (args.acao === "atual") {
            const imp = global.currentImperadors.get(from);
            if (!imp) return "👑 Atualmente este grupo está sem um Imperador coroado. Diga '/eleicao iniciar' para abrir as candidaturas!";
            return `👑 *IMPERADOR COROADO DO DIA* 👑\n\n👤 *Sua Majestade:* @${imp.id.split('@')[0]}\n🎖️ *Coroado em:* ${imp.date}\n\n_Todos os plebeus devem reverência ao Imperador!_ 💀🥀`;
        }

        // CANCELAR
        if (args.acao === "cancelar") {
            const owners = config.OWNER_NUMBERS || [];
            const cleanSender = sender.split('@')[0];
            if (!owners.includes(cleanSender)) {
                try {
                    const meta = await sock.groupMetadata(from);
                    const isAdmin = (meta.participants || []).some(p => p.id.split('@')[0] === cleanSender && (p.admin === 'admin' || p.admin === 'superadmin'));
                    if (!isAdmin) return "❌ Só os donos ou admins podem cancelar o processo eleitoral!";
                } catch (e) {
                    return "❌ Só os donos ou admins podem cancelar o processo eleitoral!";
                }
            }
            if (!global.activeElections.has(from)) return "❌ Nenhuma eleição ocorrendo no momento.";
            global.activeElections.delete(from);
            return "⛔ Processo eleitoral cancelado pelos oficiais do exército. Golpe de Estado bem-sucedido!";
        }

        // STATUS
        if (args.acao === "status") {
            const el = global.activeElections.get(from);
            if (!el) return "🗳️ Nenhuma eleição rolando no momento.";
            if (el.phase === "candidatura") {
                return `🗳️ *ELEIÇÃO PARA IMPERADOR* 🗳️\n\nFase atual: *Inscrição de Candidaturas*\n\n📝 *Candidatos inscritos:* ${el.candidates.size === 0 ? "Nenhum ainda" : [...el.candidates].map(c => `@${c.split('@')[0]}`).join(', ')}\n\n👉 Digite *"eu imperador"* para se candidatar!`;
            } else {
                let list = `🗳️ *ELEIÇÃO PARA IMPERADOR* 🗳️\n\nFase atual: *VOTAÇÃO ABERTA*\n\n`;
                let idx = 1;
                el.candidatesList.forEach(cand => {
                    const votes = el.votes.get(cand) || 0;
                    list += `*#${idx}* - @${cand.split('@')[0]} (🗳️ *${votes} votos*)\n`;
                    idx++;
                });
                list += `\n👉 Digite o *número do candidato* no chat para computar seu voto!`;
                return list;
            }
        }

        // INICIAR
        if (global.activeElections.has(from)) {
            return "⚠️ Já há um processo de votação ou candidatura rolando! Digite '/eleicao status' para acompanhar.";
        }

        const election = {
            phase: "candidatura",
            candidates: new Set(),
            candidatesList: [],
            votes: new Map(),
            voted: new Set()
        };
        global.activeElections.set(from, election);

        await sock.sendMessage(from, {
            text: `👑 *CAMPANHA ELEITORAL PARA IMPERADOR DO SUBMUNDO* 👑\n\n` +
                `Estão abertas as inscrições de candidatos!\n` +
                `👉 Qualquer membro tem *20 segundos* para digitar *"eu imperador"* e se candidatar.\n\n` +
                `⚖️ _Que a dinastia comece! Inscrevam-se agora!_`
        });

        // Fase 1: Candidaturas por 20 segundos
        setTimeout(async () => {
            const el = global.activeElections.get(from);
            if (!el) return;

            if (el.candidates.size === 0) {
                global.activeElections.delete(from);
                await sock.sendMessage(from, { text: "⚠️ Ninguém se candidatou a Imperador. O trono continua vazio por puro desinteresse dos plebeus! 💀" });
                return;
            }

            el.phase = "votacao";
            el.candidatesList = [...el.candidates];
            el.candidatesList.forEach(c => el.votes.set(c, 0));

            let pollText = `🗳️ *CANDIDATURAS FECHADAS! INICIALIZANDO URNAS!* 🗳️\n\n` +
                `Aqui estão os candidatos ao trono supremo:\n\n`;
            
            let idx = 1;
            el.candidatesList.forEach(cand => {
                pollText += `*${idx}* ──> @${cand.split('@')[0]}\n`;
                idx++;
            });

            pollText += `\n👉 Você tem *40 segundos* para digitar no chat o *NÚMERO* do seu candidato escolhido!\n` +
                `⚖️ _Só vale um voto por plebeu! Votem agora!_`;

            await sock.sendMessage(from, {
                text: pollText,
                mentions: el.candidatesList
            });

            // Fase 2: Votação por 40 segundos
            setTimeout(async () => {
                const finalEl = global.activeElections.get(from);
                global.activeElections.delete(from);
                if (!finalEl) return;

                let winner = null;
                let maxVotes = -1;
                let tie = false;

                finalEl.candidatesList.forEach(cand => {
                    const vCount = finalEl.votes.get(cand) || 0;
                    if (vCount > maxVotes) {
                        maxVotes = vCount;
                        winner = cand;
                        tie = false;
                    } else if (vCount === maxVotes && maxVotes > -1) {
                        tie = true;
                    }
                });

                if (maxVotes === 0 || !winner) {
                    await sock.sendMessage(from, { text: "👵 Julgamento do povo: Absoluto zero votos. Ninguém se importou em ir às urnas. Ninguém foi coroado! 💀" });
                    return;
                }

                if (tie) {
                    await sock.sendMessage(from, { text: `🤝 *EMPATE NAS URNAS!* Dois ou mais candidatos empataram com *${maxVotes} votos*. Uma junta militar provisória governará até novas eleições. Ninguém foi coroado Imperador! ⚔️` });
                    return;
                }

                // Coroar vencedor
                const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
                global.currentImperadors.set(from, {
                    id: winner,
                    date: nowStr
                });

                await sock.sendMessage(from, {
                    text: `🎉👑 *O POVO FALOU! NOVA DINASTIA COROADA!* 👑🎉\n\n` +
                        `O candidato @${winner.split('@')[0]} venceu a eleição com *${maxVotes} votos* e acaba de ser coroado o *IMPERADOR DO DIA* do nosso submundo!\n\n` +
                        `✨ *Poderes Imperiais concedidos:* A partir de agora, ele tem imunidade à zoeira ácida do Bochecha-IA e será tratado com o maior respeito da banca! Plebeus, ajoelhem-se! 💀🥀`,
                    mentions: [winner]
                });

            }, 40000);

        }, 20000);

        return "Iniciando inscrições.";
    }
};
