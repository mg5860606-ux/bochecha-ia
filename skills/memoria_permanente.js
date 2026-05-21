const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "gerenciar_memoria_permanente",
            description: "Permite salvar ou recuperar fatos e lembranças de longo prazo importantes sobre os usuários ou sobre o criador Marcos no banco de dados local. Use sempre que o usuário te disser um segredo, preferência, apelido, ou te perguntar o que você lembra sobre alguém ou sobre algum assunto do passado.",
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
            const usuarioResolvido = (args.usuario || "desconhecido").trim();
            const localMemory = global.localMemory;

            if (!localMemory) {
                return "Erro: O motor de memória local do Bochecha não está inicializado.";
            }

            if (acao === "gravar") {
                if (!args.fato) return "Erro: É necessário passar o 'fato' para ser gravado.";

                console.log(chalk.cyan(`[🧠 MEMÓRIA INFINITA] Gravando fato sobre '${usuarioResolvido}' no MEMORY.md: "${args.fato}"`));
                
                // Mapeia o nome do usuário para JID correspondente
                let userJid = ctx.sender || usuarioResolvido;
                await localMemory.learnFact(usuarioResolvido, userJid, args.fato);

                return `Sucesso: Fato gravado na memória permanente de '${usuarioResolvido}': "${args.fato}".`;
            } else {
                console.log(chalk.cyan(`[🧠 MEMÓRIA INFINITA] Recuperando lembranças de '${usuarioResolvido}' do MEMORY.md...`));
                
                let userJid = ctx.sender || usuarioResolvido;
                const contextLTM = await localMemory.getLTMContext(userJid);
                
                if (contextLTM) {
                    return contextLTM.trim();
                } else {
                    return `Nenhuma lembrança encontrada sobre '${args.usuario}' no banco de dados local.`;
                }
            }
        } catch (e) {
            console.error(chalk.red("[🧠 MEMÓRIA INFINITA] Erro na Skill:"), e);
            return `Erro ao gerenciar memória permanente local: ${e.message}`;
        }
    }
};
