const chalk = require('chalk');
const { db, doc, getDoc, setDoc } = require('../firebase_connector');

module.exports = {
    definition: {
        function: {
            name: "gerenciar_memoria_permanente",
            description: "Permite salvar ou recuperar fatos e lembranças de longo prazo importantes sobre os usuários ou sobre o criador Marcos no banco de dados em nuvem. Use sempre que o usuário te disser um segredo, preferência, apelido, ou te perguntar o que você lembra sobre alguém ou sobre algum assunto do passado.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["gravar", "recuperar"],
                        description: "Ação a ser executada: 'gravar' para salvar um fato novo na memória de longo prazo, ou 'recuperar' para consultar o que você lembra sobre um usuário."
                    },
                    usuario: {
                        type: "string",
                        description: "Nome ou identificador da pessoa associada à lembrança (ex: 'Marcos', 'Davy', ou o remetente)."
                    },
                    fato: {
                        type: "string",
                        description: "Se for para GRAVAR, descreva o fato relevante de forma clara (ex: 'O Marcos gosta de lasanha e é o Arquiteto Supremo'). Se for para RECUPERAR, deixe em branco ou passe palavras-chave."
                    }
                },
                required: ["acao", "usuario"]
            }
        }
    },
    async execute(args, ctx) {
        try {
            const acao = args.acao;
            const usuarioResolvido = (args.usuario || "desconhecido").toLowerCase().trim();
            const docRef = doc(db, "memories", usuarioResolvido);

            if (acao === "gravar") {
                if (!args.fato) return "Erro: É necessário passar o 'fato' para ser gravado.";

                console.log(chalk.cyan(`[🧠 MEMÓRIA INFINITA] Gravando fato sobre '${usuarioResolvido}' no Firestore: "${args.fato}"`));

                const snap = await getDoc(docRef);
                let lembrancas = [];
                if (snap.exists()) {
                    lembrancas = snap.data().lembrancas || [];
                }

                lembrancas.push({
                    fato: args.fato,
                    timestamp: Date.now()
                });

                await setDoc(docRef, {
                    lembrancas: lembrancas,
                    ultima_atualizacao: Date.now()
                });

                return `Sucesso: Fato gravado na memória permanente de '${usuarioResolvido}': "${args.fato}".`;
            } else {
                console.log(chalk.cyan(`[🧠 MEMÓRIA INFINITA] Recuperando lembranças de '${usuarioResolvido}' do Firestore...`));

                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const lembrancas = data.lembrancas || [];
                    if (lembrancas.length === 0) {
                        return `Nenhuma lembrança encontrada sobre '${args.usuario}' no banco de dados.`;
                    }
                    
                    const lista = lembrancas.map((l, i) => `${i + 1}. "${l.fato}"`).join("\n");
                    return `Lembranças gravadas na nuvem sobre '${args.usuario}':\n${lista}`;
                } else {
                    return `Nenhuma lembrança encontrada sobre '${args.usuario}' no banco de dados.`;
                }
            }
        } catch (e) {
            console.error(chalk.red("[🧠 MEMÓRIA INFINITA] Erro na Skill:"), e);
            return `Erro ao gerenciar memória permanente no Firestore: ${e.message}`;
        }
    }
};
