const config = require('../config.js');

module.exports = {
    definition: {
        function: {
            name: "quiz_aovivo",
            description: "Inicia o Show do Milhão (Quiz ao vivo). O Bochecha faz 5 perguntas em sequência. O primeiro que responder a letra certa no chat em 20s pontua. O top 3 ganha Bochecha-Coins.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["iniciar", "status", "cancelar"],
                        description: "Ação a executar no Quiz."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname, message }) {
        if (!from.endsWith('@g.us')) return "❌ O Quiz ao vivo só pode ser jogado nos palcos dos grupos!";

        if (!global.activeQuizzes) global.activeQuizzes = new Map();

        // CANCELAR
        if (args.acao === "cancelar") {
            if (!global.activeQuizzes.has(from)) return "❌ Não há nenhum quiz rodando no momento.";
            
            const owners = config.OWNER_NUMBERS || [];
            const cleanSender = sender.split('@')[0];
            if (!owners.includes(cleanSender)) {
                try {
                    const meta = await sock.groupMetadata(from);
                    const isAdmin = (meta.participants || []).some(p => p.id.split('@')[0] === cleanSender && (p.admin === 'admin' || p.admin === 'superadmin'));
                    if (!isAdmin) return "❌ Apenas admins ou o Arquiteto Marcos podem cancelar o Quiz!";
                } catch (e) {
                    return "❌ Apenas admins ou o Arquiteto Marcos podem cancelar o Quiz!";
                }
            }
            
            global.activeQuizzes.delete(from);
            return "⛔ Quiz ao vivo cancelado pelo admin! A pontuação foi zerada.";
        }

        // STATUS
        if (args.acao === "status") {
            const quiz = global.activeQuizzes.get(from);
            if (!quiz) return "❌ Não há nenhum quiz em andamento neste grupo.";
            return `🧠 *QUIZ AO VIVO — STATUS* 🧠\n\n` +
                `📝 *Pergunta Atual:* ${quiz.currentQuestionIndex + 1} de 5\n` +
                `⏱️ Tempo esgotando a qualquer segundo. Responda 'A', 'B', 'C' ou 'D' no chat!`;
        }

        // INICIAR
        if (global.activeQuizzes.has(from)) {
            return "⚠️ Já há um quiz em andamento neste grupo! Responda a pergunta atual.";
        }

        const bancoPerguntas = [
            {
                p: "Quem é o arquiteto/programador supremo criador do Bochecha-IA?",
                o: ["A) Elon Musk", "B) Mark Zuckerberg", "C) Marcos", "D) Bill Gates"],
                r: "c"
            },
            {
                p: "Qual é o maior planeta do nosso sistema solar?",
                o: ["A) Terra", "B) Marte", "C) Júpiter", "D) Saturno"],
                r: "c"
            },
            {
                p: "Quantos ossos tem o corpo humano de um adulto?",
                o: ["A) 206", "B) 180", "C) 300", "D) 250"],
                r: "a"
            },
            {
                p: "Qual o metal cujo símbolo químico é Au?",
                o: ["A) Prata", "B) Ouro", "C) Cobre", "D) Ferro"],
                r: "b"
            },
            {
                p: "Qual é a capital da Austrália?",
                o: ["A) Sydney", "B) Melbourne", "C) Canberra", "D) Brisbane"],
                r: "c"
            },
            {
                p: "Quem pintou a famosa obra 'Mona Lisa'?",
                o: ["A) Van Gogh", "B) Leonardo da Vinci", "C) Picasso", "D) Dalí"],
                r: "b"
            },
            {
                p: "Em que ano o homem pisou na Lua pela primeira vez?",
                o: ["A) 1969", "B) 1972", "C) 1965", "D) 1970"],
                r: "a"
            },
            {
                p: "Qual animal é conhecido como o 'Rei da Selva'?",
                o: ["A) Tigre", "B) Elefante", "C) Leão", "D) Gorila"],
                r: "c"
            }
        ];

        // Sorteia 5 perguntas do banco
        const perguntas = bancoPerguntas.sort(() => Math.random() - 0.5).slice(0, 5);

        const quizState = {
            perguntas,
            currentQuestionIndex: 0,
            scores: new Map(), // JID -> pontos
            answeredThisRound: false,
            winnerThisRound: null,
            timer: null,
            runQuestion: null
        };
        global.activeQuizzes.set(from, quizState);

        const runQuestion = async () => {
            const currentQuiz = global.activeQuizzes.get(from);
            if (!currentQuiz) return;

            const idx = currentQuiz.currentQuestionIndex;
            if (idx >= 5) {
                // FIM DO QUIZ, CALCULA PÓDIO
                global.activeQuizzes.delete(from);

                const sortedScores = [...currentQuiz.scores.entries()]
                    .sort((a, b) => b[1] - a[1]);

                if (sortedScores.length === 0) {
                    await sock.sendMessage(from, { text: "🏁 *FIM DO SHOW DO MILHÃO!* 🏁\n\nNinguém acertou nenhuma pergunta! O submundo continuará na ignorância... 💀" });
                    return;
                }

                let endText = `🏁 *SHOW DO MILHÃO — PLACAR FINAL!* 🏁\n\n`;
                const storage = global.storage || require('../sansekai').storage;
                const prizes = [100, 50, 30]; // 1º, 2º e 3º colocados
                const medals = ["🥇", "🥈", "🥉"];
                const mentions = [];

                for (let i = 0; i < Math.min(3, sortedScores.length); i++) {
                    const [jid, pts] = sortedScores[i];
                    mentions.push(jid);
                    const prize = prizes[i];
                    await storage.addCoins(from, jid, prize).catch(() => {});
                    endText += `${medals[i]} *#${i+1}º Lugar:* @${jid.split('@')[0]} - *${pts} pontos* (🪙 Ganhou *${prize} coins*)\n`;
                }

                await sock.sendMessage(from, { text: endText, mentions });
                return;
            }

            const q = currentQuiz.perguntas[idx];
            currentQuiz.answeredThisRound = false;
            currentQuiz.winnerThisRound = null;

            await sock.sendMessage(from, {
                text: `🧠 *SHOW DO MILHÃO — PERGUNTA ${idx + 1} DE 5* 🧠\n\n` +
                    `❓ *Pergunta:* ${q.p}\n\n` +
                    `${q.o.join('\n')}\n\n` +
                    `👉 O primeiro que mandar a *LETRA CORRETA* (A, B, C ou D) no chat pontua!\n` +
                    `⏱️ Tempo limite: *20 segundos*!`
            });

            // Timer de 20s para pular
            currentQuiz.timer = setTimeout(async () => {
                const checkQuiz = global.activeQuizzes.get(from);
                if (checkQuiz && checkQuiz.currentQuestionIndex === idx && !checkQuiz.answeredThisRound) {
                    checkQuiz.currentQuestionIndex++;
                    await sock.sendMessage(from, { text: `⏰ *TEMPO ESGOTADO!* Ninguém acertou a tempo.\n👉 A resposta correta era: *${q.r.toUpperCase()}*\n\n_Preparando próxima pergunta..._` });
                    
                    setTimeout(runQuestion, 3000);
                }
            }, 20000);
        };
        quizState.runQuestion = runQuestion;

        // Inicia primeira pergunta
        await sock.sendMessage(from, { text: "🧠 *SHOW DO MILHÃO — O QUIZ DO BOCHECHA VAI COMEÇAR!* 🧠\n\nSão 5 perguntas de conhecimentos gerais. Quem responder primeiro pontua. Preparados? Lá vai..." });
        setTimeout(runQuestion, 3000);

        return "Iniciando Show do Milhão.";
    }
};
