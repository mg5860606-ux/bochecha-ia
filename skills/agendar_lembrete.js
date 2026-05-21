const chalk = require('chalk');
const moment = require('moment-timezone');

module.exports = {
    definition: {
        function: {
            name: "agendar_lembrete",
            description: "Agenda um aviso ou lembrete para disparar de forma autônoma em uma data e hora exata no futuro. O motor utiliza data/hora de São Paulo (Brasil). Se o usuário disser 'amanhã às 15h' ou 'daqui a 30 minutos', calcule a data exata e envie em formato ISO completo (YYYY-MM-DDTHH:mm:ss) com base no horário invisível fornecido.",
            parameters: {
                type: "object",
                properties: {
                    data_hora_iso: {
                        type: "string",
                        description: "Data e hora exata no formato ISO (ex: '2026-05-18T15:00:00') calculada com base na data/hora do metadado invisível do chat."
                    },
                    mensagem: {
                        type: "string",
                        description: "O que o usuário deve ser lembrado (ex: 'Tomar café com o cliente Marcos', 'Entrar em call')."
                    }
                },
                required: ["data_hora_iso", "mensagem"]
            }
        }
    },
    async execute(args, ctx) {
        if (!args.data_hora_iso || !args.mensagem) {
            return "Erro: Parâmetros 'data_hora_iso' e 'mensagem' são obrigatórios.";
        }

        try {
            console.log(chalk.green(`[⏰ SCHEDULE] Agendando lembrete para ${args.data_hora_iso}: ${args.mensagem}`));
            
            const targetTime = new Date(args.data_hora_iso);
            if (isNaN(targetTime.getTime()) || targetTime.getTime() <= Date.now()) {
                return `Erro: A data fornecida (${args.data_hora_iso}) é inválida ou está no passado. Garanta que calculou corretamente em relação ao horário atual do metadado.`;
            }

            const item = await global.scheduleEngine.addSchedule(
                ctx.sock,
                ctx.chatId,
                args.data_hora_iso,
                args.mensagem,
                ctx.isOwner
            );

            const readable = moment(args.data_hora_iso).tz("America/Sao_Paulo").format("DD/MM/YYYY [às] HH:mm:ss");
            return `Lembrete agendado com absoluto sucesso para ${readable}. Mensagem salva: "${args.mensagem}".`;
        } catch (e) {
            console.error(chalk.red("[⏰ SCHEDULE] Erro na Skill agendar_lembrete:"), e);
            return `Erro interno ao salvar lembrete: ${e.message}`;
        }
    }
};
