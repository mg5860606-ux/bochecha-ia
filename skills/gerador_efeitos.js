const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "gerador_efeitos",
            description: "Aplica efeitos e montagens cômicas na foto de perfil do usuário usando a Spider API.",
            parameters: {
                type: "object",
                properties: {
                    efeito: {
                        type: "string",
                        enum: ["bolsonaro", "jail", "rip", "invert", "welcome", "goodbye"],
                        description: "O tipo de montagem/efeito a ser aplicado na foto do usuário."
                    }
                },
                required: ["efeito"]
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        if (!args.efeito) return "Aviso: Nenhum efeito foi especificado.";

        await sock.sendMessage(from, { text: `🎨 Puxando sua foto de perfil para aplicar o efeito "${args.efeito}" via Spider API...` });
        
        try {
            const API_KEY = "glnzLoIUlvwM6YZ4ildC";
            let imageUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"; // Fallback
            
            try {
                // Tenta puxar a foto de perfil em alta resolução
                const pfpUrl = await sock.profilePictureUrl(sender, 'image');
                if (pfpUrl) imageUrl = pfpUrl;
            } catch (err) {
                // O usuário pode estar sem foto ou com a privacidade ativada
                return "❌ Não consegui acessar sua foto de perfil. Verifique se suas configurações de privacidade permitem que todos vejam sua foto.";
            }

            const endpoint = `https://api.spiderx.com.br/api/canvas/${args.efeito}?image_url=${encodeURIComponent(imageUrl)}&api_key=${API_KEY}`;
            
            // A Spider API retorna a imagem processada diretamente (ex: PNG/JPEG em buffer)
            const response = await axios.get(endpoint, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            await sock.sendMessage(from, { 
                image: buffer, 
                caption: `🖌️ *Efeito Aplicado:* ${args.efeito.toUpperCase()}\n\n📡 _Spider API Canvas Engine_` 
            });
            
            return `Efeito ${args.efeito} aplicado na foto de perfil e enviado com sucesso.`;
        } catch (e) {
            return `❌ A Spider API falhou ao aplicar o efeito: ${e.message}`;
        }
    }
};
