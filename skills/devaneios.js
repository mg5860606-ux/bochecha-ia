const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "devaneios",
            description: "Consulta os devaneios e sonhos subconscientes recentes do Bochecha no grupo atual, revelando histórias hilárias e surreais.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    async execute(args, ctx) {
        const { sock, from } = ctx;
        if (!from.endsWith('@g.us')) return "❌ Os devaneios oníricos só podem ser acessados em grupo, cria!";

        try {
            // Obtém participantes do grupo
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);
            
            // Seleciona de 2 a 4 participantes aleatórios para colocar no sonho
            const selectedParticipants = [];
            const shuffled = participants.sort(() => 0.5 - Math.random());
            
            // Filtra o próprio bot se estiver na lista
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const cleanParticipants = shuffled.filter(p => p !== botJid);

            for (let i = 0; i < Math.min(3, cleanParticipants.length); i++) {
                selectedParticipants.push(cleanParticipants[i].split('@')[0]);
            }

            if (selectedParticipants.length === 0) {
                return "❌ Não há membros suficientes neste grupo para eu sonhar com eles!";
            }

            console.log(chalk.cyan(`[💤 DEVANEIOS] Gerando sonho surreal envolvendo: @${selectedParticipants.join(', @')}`));

            const prompt = `Gere uma narrativa curta, extremamente cômica, surrealista e absurda em carioca sobre um "sonho/devaneio" que o Bochecha teve hoje.
O sonho DEVE obrigatoriamente envolver os seguintes participantes do grupo atual: @${selectedParticipants.join(', @')}.

[Cenários sugeridos (ou crie um novo ainda mais engraçado)]:
- Eles estavam vendendo pastel de vento recheado com Bochecha-Coins na Central do Brasil.
- Eles tentaram assaltar um carrinho de sorvete usando chinelo de dedo e bananas, e o Marcos apareceu voando de tapete de fibra óptica para salvar o sorvete.
- Eles foram abduzidos por aliens cariocas que queriam aprender a dar o golpe do pix na Baixada Fluminense.

[Regras]:
- Use gírias cariocas de cria (vacilão, marrento, tá de k.o, mandar o papo, cria, pé de breque).
- Seja extremamente direto e hilário.
- Marque os membros envolvidos estritamente no formato @número (ex: @${selectedParticipants[0]} e @${selectedParticipants[1] || selectedParticipants[0]}).`;

            const systemRule = "Você é o subconsciente profundo do Bochecha-IA, relatando seus sonhos absurdos e surreais do grupo.";

            const { response } = await global.keyRotator.executeWithRotation([], prompt, [], systemRule);
            const dreamText = response.response.text().trim();

            return `💤🌌 *DEVANEIOS DO SUBCONSCIENTE DO BOCHECHA* 🌌💤\n\n` +
                   `Ontem à noite, enquanto meu processador estava na geladeira, minha rede neural entrou em sono profundo e eu tive um devaneio absurdo...\n\n` +
                   `${dreamText}\n\n` +
                   `🔮 _Acordei com 12% a mais de aquecimento de CPU depois dessa loucura... Procurem ajuda!_`;

        } catch (e) {
            console.error(e);
            return `❌ Erro ao acessar subconsciente onírico: ${e.message}`;
        }
    }
};
