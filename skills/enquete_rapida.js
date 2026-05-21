module.exports = {
    definition: {
        function: {
            name: "enquete_rapida",
            description: "Cria enquete rápida no grupo usando polls nativos do WhatsApp.",
            parameters: {
                type: "object",
                properties: {
                    pergunta: { type: "string", description: "Pergunta da enquete." },
                    opcoes: { type: "string", description: "Opções separadas por vírgula." }
                },
                required: ["pergunta"]
            }
        }
    },
    async execute(args, { sock, from, pushname }) {
        const raw = (args.pergunta || args.texto || args.alvo || '').trim();
        if (!raw) return `/enquete_rapida Melhor linguagem? JS, Python, Go`;

        let pergunta = raw, opcoes = [];
        const sq = raw.split('?');
        if (sq.length >= 2) {
            pergunta = sq[0].trim() + '?';
            const rest = sq.slice(1).join('?').trim();
            if (rest) opcoes = rest.split(',').map(o => o.trim()).filter(o => o);
        }
        if (opcoes.length < 2) {
            const pts = raw.split(',');
            if (pts.length >= 3) { pergunta = pts[0].trim(); opcoes = pts.slice(1).map(o => o.trim()).filter(o => o); }
        }
        if (opcoes.length < 2) opcoes = ['Sim ✅', 'Não ❌'];
        if (opcoes.length > 12) opcoes = opcoes.slice(0, 12);

        try {
            await sock.sendMessage(from, { poll: { name: pergunta, values: opcoes, selectableCount: 1 } });
            return `📊 Enquete criada por ${pushname}!`;
        } catch {
            const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            let t = `📊 *ENQUETE* 📊\n\n❓ *${pergunta}*\n\n`;
            opcoes.forEach((o, i) => { t += `${emojis[i] || '▸'} ${o}\n`; });
            await sock.sendMessage(from, { text: t });
            return "Enquete criada!";
        }
    }
};
