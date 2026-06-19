const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "enviar_mensagem_privada",
            description: "Envia uma mensagem direta (no privado/PV/DM) para um membro específico do grupo. Pode ser usado para dar avisos discretos, chamar atenção ou notificar alguém. IMPORTANTE: Assim que enviar a mensagem com sucesso no privado, responda de volta no grupo avisando de forma natural e espontânea em seu estilo Carioca que você já avisou/notificou a pessoa (ex: 'Avisei ela lá no PV, chefe!', 'Já dei o papo reto no privado dele!', etc.).",
            parameters: {
                type: "object",
                properties: {
                    mencao: {
                        type: "string",
                        description: "O número ou menção da pessoa a quem enviar a mensagem no privado (ex: 5565992233630 ou @5565992233630)"
                    },
                    mensagem: {
                        type: "string",
                        description: "O conteúdo da mensagem a ser enviada no privado (PV) do usuário."
                    }
                },
                required: ["mencao", "mensagem"]
            }
        }
    },
    async execute(args, { sock, from }) {
        let mencao = args.mencao;
        let mensagem = args.mensagem;

        // Se veio via comando direto (/enviar_mensagem_privada @membro mensagem)
        if (!mencao && (args.texto || args.alvo)) {
            const rawText = (args.texto || args.alvo).trim();
            const parts = rawText.split(/\s+/);
            mencao = parts[0];
            mensagem = parts.slice(1).join(" ");
        }

        if (!mencao || !mensagem) {
            return "Erro: Parâmetros mencao e mensagem são obrigatórios.";
        }

        let target = "";
        const cleanMention = mencao.replace(/[^0-9]/g, '');

        try {
            // Tenta obter o JID real (suportando LID ou telefone) na lista de participantes do grupo
            const metadata = await sock.groupMetadata(from).catch(() => null);
            if (metadata) {
                const participants = metadata.participants || [];
                const found = participants.find(p => p.id.split('@')[0].split(':')[0] === cleanMention);
                if (found) {
                    target = found.id;
                }
            }
        } catch (e) {
            console.error("Erro ao buscar JID real do destinatário da mensagem privada:", e);
        }

        if (!target) {
            // Fallback padrão se não encontrar nos participantes ou se for privado
            if (args.mencao.includes('@lid')) {
                target = cleanMention + '@lid';
            } else {
                target = cleanMention + '@s.whatsapp.net';
            }
        }

        if (!target || target.length < 15) {
            return "Erro: Não consegui identificar um JID válido para o destinatário.";
        }

        try {
            console.log(chalk.green(`[📨 PV] Enviando mensagem privada para: ${target}`));
            await sock.sendMessage(target, { text: args.mensagem });
            const cleanTarget = target.split('@')[0];
            return `Mensagem privada enviada com sucesso para @${cleanTarget} no PV.`;
        } catch (e) {
            console.error(e);
            return `Erro ao enviar mensagem privada no PV do usuário: ${e.message}`;
        }
    }
};
