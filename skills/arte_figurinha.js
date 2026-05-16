const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "arte_figurinha",
            description: "Cria figurinhas de texto (ttp/attp) ou manda metadinhas de perfil.",
            parameters: {
                type: "object",
                properties: {
                    comando: { 
                        type: "string", 
                        enum: ["ttp", "attp", "metadinha", "brap"],
                        description: "Qual comando de arte executar." 
                    },
                    texto: { 
                        type: "string", 
                        description: "O texto para criar a figurinha (para ttp/attp)." 
                    }
                },
                required: ["comando"]
            }
        }
    },
    async execute(args, { sock, from }) {
        const text = args.texto || "Bochecha-IA";
        
        try {
            if (args.comando === "ttp") {
                const url = `https://vyturex-api.vercel.app/api/ttp?text=${encodeURIComponent(text)}`;
                await sock.sendMessage(from, { sticker: { url } });
                return "Figurinha TTP enviada.";
            }

            if (args.comando === "attp") {
                const url = `https://vyturex-api.vercel.app/api/attp?text=${encodeURIComponent(text)}`;
                await sock.sendMessage(from, { sticker: { url } });
                return "Figurinha ATTP enviada.";
            }

            if (args.comando === "metadinha") {
                const res = await axios.get('https://vyturex-api.vercel.app/api/metadinha');
                const { female, male } = res.data;
                
                await sock.sendMessage(from, { image: { url: male }, caption: "🤴 Parte dele (Ele)" });
                await sock.sendMessage(from, { image: { url: female }, caption: "👸 Parte dela (Ela)" });
                return "Metadinha enviada.";
            }

            if (args.comando === "brap") {
                const url = `https://files.catbox.moe/u6v9w1.jpg`; // Placeholder para imagem brap
                await sock.sendMessage(from, { image: { url }, caption: "🇧🇷 *BRAAAP!* 🇧🇷" });
                return "Brap enviado.";
            }

        } catch (e) {
            return `❌ Erro ao executar ${args.comando}: ${e.message}`;
        }
    }
};
