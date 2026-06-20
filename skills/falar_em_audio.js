const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "falar_em_audio",
            description: "Gera a resposta falada da IA em português brasileiro e a envia como uma nota de voz oficial do WhatsApp. Use sempre que o usuário pedir para você falar por áudio, mandar um áudio ou mandar uma mensagem de voz. Mantenha a resposta natural e de no máximo 1800 caracteres para não passar do limite de 2 minutos (120 segundos).",
            parameters: {
                type: "object",
                properties: {
                    texto: {
                        type: "string",
                        description: "O texto que a IA falará na nota de voz. Deve ser expressivo, sarcástico e dinâmico (máximo de 1800 caracteres, equivalente a até 2 minutos de áudio)."
                    }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, ctx) {
        if (!args.texto) return "Erro: Nenhum texto foi fornecido para a síntese.";

        try {
            console.log(chalk.cyan(`[🎙️ TTS] Sintetizando resposta vocal: "${args.texto.substring(0, 50)}..."`));
            
            // Invoca o motor de sintetização vocal global
            const success = await global.VoiceSynthesizer.speak(ctx.sock, ctx.chatId, args.texto, ctx.message);
            
            if (success) {
                return "Áudio gerado e enviado com sucesso ao chat.";
            } else {
                return "Falha ao tentar sintetizar o áudio no servidor. Tente responder em formato de texto comum.";
            }
        } catch (e) {
            console.error(chalk.red("[🎙️ TTS] Erro na Skill falar_em_audio:"), e);
            return `Erro ao executar sintetização: ${e.message}`;
        }
    }
};
