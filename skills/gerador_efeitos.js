module.exports = {
    definition: {
        function: {
            name: "gerador_efeitos",
            description: "Gera logotipos ou imagens com efeitos de texto usando as APIs legadas da Zero-Two.",
            parameters: {
                type: "object",
                properties: {
                    efeito: {
                        type: "string",
                        enum: ["neon", "glitch", "matrix", "fire"],
                        description: "O estilo visual desejado da logo."
                    },
                    texto: {
                        type: "string",
                        description: "O texto a ser escrito na imagem."
                    }
                },
                required: ["efeito", "texto"]
            }
        }
    },
    async execute(args, { sock, from }) {
        await sock.sendMessage(from, { text: `🎨 Solicitando geração de logo estilo ${args.efeito.toUpperCase()} à API Zero-Two...` });
        
        try {
            // Chave oficial extraída do código legado
            const ZERO_TWO_API_KEY = "SANDRO_MD_2005";
            let endpoint = args.efeito; 
            
            const url = `https://zero-two-apis.com.br/api/maker/${endpoint}?text=${encodeURIComponent(args.texto)}&apikey=${ZERO_TWO_API_KEY}`;
            
            // O Baileys fará o download e envio direto usando a URL da API
            await sock.sendMessage(from, { 
                image: { url: url }, 
                caption: `Aqui está sua arte gerada: ${args.texto}` 
            });
            
            return "A imagem foi gerada via API e enviada com sucesso no grupo.";
        } catch (e) {
            return `A API legada de imagem Zero-Two parece estar offline ou a chave expirou. Erro: ${e.message}`;
        }
    }
};
