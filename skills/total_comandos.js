const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "status",
            description: "Mostra o total de comandos ativos no sistema.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, pushname }) {
        const skillsDir = path.join(__dirname);
        const files = fs.readdirSync(skillsDir).filter(file => file.endsWith('.js'));
        const totalCount = files.length;

        const texto = `*Olá ${pushname}*

_Atualmente eu possuo um total de:_
*${totalCount} comandos ativos*

> *𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀-𝐈𝐀*`;

        const headerImage = "https://files.catbox.moe/t7w3gk.jpg";

        await sock.sendMessage(from, {
            image: { url: headerImage },
            caption: texto
        });

        return "Total de comandos exibido.";
    }
};
