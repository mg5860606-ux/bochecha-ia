const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    definition: {
        function: {
            name: "revelar",
            description: "Revela uma foto ou vídeo de visualização única enviando-os como mídia normal.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        // Pega a mensagem citada
        let quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Verifica se é uma ViewOnceMessage (V1 ou V2)
        let viewOnce = quotedMsg?.viewOnceMessageV2 || quotedMsg?.viewOnceMessage;
        
        if (!viewOnce) {
            return "❌ Você precisa responder a uma Foto ou Vídeo de *Visualização Única* para eu revelar!";
        }

        const mediaType = viewOnce.imageMessage ? 'image' : (viewOnce.videoMessage ? 'video' : null);
        if (!mediaType) return "❌ Mídia de visualização única não encontrada na mensagem citada.";

        try {
            await sock.sendMessage(from, { text: "🔍 Revelando segredos... Aguarde um instante." });

            const stream = await downloadContentFromMessage(viewOnce[mediaType + 'Message'], mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const caption = `🔓 *MÍDIA REVELADA POR BOCHECHA-IA*\n\n_Dê tchau para a visualização única!_`;

            if (mediaType === 'image') {
                await sock.sendMessage(from, { image: buffer, caption });
            } else {
                await sock.sendMessage(from, { video: buffer, caption });
            }

            return "A mídia foi revelada com sucesso.";
        } catch (e) {
            return `❌ Erro ao revelar mídia: ${e.message}`;
        }
    }
};
