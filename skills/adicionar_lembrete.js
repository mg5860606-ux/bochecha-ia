const reminders = require('../lib/reminders.js');

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "adicionar_lembrete",
            description: "Agenda um lembrete para o usuário em uma data e hora futura específica. Use sempre que o usuário pedir para ser lembrado de algo.",
            parameters: {
                type: "object",
                properties: {
                    mensagem: {
                        type: "string",
                        description: "A mensagem que será enviada no lembrete. Exemplo: 'Tomar o remédio', 'Reunião de trabalho'"
                    },
                    minutos_daqui: {
                        type: "number",
                        description: "Daqui a quantos minutos o lembrete deve disparar. Calcule a diferença entre a hora pedida e a hora atual. Por exemplo, se ele pedir 'daqui a 1 hora', envie 60. Se pedir 'amanhã no mesmo horário', envie 1440."
                    }
                },
                required: ["mensagem", "minutos_daqui"]
            }
        }
    },
    async execute(args, context) {
        try {
            // Fallback para comando direto: /adicionar_lembrete <mensagem> <minutos>
            if (!args.mensagem || !args.minutos_daqui) {
                const texto = (args.texto || args.alvo || '').trim();
                if (texto) {
                    const partes = texto.split(/\s+/);
                    const ultimoToken = partes[partes.length - 1];
                    const minParsed = parseInt(ultimoToken);
                    if (!isNaN(minParsed)) {
                        args.minutos_daqui = minParsed;
                        args.mensagem = partes.slice(0, -1).join(' ') || 'Lembrete';
                    } else {
                        args.mensagem = texto;
                    }
                }
                if (!args.mensagem || !args.minutos_daqui) {
                    return "❌ Use: /adicionar_lembrete <mensagem> <minutos>\nEx: /adicionar_lembrete reunião com cliente 60";
                }
            }

            const minutos = parseInt(args.minutos_daqui);
            if (isNaN(minutos) || minutos <= 0) {
                return "Erro: 'minutos_daqui' deve ser um número positivo.";
            }

            const chatId = context.chatId;
            if (!chatId) {
                return "Erro: chatId não encontrado no contexto.";
            }

            const timestamp = Date.now() + (minutos * 60000);
            
            // Calcula a string de hora final para informar o sucesso
            const dataFinal = new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            reminders.add(chatId, timestamp, args.mensagem);

            return `Lembrete agendado com sucesso para disparar em ${dataFinal}. Responda confirmando pro usuário.`;
        } catch (e) {
            return `Erro ao agendar: ${e.message}`;
        }
    }
};