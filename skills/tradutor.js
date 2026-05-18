module.exports = {
    definition: {
        function: {
            name: "tradutor",
            description: "Traduz textos para qualquer idioma usando a API MyMemory. Detecta idioma automaticamente.",
            parameters: {
                type: "object",
                properties: {
                    texto: { type: "string", description: "O texto a ser traduzido." },
                    para: { type: "string", description: "Idioma de destino (ex: 'pt', 'en', 'es', 'fr'). Padrão: 'pt'." },
                    de: { type: "string", description: "Idioma de origem (opcional, auto-detectado)." }
                },
                required: ["texto"]
            }
        }
    },
    async execute(args, { sock, from }) {
        const axios = require('axios');

        // ── MODO COMANDO DIRETO ──
        // /tradutor Olá mundo          → traduz para inglês
        // /tradutor en: Hello world    → traduz para português
        // /tradutor fr: Hello world    → traduz para francês
        if (!args.texto || args.isCommand) {
            const rawTexto = (args.texto || args.alvo || '').trim();

            if (!rawTexto) {
                return [
                    `🌍 *TRADUTOR DO SUBMUNDO*`,
                    ``,
                    `📌 *Uso:* /tradutor <texto>`,
                    ``,
                    `*Para especificar idioma de destino:*`,
                    `  /tradutor en: Olá mundo`,
                    `  /tradutor es: Hello world`,
                    `  /tradutor fr: Bom dia`,
                    ``,
                    `*Idiomas:* pt, en, es, fr, de, it, ja, zh, ru, ar, ko`
                ].join('\n');
            }

            // Detecta prefixo de idioma "en: texto" ou "en texto"
            let langPara = 'en'; // padrão: traduz para inglês se texto for PT, ou PT se for outro
            let texto = rawTexto;

            const prefixMatch = rawTexto.match(/^([a-z]{2,3}):\s*(.+)$/is);
            if (prefixMatch) {
                langPara = prefixMatch[1].toLowerCase();
                texto = prefixMatch[2].trim();
            }

            return await traduzir(axios, texto, 'autodetect', langPara);
        }

        // ── MODO IA ──
        if (!args.texto || args.texto.trim().length === 0) {
            return "❌ Manda o texto que quer traduzir.";
        }
        return await traduzir(axios, args.texto, args.de || 'autodetect', args.para || 'pt');
    }
};

async function traduzir(axios, texto, de, para) {
    const langMap = {
        'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol', 'fr': 'Francês',
        'de': 'Alemão', 'it': 'Italiano', 'ja': 'Japonês', 'zh': 'Chinês',
        'ru': 'Russo', 'ar': 'Árabe', 'ko': 'Coreano', 'hi': 'Hindi',
        'tr': 'Turco', 'pl': 'Polonês', 'nl': 'Holandês', 'uk': 'Ucraniano'
    };

    try {
        const langPair = de === 'autodetect' ? `autodetect|${para}` : `${de}|${para}`;
        const res = await axios.get('https://api.mymemory.translated.net/get', {
            params: { q: texto.substring(0, 500), langpair: langPair },
            timeout: 10000
        });

        const data = res.data;
        if (!data || data.responseStatus !== 200) {
            return "❌ Não consegui traduzir agora. Tenta de novo em instantes.";
        }

        const traduzido = data.responseData.translatedText;
        const detectedLang = data.responseData.detectedLanguage || de;
        const nomeDe = langMap[detectedLang] || detectedLang.toUpperCase();
        const nomePara = langMap[para] || para.toUpperCase();

        return `🌍 *TRADUTOR DO SUBMUNDO*\n\n🔤 *Original (${nomeDe}):*\n_${texto.substring(0, 300)}_\n\n✅ *Tradução (${nomePara}):*\n*${traduzido}*\n\n_traduzido em tempo real. 💀_`;
    } catch (e) {
        return `❌ Erro na tradução: ${e.message}`;
    }
}
