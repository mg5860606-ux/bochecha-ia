const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "lembrar_fato",
            description: "Salva uma informação importante sobre o usuário ou sobre a conversa para não esquecer no futuro.",
            parameters: {
                type: "object",
                properties: {
                    fato: { 
                        type: "string", 
                        description: "O fato ou informação que deve ser lembrada (Ex: O usuário gosta de futebol)." 
                    }
                },
                required: ["fato"]
            }
        }
    },
    async execute(args, { chatId }) {
        const notasPath = path.join(__dirname, '../notas.json');
        let notas = {};
        
        if (fs.existsSync(notasPath)) {
            notas = JSON.parse(fs.readFileSync(notasPath, 'utf8'));
        }

        if (!notas[chatId]) notas[chatId] = [];
        
        // Evita duplicatas
        if (!notas[chatId].includes(args.fato)) {
            notas[chatId].push(args.fato);
            // Mantém apenas as 20 notas mais importantes
            if (notas[chatId].length > 20) notas[chatId].shift();
            
            fs.writeFileSync(notasPath, JSON.stringify(notas, null, 2));
            return `✅ Entendido! Salvei no meu dossiê que: "${args.fato}". Não vou esquecer!`;
        }
        
        return "Eu já me lembrava disso!";
    }
};
