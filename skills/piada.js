module.exports = {
    definition: {
        function: {
            name: "piada",
            description: "Conta piadas aleatórias, trava-línguas e fatos curiosos. Pode filtrar por categoria: geral, programação, trocadilho, curta.",
            parameters: {
                type: "object",
                properties: {
                    categoria: {
                        type: "string",
                        enum: ["geral", "programacao", "trocadilho", "curta", "nerd"],
                        description: "Categoria da piada."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        const rawTexto = (args.texto || args.alvo || '').trim().toLowerCase();
        const categoria = args.categoria || rawTexto || 'geral';

        const piadas = {
            geral: [
                "Por que o livro de matemática foi ao psicólogo?\nPorque tinha muitos problemas! 😂",
                "O que o zero disse para o oito?\nQue cinto bonito! 💀",
                "Por que o computador foi ao médico?\nPorque estava com vírus! 🤧",
                "Qual é o animal mais antigo do mundo?\nA zebra, porque está em preto e branco! 🦓",
                "Por que o esqueleto não briga?\nPorque não tem estômago pra isso! 💀",
                "O que o oceano disse para a praia?\nNada, só deu uma onda! 🌊",
                "Por que o pássaro foi ao banco?\nPara checar seu saldo... de migalhas! 🐦",
                "Qual é a música favorita do trovão?\nRoc in Roll! ⚡",
                "Por que o atleta foi ao banco?\nPorque queria sacar sua velocidade! 🏃",
                "O que o relógio disse para o cinturão?\nVocê vai ser preso! ⌚"
            ],
            programacao: [
                "Por que os programadores usam óculos escuros?\nPortugal... porque não conseguem C! 🕶️",
                "Um SQL entra num bar e pede uma cerveja.\nO barman diz: 'Não temos essa coluna.' 🍺",
                "Por que o programador deixou a namorada?\nPorque ela estava sempre dando Exception! 💔",
                "Como o programador morreu?\nDe NullPointerException no coração! 💀",
                "Por que o Java é tão popular?\nPorque é uma linguagem de bytes! ☕",
                "O que o git disse ao código?\nVou te commitar para sempre! 💑",
                "Por que o programador não sai de casa?\nPorque tem localhost! 🏠",
                "404: Piada não encontrada. 😅",
                "Tem 10 tipos de pessoas no mundo:\nAs que entendem binário e as que não entendem! 💻",
                "Um loop infinito foi ao bar.\nO barman perguntou: 'O de sempre?'\nLoop: 'Sim.'\nBarman: 'O de sempre?'\nLoop: 'Sim.'... 🔄"
            ],
            trocadilho: [
                "O que é uma abelha muito esperta?\nUma abelha-jor! 🐝",
                "O que é uma formiga dentro de um avião?\nUma aeroformiga! 🐜",
                "Por que o milho foi ao psicólogo?\nPorque estava se sentindo espigar! 🌽",
                "O que é um elefante caído numa piscina?\nUm elefante! A piscina não muda o elefante! 🐘",
                "O que o pato disse para a pata?\nPa-ta vida! 🦆",
                "O que é uma cadeira de rodas no sol?\nUma cadeira solar! ☀️",
                "Por que o mar é salgado?\nPorque a terra não aprendeu a fazer a fervura! 🌊",
                "O que o mamão disse para a goiaba?\nMa-mão! 🫙"
            ],
            curta: [
                "Qual é o cúmulo da preguiça? Sonhar que está dormindo!",
                "Qual é o cúmulo da burrice? Bater cabeça em mesa de ping-pong.",
                "Qual é o cúmulo da fome? Comer o relógio e achar que o tempo passa devagar.",
                "Qual é o cúmulo da esperteza? Usar óculos escuros para pensar mais rápido.",
                "Qual é o cúmulo da teimosia? Quebrar a cabeça numa parede e consertar a parede.",
                "Qual é o cúmulo da vaidade? Olhar no espelho de óculos escuros.",
                "Qual é o cúmulo do otimismo? Ir ao cemitério procurar gente legal.",
                "Qual é o cúmulo da organização? Numerar os fios de cabelo."
            ],
            nerd: [
                "O Schrödinger tentou fazer a piada do gato.\nEla é engraçada e não é engraçada ao mesmo tempo. 🐱",
                "Heisenberg vai a 300km/h na estrada.\nO guarda para e pergunta: Sabe a que velocidade ia?\nHeisenberg: Não faço ideia, mas sei exatamente onde estou! ⚛️",
                "Um neutron entra num bar e pede uma cerveja.\nO barman diz: Para você não tem cobrança.\nO neutron: Sem carga? 🍺",
                "Pavlov está sentado num bar quando um sino toca.\nEle se levanta e diz: Preciso alimentar o cachorro! 🔔",
                "Erwin Schrödinger, Werner Heisenberg e Georg Ohm estão num carro.\nA polícia para: Alguém está com arma aqui?\nHeisenberg: Não sei, mas sei a velocidade que estamos! ⚗️",
                "Por que os físicos não brigam?\nPorque sempre chegam a uma resolução por vetores! 📐"
            ]
        };

        const lista = piadas[categoria] || piadas['geral'];
        const piada = lista[Math.floor(Math.random() * lista.length)];
        const cat = categoria.charAt(0).toUpperCase() + categoria.slice(1);

        return `😂 *PIADA DO SUBMUNDO (${cat})* 😂\n\n${piada}\n\n_tô me superando com esse material né. 💀_`;
    }
};
