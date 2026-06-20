const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "bochecha_voz",
            description: "Gera a resposta falada da IA usando vozes personalizadas ou filtros de áudio (gás hélio, voz grave de monstro, esquilo Alvin, robô futurista).",
            parameters: {
                type: "object",
                properties: {
                    preset: {
                        type: "string",
                        enum: ["antonio", "francisca", "valeska", "duarte", "helio", "grave", "esquilo", "robo"],
                        description: "O preset de voz ou efeito cômico a ser aplicado."
                    },
                    texto: {
                        type: "string",
                        description: "O texto que a IA falará na nota de voz (máximo de 1800 caracteres, equivalente a até 2 minutos de áudio)."
                    }
                },
                required: ["preset", "texto"]
            }
        }
    },
    async execute(args, ctx) {
        const preset = (args.preset || "antonio").toLowerCase();
        const texto = args.texto || "";

        if (!texto) return "❌ Você precisa fornecer um texto para eu falar, cria!";

        try {
            console.log(chalk.cyan(`[🎙️ TTS PERSONALIZADO] Presets: ${preset} | Texto: "${texto.substring(0, 50)}..."`));
            
            // Invoca o motor de sintetização vocal global com o preset dinâmico
            const success = await global.VoiceSynthesizer.speak(ctx.sock, ctx.chatId, texto, ctx.message, preset);
            
            if (success) {
                return "Áudio de zoeira gerado e enviado com sucesso ao chat.";
            } else {
                return "Falha ao tentar sintetizar o áudio personalizado no servidor.";
            }
        } catch (e) {
            console.error(chalk.red("[🎙️ TTS PERSONALIZADO] Erro:"), e);
            return `Erro ao executar sintetização personalizada: ${e.message}`;
        }
    }
};
