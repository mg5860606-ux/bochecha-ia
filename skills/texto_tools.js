module.exports = {
    definition: {
        function: {
            name: "texto_tools",
            description: "Ferramentas de manipulação de texto: contar palavras/caracteres, inverter texto, maiúsculas, minúsculas, cifra de César, gerador de Lorem Ipsum.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["contar", "inverter", "maiusculo", "minusculo", "cifra", "Lorem", "remover_acentos", "slugify", "binario"],
                        description: "Operação a realizar."
                    },
                    texto: { type: "string", description: "O texto para processar." },
                    deslocamento: { type: "number", description: "Deslocamento para a cifra de César (1-25)." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        // ── MODO COMANDO DIRETO ──
        // /texto contar Olá mundo
        // /texto inverter Hello World
        // /texto maiusculo hello
        // /texto minusculo HELLO
        // /texto cifra 3 hello
        // /texto lorem
        // /texto binario hello
        // /texto slug Meu Título Legal
        if (!args.acao) {
            const rawTexto = (args.texto || args.alvo || '').trim();

            if (!rawTexto) {
                return [
                    `✏️ *FERRAMENTAS DE TEXTO*`,
                    ``,
                    `/texto contar <texto> → contar palavras/chars`,
                    `/texto inverter <texto> → inverter`,
                    `/texto maiusculo <texto> → MAIÚSCULAS`,
                    `/texto minusculo <texto> → minúsculas`,
                    `/texto cifra <N> <texto> → cifra de César`,
                    `/texto binario <texto> → converter para binário`,
                    `/texto slug <texto> → gerar slug de URL`,
                    `/texto lorem → gerar Lorem Ipsum`
                ].join('\n');
            }

            const parts = rawTexto.split(/\s+/);
            const subcmd = parts[0].toLowerCase();
            const restante = parts.slice(1).join(' ');

            switch (subcmd) {
                case 'contar': return contarTexto(restante || rawTexto);
                case 'inverter': return `🔄 *TEXTO INVERTIDO:*\n\n${(restante || rawTexto).split('').reverse().join('')}`;
                case 'maiusculo': case 'maiusculas': case 'upper': return `🔠 *MAIÚSCULAS:*\n\n${(restante || rawTexto).toUpperCase()}`;
                case 'minusculo': case 'minusculas': case 'lower': return `🔡 *MINÚSCULAS:*\n\n${(restante || rawTexto).toLowerCase()}`;
                case 'cifra': {
                    const n = parseInt(parts[1]);
                    const textoCifra = parts.slice(2).join(' ');
                    if (isNaN(n) || !textoCifra) return "❌ Uso: /texto cifra <número 1-25> <texto>";
                    return `🔐 *CIFRA DE CÉSAR (${n}):*\n\n${cifrarCesar(textoCifra, n)}`;
                }
                case 'binario': case 'bin': return `💻 *BINÁRIO:*\n\n${(restante || rawTexto).split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')}`;
                case 'slug': return `🔗 *SLUG:*\n\n${slugify(restante || rawTexto)}`;
                case 'lorem': return gerarLorem();
                default:
                    // Se não reconheceu subcomando, conta o texto inteiro
                    return contarTexto(rawTexto);
            }
        }

        // ── MODO IA ──
        const texto = args.texto || '';
        switch (args.acao) {
            case 'contar': return contarTexto(texto);
            case 'inverter': return `🔄 *INVERTIDO:*\n\n${texto.split('').reverse().join('')}`;
            case 'maiusculo': return `🔠 *MAIÚSCULAS:*\n\n${texto.toUpperCase()}`;
            case 'minusculo': return `🔡 *MINÚSCULAS:*\n\n${texto.toLowerCase()}`;
            case 'cifra': return `🔐 *CIFRA (${args.deslocamento || 3}):*\n\n${cifrarCesar(texto, args.deslocamento || 3)}`;
            case 'binario': return `💻 *BINÁRIO:*\n\n${texto.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')}`;
            case 'slugify': return `🔗 *SLUG:*\n\n${slugify(texto)}`;
            case 'Lorem': return gerarLorem();
            case 'remover_acentos': return `✅ *SEM ACENTOS:*\n\n${texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
            default: return "❌ Ação inválida.";
        }
    }
};

function contarTexto(texto) {
    if (!texto) return "❌ Manda o texto.";
    const palavras = texto.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = texto.length;
    const charsSemEspaco = texto.replace(/\s/g, '').length;
    const linhas = texto.split('\n').length;
    const frases = texto.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    return `✏️ *ANÁLISE DE TEXTO*\n\n📝 *Palavras:* ${palavras}\n🔤 *Caracteres:* ${chars}\n🔡 *Sem espaços:* ${charsSemEspaco}\n📄 *Linhas:* ${linhas}\n💬 *Frases:* ${frases}\n\n_análise completa. 💀_`;
}

function cifrarCesar(texto, n) {
    const shift = ((n % 26) + 26) % 26;
    return texto.split('').map(c => {
        if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
        if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97);
        return c;
    }).join('');
}

function slugify(texto) {
    return texto.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-');
}

function gerarLorem() {
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    return `📝 *LOREM IPSUM GERADO* 📝\n\n_${lorem}_\n\n_${lorem.trim().split(/\s+/).length} palavras | ${lorem.length} caracteres 💀_`;
}
