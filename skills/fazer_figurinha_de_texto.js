const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "fazer_figurinha_de_texto",
            description: "Cria uma figurinha animada colorida piscante (estilo ATTP) a partir de uma frase ou palavra escrita.",
            parameters: {
                type: "object",
                properties: {
                    texto: { 
                        type: "string", 
                        description: "A palavra ou frase curta que você quer transformar em figurinha animada (ex: 'Que chato')." 
                    }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, { sock, from }) {
        if (!args.texto) return "❌ Por favor, informe o texto que você quer transformar em figurinha animada.";

        await sock.sendMessage(from, { text: `🎨 Gerando figurinha animada de texto: "${args.texto}"...` });

        try {
            const API_KEY = "glnzLoIUlvwM6YZ4ildC";
            const endpoint = `https://api.spiderx.com.br/api/stickers/attp?text=${encodeURIComponent(args.texto)}&api_key=${API_KEY}`;

            // A API retorna diretamente o Buffer WebP Animado
            const response = await axios.get(endpoint, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            await sock.sendMessage(from, { sticker: buffer });
            return "Figurinha animada de texto gerada e enviada com sucesso.";

        } catch (e) {
            return `❌ Ocorreu um erro no Gerador Visual ao gerar a figurinha animada: ${e.message}`;
        }
    }
};
