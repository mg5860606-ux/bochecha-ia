module.exports = {
    definition: {
        function: {
            name: "base64",
            description: "Codifica e decodifica textos em Base64.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["codificar", "decodificar"], description: "Ação." },
                    texto: { type: "string", description: "Texto para processar." }
                },
                required: ["acao", "texto"]
            }
        }
    },
    async execute(args) {
        const raw = (args.texto || args.alvo || '').trim();
        if (!raw) return "📌 *Uso:*\n/base64 codificar Hello World\n/base64 decodificar SGVsbG8gV29ybGQ=";

        const parts = raw.split(/\s+/);
        const sub = parts[0].toLowerCase();
        const texto = parts.slice(1).join(' ');

        if (sub === 'codificar' || sub === 'encode' || sub === 'cod' || args.acao === 'codificar') {
            const t = texto || raw;
            const encoded = Buffer.from(t).toString('base64');
            return `🔐 *BASE64 - CODIFICADO*\n\n📝 *Original:* ${t}\n✅ *Base64:* \`${encoded}\`\n\n_pronto, ninguém entende. 💀_`;
        }

        if (sub === 'decodificar' || sub === 'decode' || sub === 'dec' || args.acao === 'decodificar') {
            const t = texto || raw;
            try {
                const decoded = Buffer.from(t, 'base64').toString('utf8');
                return `🔓 *BASE64 - DECODIFICADO*\n\n🔐 *Base64:* ${t}\n✅ *Texto:* ${decoded}\n\n_decodificado pelo submundo. 💀_`;
            } catch {
                return "❌ Base64 inválido.";
            }
        }

        // Se não especificou, codifica por padrão
        const encoded = Buffer.from(raw).toString('base64');
        return `🔐 *BASE64*\n\n📝 *Original:* ${raw}\n✅ *Codificado:* \`${encoded}\`\n\n_use /base64 decode ... pra decodificar. 💀_`;
    }
};
