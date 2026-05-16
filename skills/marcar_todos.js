const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "marcar_todos",
            description: "Menciona todos os participantes do grupo em uma mensagem.",
            parameters: {
                type: "object",
                properties: {
                    mensagem: {
                        type: "string",
                        description: "A mensagem que acompanhará a marcação (ex: 'Atenção pessoal!')"
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        try {
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants.map(p => p.id);

            let text = `📢 *Mural do bochecha*\n\n${args.mensagem || 'Chamando todo mundo!'}\n\n`;
            for (let mem of participants) {
                text += ` @${mem.split('@')[0]}`;
            }

            console.log(chalk.cyan(`[📢 TAGALL] Marcando todos em ${from}`));
            await sock.sendMessage(from, { text: text, mentions: participants });
            return "Todos os membros foram marcados com sucesso.";
        } catch (e) {
            return `Erro ao marcar todos: ${e.message}`;
        }
    }
};
