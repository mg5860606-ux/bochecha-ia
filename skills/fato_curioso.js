module.exports = {
    definition: {
        function: {
            name: "fato_curioso",
            description: "Exibe fatos curiosos e surpreendentes aleatórios sobre ciência, história, natureza, tecnologia e o mundo.",
            parameters: {
                type: "object",
                properties: {
                    categoria: {
                        type: "string",
                        enum: ["ciencia", "historia", "natureza", "tecnologia", "corpo_humano", "espaco", "animais"],
                        description: "Categoria do fato."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        const rawTexto = (args.texto || args.alvo || '').trim().toLowerCase();
        const categoria = args.categoria || rawTexto || null;

        const fatos = {
            ciencia: [
                "O mel nunca estraga. Mel com mais de 3.000 anos foi encontrado em tumbas egípcias e ainda era comestível. 🍯",
                "A luz leva cerca de 8 minutos para ir do Sol à Terra. Se o Sol apagasse agora, só saberíamos daqui a 8 minutos. ☀️",
                "Um raio relâmpago é 5x mais quente que a superfície do Sol. ⚡",
                "O vidro é tecnicamente um líquido superesfriado, não um sólido. 🪟",
                "Seres humanos e cogumelos compartilham cerca de 50% do DNA. 🍄",
                "A água quente congela mais rápido que a água fria - isso é chamado de Efeito Mpemba. 🧊",
                "Um único grama de DNA pode armazenar 700 terabytes de dados. 🧬",
                "O som viaja 4x mais rápido na água do que no ar. 🌊"
            ],
            historia: [
                "A Grande Muralha da China não é visível a olho nu do espaço - esse é um dos mitos mais populares da história. 🏯",
                "Cleópatra viveu mais perto da construção dos primeiros iPhones do que da construção das pirâmides do Egito. 📱",
                "Os Vikings usavam cristais de calcita para navegar antes da invenção da bússola. 🧭",
                "Oxford é mais antiga do que os Astecas: a universidade foi fundada em 1096, os Astecas surgiram por volta de 1300. 🎓",
                "O Exército Romano usava urina de humanos para lavar roupas e escovar dentes. 🦷",
                "A batata foi introduzida na Europa pelos espanhóis após a conquista da América no séc. XVI. 🥔",
                "Napoleão não era tão baixo quanto se pensa - media cerca de 1,69m, altura média para a época. ⚔️"
            ],
            natureza: [
                "As abelhas conseguem reconhecer rostos humanos e se lembrar deles. 🐝",
                "Os árvores de uma floresta se comunicam entre si pela rede de fungos no solo - chamada de 'internet da floresta'. 🌳",
                "Os golfinhos dormem com metade do cérebro de cada vez para se manter alerta a predadores. 🐬",
                "Uma única árvore de borracha produz cerca de 100 litros de látex por ano durante décadas. 🌿",
                "Os polvos têm 3 corações e sangue azul. 🐙",
                "As sequóias-gigante dependem do fogo para se reproduzir - o calor abre as pinhas e libera sementes. 🌲",
                "O mel é produzido quando as abelhas regurgitam néctar repetidamente - o que você come é, tecnicamente, vômito de abelha. 🍯"
            ],
            tecnologia: [
                "O primeiro computador pessoal, o Altair 8800, foi lançado em 1975 e não tinha teclado nem monitor. 💻",
                "O primeiro email da história foi enviado em 1971 por Ray Tomlinson - e ele mesmo não lembra o que disse. 📧",
                "O código-fonte do Apollo 11 (que levou o homem à lua) está disponível no GitHub. 🚀",
                "O primeiro domínio .com registrado foi symbolics.com, em 15 de março de 1985. 🌐",
                "O botão 'curtir' do Facebook foi inicialmente chamado de 'Awesome' (incrível). 👍",
                "O primeiro tweet foi enviado por Jack Dorsey em 21 de março de 2006: 'just setting up my twttr'. 🐦",
                "O Wi-Fi foi acidentalmente inventado a partir de pesquisas sobre buracos negros em 1992. 📡"
            ],
            corpo_humano: [
                "O cérebro humano usa cerca de 20% de toda a energia do corpo, apesar de representar apenas 2% do peso. 🧠",
                "Os ossos humanos são 4x mais fortes que o concreto em compressão. 💪",
                "O estômago produz nova membrana protetora a cada 2 semanas - senão se auto-digeriria. 🫁",
                "O coração bate cerca de 100.000 vezes por dia - 35 milhões de vezes por ano. ❤️",
                "O DNA humano contém cerca de 3 bilhões de pares de bases e, se esticado, mediria 2 metros. 🧬",
                "Os olhos humanos podem distinguir cerca de 10 milhões de cores diferentes. 👁️",
                "Cada pessoa perde cerca de 30.000 a 40.000 células mortas da pele por hora. 🦠"
            ],
            espaco: [
                "Um dia em Vênus é mais longo do que um ano em Vênus - o planeta gira mais devagar do que orbita o Sol. 🌍",
                "Se você removesse todo o espaço vazio dos átomos do corpo humano, você caberia num grão de arroz. ⚛️",
                "Existem mais estrelas no universo do que grãos de areia em todas as praias da Terra. 🌟",
                "A maior tempestade conhecida é a Grande Mancha Vermelha de Júpiter - dura há mais de 350 anos. 🌀",
                "Um ano em Marte tem 687 dias terrestres. Um dia em Marte tem 24h37min. 🔴",
                "A sonda Voyager 1, lançada em 1977, é o objeto feito pelo homem mais distante da Terra. 🛸",
                "Plutão tem uma lua (Caronte) tão grande em relação a si mesmo que os dois orbitam um ponto no espaço entre eles. 🌑"
            ],
            animais: [
                "Os gorilas ocidentais de planície criam lutos e ficam próximos dos corpos de seus mortos por dias. 🦍",
                "Os cavalos-marinhos são a única espécie em que o macho fica grávido e dá à luz. 🐴",
                "Um grupo de corvos é chamado de 'assassinato' (murder) em inglês. 🐦‍⬛",
                "Os flamingos nascem brancos. A cor rosa vem da alimentação rica em betacaroteno. 🦩",
                "Os coalas têm impressões digitais quase idênticas às dos humanos. 🐨",
                "As polvos têm 9 cérebros - um central e um em cada tentáculo. 🐙",
                "Os lobos marinhos são mais rápidos na água do que a maioria dos peixes. 🦭"
            ]
        };

        let lista;
        if (categoria && fatos[categoria]) {
            lista = fatos[categoria];
        } else {
            // Junta todos e sorteia
            lista = Object.values(fatos).flat();
        }

        const fato = lista[Math.floor(Math.random() * lista.length)];
        return `🧠 *FATO CURIOSO DO SUBMUNDO* 🧠\n\n${fato}\n\n_quem tem o maior banco de dados de curiosidades? eu né. 💀_`;
    }
};
