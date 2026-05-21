const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "consultar_conversa_pv",
            description: "Permite consultar as últimas mensagens que o usuário enviou no chat privado (PV) com o Bochecha. Use sempre que um membro no grupo mandar você 'olhar o pv', 'ver o que mandei no pv', ou quando pedir para responder no grupo um assunto tratado no privado.",
            parameters: {
                type: "object",
                properties: {
                    usuarioJid: {
                        type: "string",
                        description: "O JID ou número de telefone do usuário cujo PV deve ser lido (ex: '557199999999@s.whatsapp.net' ou o número simplificado). Se omitido, use o JID do remetente."
                    }
                }
            }
        }
    },
    async execute(args, ctx) {
        try {
            const { chatId, isGroup, sender } = ctx;
            
            // Resolve o JID do usuário alvo
            let targetJid = args.usuarioJid || sender;
            if (targetJid && !targetJid.includes('@')) {
                // Se for apenas o número de telefone
                const clean = targetJid.replace(/[^0-9]/g, '');
                targetJid = `${clean}@s.whatsapp.net`;
            }

            console.log(chalk.cyan(`[🔌 AGENTE PV] Buscando histórico privado (PV) de '${targetJid}'...`));

            // O histórico do PV fica sob o JID privado do usuário (ex: '557199999999@s.whatsapp.net')
            // O DialogSession salva o arquivo como safe JID.
            const safe = targetJid.replace(/[^a-zA-Z0-9@._-]/g, '_');
            const MEMORY_DIR = path.join(__dirname, '..', 'memory');
            const filePath = path.join(MEMORY_DIR, `${safe}.json`);

            if (!fs.existsSync(filePath)) {
                return `Não encontrei nenhum histórico de conversa privada (PV) recente com @${targetJid.split('@')[0]}. Peça para a pessoa mandar um oi no meu PV primeiro para iniciar a conversa!`;
            }

            // Lê o histórico
            const raw = fs.readFileSync(filePath, 'utf8');
            const history = JSON.parse(raw || '[]');

            if (history.length === 0) {
                return `O PV com @${targetJid.split('@')[0]} está vazio no momento.`;
            }

            // Filtra para remover metadados de resumo se houver e pega as últimas 8 mensagens
            const cleanHistory = history.filter(m => !m.isSummaryMetadata);
            const lastMessages = cleanHistory.slice(-8);

            const formattedHistory = lastMessages.map(m => {
                const roleName = m.role === 'assistant' || m.role === 'model' ? 'Bochecha' : 'Usuário';
                return `[${roleName}]: ${m.content}`;
            }).join('\n');

            console.log(chalk.green(`[🔌 AGENTE PV] Histórico privado obtido com sucesso! (${lastMessages.length} mensagens)`));

            // Mapeia JID numérico no formato para o WhatsApp destacar azul real (@numero)
            const cleanNumber = targetJid.split('@')[0];
            return `Últimas interações no privado (PV) com @${cleanNumber}:\n\n${formattedHistory}\n\nResponda agora ao grupo com base no assunto do PV, tirando onda, tirando sarro ou dando a visão de cria sobre o que foi tratado lá no privado!`;
        } catch (e) {
            console.error(chalk.red("[🔌 AGENTE PV] Erro na Skill:"), e);
            return `Erro ao ler a conversa no privado: ${e.message}`;
        }
    }
};
