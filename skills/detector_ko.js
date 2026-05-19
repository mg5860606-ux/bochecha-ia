const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "detector_ko",
            description: "Mede o nível de K.O. (mentira ou conversa fiada) de uma mensagem respondida, emitindo um laudo humorístico em carioca.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    async execute(args, { sock, from, message }) {
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedSender = contextInfo?.participant;
        const quotedMsg = contextInfo?.quotedMessage;

        if (!quotedMsg) {
            return "❌ Você precisa responder a uma mensagem contendo o suposto K.O. (mentira) para eu passar no detector, cria!";
        }

        let quotedText = quotedMsg.conversation || 
                         quotedMsg.extendedTextMessage?.text || 
                         quotedMsg.imageMessage?.caption || 
                         quotedMsg.videoMessage?.caption || 
                         "";

        if (!quotedText || quotedText.trim().length === 0) {
            return "❌ A mensagem respondida não tem nenhum texto para eu analisar. Preciso de conversa fiada escrita!";
        }

        const targetNum = quotedSender ? quotedSender.split('@')[0] : "desconhecido";

        try {
            console.log(chalk.cyan(`[🕵️‍♂️ DETECTOR KO] Analisando mensagem de @${targetNum}`));

            const prompt = `Analise a seguinte mensagem enviada por um membro do grupo e emita um laudo de polígrafo cômico, ácido e debochado em carioca.

[Mensagem Analisada]: "${quotedText}"

Gere uma resposta com a seguinte estrutura em Markdown:
1. 🚨 **PROBABILIDADE DE K.O.**: Uma porcentagem calculada de forma engraçada baseada no absurdo da fala (ex: 98.4%) com uma frase irônica.
2. 🔬 **DIAGNÓSTICO PERICIAL**: Classifique a categoria da mentira com um nome científico/cômico (ex: "Mitomania Aguda de Pescador", "Esquizofrenia Social Condensada").
3. 💬 **O ESCULACHO**: Diga de forma hilária por que essa frase é um absurdo completo e jogue a marra de cria carioca.
4. ⚖️ **SENTENÇA**: Sugira uma punição zoeira para o mentiroso no grupo (ex: lavar os pratos do chat, pagar um pix de coins, ficar quieto na geladeira).

[Regras]:
- Seja extremamente direto e comédia.
- Marque o mentiroso no texto usando estritamente o formato @número (ex: @${targetNum}).`;

            const systemRule = "Você é o Bochecha, o detector de mentiras carioca mais impiedoso e sarcástico. Faça a galera passar vergonha com classe.";

            const { response } = await global.keyRotator.executeWithRotation([], prompt, [], systemRule);
            const reportText = response.response.text().trim();

            if (!reportText) {
                return `🚨 *LAUDO PRELIMINAR DE K.O.* 🚨\n\nO detector de mentiras aponta que a mensagem de @${targetNum} tem *99% de chance de ser mentira pura*!`;
            }

            return `🕵️‍♂️🚨 *LAUDO OFICIAL DO DETECTOR DE K.O.* 🚨🕵️‍♂️\n\n${reportText}`;

        } catch (e) {
            console.error("[Detector KO Skill] Erro:", e);
            return `❌ Erro ao rodar detector de K.O.: ${e.message}`;
        }
    }
};
