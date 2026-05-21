module.exports = {
    definition: {
        function: {
            name: "horoscopo",
            description: "Mostra o horóscopo diário de qualquer signo do zodíaco.",
            parameters: {
                type: "object",
                properties: {
                    signo: {
                        type: "string",
                        enum: ["aries", "touro", "gemeos", "cancer", "leao", "virgem", "libra", "escorpiao", "sagitario", "capricornio", "aquario", "peixes"],
                        description: "O signo do zodíaco."
                    }
                },
                required: ["signo"]
            }
        }
    },
    async execute(args, { sock, from, pushname }) {
        const rawTexto = (args.signo || args.texto || args.alvo || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (!rawTexto) {
            return [
                `♈ *HORÓSCOPO DO SUBMUNDO*`,
                ``,
                `📌 *Uso:* /horoscopo <signo>`,
                ``,
                `*Signos:* áries, touro, gêmeos, câncer,`,
                `leão, virgem, libra, escorpião,`,
                `sagitário, capricórnio, aquário, peixes`
            ].join('\n');
        }

        const signos = {
            aries: { emoji: '♈', nome: 'Áries', periodo: '21/03 - 19/04', elemento: '🔥 Fogo', planeta: 'Marte' },
            touro: { emoji: '♉', nome: 'Touro', periodo: '20/04 - 20/05', elemento: '🌍 Terra', planeta: 'Vênus' },
            gemeos: { emoji: '♊', nome: 'Gêmeos', periodo: '21/05 - 20/06', elemento: '💨 Ar', planeta: 'Mercúrio' },
            cancer: { emoji: '♋', nome: 'Câncer', periodo: '21/06 - 22/07', elemento: '💧 Água', planeta: 'Lua' },
            leao: { emoji: '♌', nome: 'Leão', periodo: '23/07 - 22/08', elemento: '🔥 Fogo', planeta: 'Sol' },
            virgem: { emoji: '♍', nome: 'Virgem', periodo: '23/08 - 22/09', elemento: '🌍 Terra', planeta: 'Mercúrio' },
            libra: { emoji: '♎', nome: 'Libra', periodo: '23/09 - 22/10', elemento: '💨 Ar', planeta: 'Vênus' },
            escorpiao: { emoji: '♏', nome: 'Escorpião', periodo: '23/10 - 21/11', elemento: '💧 Água', planeta: 'Plutão' },
            sagitario: { emoji: '♐', nome: 'Sagitário', periodo: '22/11 - 21/12', elemento: '🔥 Fogo', planeta: 'Júpiter' },
            capricornio: { emoji: '♑', nome: 'Capricórnio', periodo: '22/12 - 19/01', elemento: '🌍 Terra', planeta: 'Saturno' },
            aquario: { emoji: '♒', nome: 'Aquário', periodo: '20/01 - 18/02', elemento: '💨 Ar', planeta: 'Urano' },
            peixes: { emoji: '♓', nome: 'Peixes', periodo: '19/02 - 20/03', elemento: '💧 Água', planeta: 'Netuno' }
        };

        const signo = signos[rawTexto];
        if (!signo) return "❌ Signo não encontrado. Use: aries, touro, gemeos, cancer, leao, virgem, libra, escorpiao, sagitario, capricornio, aquario, peixes.";

        const amor = [
            "A paixão bate na porta hoje. Abra ou finja que não está em casa.",
            "Momento propício para se declarar. Se der errado, foi o universo testando.",
            "Alguém especial vai cruzar seu caminho. Pode ser o entregador.",
            "Coração blindado hoje. Nada entra, nada sai.",
            "A relação pede paciência. Respire fundo antes de mandar aquela mensagem.",
            "Cupido errou a mira. Tente novamente amanhã.",
            "Se está solteiro(a), aproveite. Se está comprometido(a), também aproveite.",
            "Momento de reconexão emocional. Liga pra quem tu ama."
        ];
        const trabalho = [
            "Foco total hoje. Produtividade em alta, mas não abuse do café.",
            "Uma oportunidade surge de onde você menos espera. Fique atento.",
            "Dia de resolver pendências acumuladas. Nada de procrastinar.",
            "Criatividade em alta. Boas ideias vão fluir naturalmente.",
            "Evite conflitos profissionais. Diplomacia é a chave.",
            "Resultados de um esforço antigo aparecem. Paciência compensa.",
            "Dia bom para aprender algo novo que vai agregar na carreira.",
            "Cuidado com decisões financeiras impulsivas."
        ];
        const saude = [
            "Cuide da hidratação. Seu corpo agradece.",
            "Energia elevada. Aproveite para se exercitar.",
            "Dia para descansar a mente. Meditação ou um bom filme.",
            "Atenção à alimentação. Menos industrializados, mais naturais.",
            "Seu corpo pede movimento. Uma caminhada resolve.",
            "Estresse em alta. Encontre uma válvula de escape saudável.",
            "Sono reparador é prioridade. Nada de virar a noite.",
            "Momento de renovação energética. Respire e agradeça."
        ];

        // Seed baseado no dia + signo para manter consistente durante o dia
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        const signoIdx = Object.keys(signos).indexOf(rawTexto);
        const rng = (arr, offset) => arr[(seed + signoIdx + offset) % arr.length];

        const sorte = Math.floor(((seed * (signoIdx + 1)) % 100) + 1);
        const numSorte = ((seed + signoIdx * 7) % 50) + 1;
        const corSorte = ['Azul', 'Vermelho', 'Verde', 'Dourado', 'Roxo', 'Preto', 'Branco', 'Rosa', 'Laranja', 'Prata'][(seed + signoIdx) % 10];

        return [
            `${signo.emoji} *HORÓSCOPO DO SUBMUNDO - ${signo.nome.toUpperCase()}* ${signo.emoji}`,
            ``,
            `📅 *Período:* ${signo.periodo}`,
            `🌍 *Elemento:* ${signo.elemento}`,
            `🪐 *Planeta:* ${signo.planeta}`,
            ``,
            `❤️ *Amor:* ${rng(amor, 0)}`,
            ``,
            `💼 *Trabalho:* ${rng(trabalho, 1)}`,
            ``,
            `🏥 *Saúde:* ${rng(saude, 2)}`,
            ``,
            `🍀 *Índice de Sorte:* ${sorte}%`,
            `🔢 *Número da Sorte:* ${numSorte}`,
            `🎨 *Cor do Dia:* ${corSorte}`,
            ``,
            `_as estrelas do submundo falam. acredite se quiser. 💀_`
        ].join('\n');
    }
};
