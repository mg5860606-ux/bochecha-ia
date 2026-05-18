module.exports = {
    definition: {
        function: {
            name: "signo",
            description: "Descobre o signo do zodíaco baseado na data de nascimento.",
            parameters: {
                type: "object",
                properties: {
                    data: { type: "string", description: "Data de nascimento DD/MM ou DD/MM/AAAA." }
                },
                required: ["data"]
            }
        }
    },
    async execute(args) {
        const raw = (args.data || args.texto || args.alvo || '').trim();
        if (!raw) return "📌 *Uso:* /signo DD/MM\n\n_Exemplo: /signo 15/03_";

        const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})/);
        if (!match) return "❌ Formato inválido. Use DD/MM. Ex: /signo 25/12";

        const dia = parseInt(match[1]);
        const mes = parseInt(match[2]);
        if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return "❌ Data inválida.";

        const signos = [
            { nome: 'Capricórnio', emoji: '♑', inicio: [12,22], fim: [1,19], elem: '🌍 Terra', desc: 'Disciplinado, ambicioso, prático e reservado.' },
            { nome: 'Aquário', emoji: '♒', inicio: [1,20], fim: [2,18], elem: '💨 Ar', desc: 'Inovador, independente, humanitário e original.' },
            { nome: 'Peixes', emoji: '♓', inicio: [2,19], fim: [3,20], elem: '💧 Água', desc: 'Intuitivo, empático, artístico e sonhador.' },
            { nome: 'Áries', emoji: '♈', inicio: [3,21], fim: [4,19], elem: '🔥 Fogo', desc: 'Corajoso, determinado, confiante e impaciente.' },
            { nome: 'Touro', emoji: '♉', inicio: [4,20], fim: [5,20], elem: '🌍 Terra', desc: 'Confiável, paciente, devotado e teimoso.' },
            { nome: 'Gêmeos', emoji: '♊', inicio: [5,21], fim: [6,20], elem: '💨 Ar', desc: 'Adaptável, comunicativo, curioso e indeciso.' },
            { nome: 'Câncer', emoji: '♋', inicio: [6,21], fim: [7,22], elem: '💧 Água', desc: 'Leal, emocional, protetor e sensitivo.' },
            { nome: 'Leão', emoji: '♌', inicio: [7,23], fim: [8,22], elem: '🔥 Fogo', desc: 'Criativo, apaixonado, generoso e dramático.' },
            { nome: 'Virgem', emoji: '♍', inicio: [8,23], fim: [9,22], elem: '🌍 Terra', desc: 'Analítico, trabalhador, prático e perfeccionista.' },
            { nome: 'Libra', emoji: '♎', inicio: [9,23], fim: [10,22], elem: '💨 Ar', desc: 'Diplomático, gracioso, justo e sociável.' },
            { nome: 'Escorpião', emoji: '♏', inicio: [10,23], fim: [11,21], elem: '💧 Água', desc: 'Apaixonado, corajoso, perspicaz e misterioso.' },
            { nome: 'Sagitário', emoji: '♐', inicio: [11,22], fim: [12,21], elem: '🔥 Fogo', desc: 'Generoso, idealista, aventureiro e humorístico.' }
        ];

        let found = null;
        for (const s of signos) {
            const [mi, di] = s.inicio;
            const [mf, df] = s.fim;
            if (mi === mf) {
                if (mes === mi && dia >= di && dia <= df) { found = s; break; }
            } else if (mi > mf) {
                if ((mes === mi && dia >= di) || (mes === mf && dia <= df)) { found = s; break; }
            } else {
                if ((mes === mi && dia >= di) || (mes === mf && dia <= df)) { found = s; break; }
            }
        }

        if (!found) return "❌ Não consegui determinar o signo. Tenta de novo.";

        return [
            `${found.emoji} *SEU SIGNO: ${found.nome.toUpperCase()}* ${found.emoji}`,
            ``,
            `📅 *Data:* ${dia}/${String(mes).padStart(2, '0')}`,
            `🌍 *Elemento:* ${found.elem}`,
            ``,
            `📝 *Perfil:* ${found.desc}`,
            ``,
            `_as sombras do zodíaco revelaram. 💀_`
        ].join('\n');
    }
};
