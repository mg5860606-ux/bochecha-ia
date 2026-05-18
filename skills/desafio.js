module.exports = {
    definition: {
        function: {
            name: "desafio",
            description: "Gera desafios e perguntas do tipo 'Você prefere?', 'Verdade ou Desafio' e 'Eu nunca'.",
            parameters: {
                type: "object",
                properties: {
                    tipo: { type: "string", enum: ["prefere", "verdade", "desafio_acao", "eu_nunca"], description: "Tipo." }
                }
            }
        }
    },
    async execute(args) {
        const raw = (args.tipo || args.texto || args.alvo || '').trim().toLowerCase();

        const voce_prefere = [
            "Viver sem internet ou sem ar condicionado pro resto da vida?",
            "Saber voar ou ser invisível?",
            "Ter 1 milhão agora ou 10 milhões em 10 anos?",
            "Nunca mais usar WhatsApp ou nunca mais usar Instagram?",
            "Ser o mais inteligente ou o mais bonito do mundo?",
            "Viver 200 anos sozinho ou 60 anos com o amor da sua vida?",
            "Perder todas as memórias ou nunca mais criar novas?",
            "Falar todas as línguas ou tocar todos os instrumentos?",
            "Ter fama ou ter fortuna (sem a outra)?",
            "Saber o dia da sua morte ou a causa?",
            "Ser preso por algo que não fez ou ver alguém ser preso por algo que você fez?",
            "Viajar pro passado ou pro futuro (sem volta)?",
            "Comer só comida crua ou só comida enlatada?",
            "Ter WiFi infinito ou gasolina infinita?"
        ];

        const verdades = [
            "Qual foi a maior mentira que você já contou?",
            "Qual foi a coisa mais constrangedora que já fez?",
            "Já stalkeou alguém no Instagram? Quem?",
            "Qual segredo que você nunca contou a ninguém?",
            "Já fingiu que gostava de alguém só por interesse?",
            "Qual foi a pior decisão que já tomou?",
            "Já mandou mensagem pro ex bêbado(a)?",
            "Qual é sua maior insegurança?",
            "Já leu mensagem de alguém no celular escondido?",
            "Qual membro do grupo você acha mais atraente?",
            "Qual sua mania mais estranha?",
            "Já chorou por causa de filme/série? Qual?"
        ];

        const desafios_acao = [
            "Mande um áudio cantando qualquer música por 15 segundos!",
            "Mande uma foto do seu pé agora! 🦶",
            "Coloque uma foto constrangedora como foto de perfil por 1 hora!",
            "Mande 'eu te amo' pro último contato da sua lista!",
            "Grave um áudio imitando um animal!",
            "Faça uma declaração de amor pro admin do grupo!",
            "Mande um print da sua galeria (última foto)!",
            "Fique sem mandar mensagem no grupo por 30 minutos!",
            "Mande um sticker feio no grupo!",
            "Elogie sinceramente 3 pessoas do grupo AGORA!",
            "Mande a foto mais antiga do seu celular!",
            "Faça um rap improvisado de 4 linhas sobre o grupo!"
        ];

        const eu_nunca = [
            "Eu nunca fingi estar doente pra faltar na aula/trabalho",
            "Eu nunca mandei mensagem errada pra pessoa errada",
            "Eu nunca stalkeei o crush no Instagram às 3 da manhã",
            "Eu nunca chorei por causa de um filme da Disney",
            "Eu nunca comi comida do chão (regra dos 5 segundos)",
            "Eu nunca fingi que gostava de um presente",
            "Eu nunca ri num momento totalmente inapropriado",
            "Eu nunca menti sobre minha idade",
            "Eu nunca esqueci o nome de alguém 2 segundos depois",
            "Eu nunca fui dormir às 5 da manhã scrollando o celular",
            "Eu nunca dei match em alguém por acidente",
            "Eu nunca respondi 'tô chegando' sem ter saído de casa"
        ];

        let tipo = raw;
        if (!tipo || !['prefere', 'verdade', 'desafio_acao', 'eu_nunca'].includes(tipo)) {
            tipo = ['prefere', 'verdade', 'desafio_acao', 'eu_nunca'][Math.floor(Math.random() * 4)];
        }

        let titulo, lista;
        switch (tipo) {
            case 'prefere': titulo = '🤔 VOCÊ PREFERE?'; lista = voce_prefere; break;
            case 'verdade': titulo = '😈 VERDADE'; lista = verdades; break;
            case 'desafio_acao': titulo = '🔥 DESAFIO'; lista = desafios_acao; break;
            case 'eu_nunca': titulo = '🍺 EU NUNCA'; lista = eu_nunca; break;
        }

        const item = lista[Math.floor(Math.random() * lista.length)];
        return `${titulo}\n\n👉 *${item}*\n\n_quem tiver coragem responde. 💀_`;
    }
};
