const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const DATABASE_RADAR_PATH = path.join(__dirname, 'database_radar.json');

module.exports = {
    definition: {
        function: {
            name: "radar_membros",
            description: "Registra a localidade geográfica de um membro ou desenha o Radar Geográfico de Zoeira com as posições de todos no grupo.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["registrar", "radar"],
                        description: "Ação a ser realizada: 'registrar' para salvar sua cidade/estado, ou 'radar' para ver o mapeamento do grupo."
                    },
                    localidade: {
                        type: "string",
                        description: "Sua cidade e estado (ex: 'Bauru/SP', 'Rio de Janeiro/RJ'). Necessário apenas para a ação 'registrar'."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, ctx) {
        const { sock, from, sender, pushname } = ctx;
        const isCommand = args.isCommand || false;
        
        // Carrega o banco de dados via StorageManager (Firestore Auto-healing)
        let db = {};
        try {
            db = await global.storage.read(DATABASE_RADAR_PATH, {});
        } catch (e) {
            console.error("[RADAR] Erro ao ler database_radar.json", e);
        }

        // ==========================================
        // AÇÃO 1: REGISTRAR LOCALIDADE
        // ==========================================
        if ((!isCommand && args.acao === "registrar") || (isCommand && args.command === "/localidade")) {
            const locInput = isCommand ? (args.arg || "").trim() : (args.localidade || "").trim();

            if (!locInput) {
                return "⚠️ *Uso Incorreto:* Por favor informe sua cidade e estado!\nExemplo: */localidade Bauru/SP* ou */localidade Rio de Janeiro/RJ*";
            }

            db[sender] = {
                name: pushname || "Membro Oculto",
                localidade: locInput,
                updatedAt: new Date().toISOString()
            };

            await global.storage.write(DATABASE_RADAR_PATH, db);
            
            return `📍 *LOCALIDADE REGISTRADA COM SUCESSO!* 📍\n\n` +
                   `Fala, *${pushname}*! Salvei sua posição espacial em:\n` +
                   `👉 *${locInput}*\n\n` +
                   `Agora seu sinal está ativo! Digite */radar* para ver sua posição no mapa de zoeira do grupo! 🥀🛸💀`;
        }

        // ==========================================
        // AÇÃO 2: VER RADAR DE MEMBROS
        // ==========================================
        if ((!isCommand && args.acao === "radar") || (isCommand && args.command === "/radar")) {
            if (!from.endsWith('@g.us')) {
                return "❌ O radar geográfico do submundo só pode ser ativado dentro de um grupo, cria!";
            }

            try {
                // Obtém participantes do grupo para mapear apenas quem está ativo aqui
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants.map(p => p.id);

                const mappedMembers = [];
                for (const pId of participants) {
                    if (pId.includes('7100252033253')) continue;
                    if (db[pId]) {
                        mappedMembers.push({
                            jid: pId,
                            name: db[pId].name,
                            localidade: db[pId].localidade
                        });
                    }
                }

                if (mappedMembers.length === 0) {
                    return `📡 *RADAR GEOGRÁFICO DO BOCHECHA* 📡\n\n` +
                           `⚠️ *Nenhum membro registrado no radar deste grupo ainda!*\n\n` +
                           `Para aparecer no radar e mapear nossa influência, registre sua cidade agora:\n` +
                           `👉 Digite: */localidade SuaCidade/Estado* (ex: */localidade Rio de Janeiro/RJ*)`;
                }

                console.log(chalk.cyan(`[📡 RADAR] Mapeando ${mappedMembers.length} membros do grupo...`));

                // Monta a listagem crua para a IA processar as distâncias e fazer piadas geográficas
                const rawList = mappedMembers.map(m => `- ${m.name} (@${m.jid.split('@')[0]}): ${m.localidade}`).join('\n');

                const prompt = `Analise a seguinte lista de membros do grupo e suas respectivas cidades registradas no Brasil.
Construa um relatório de "Radar Geográfico Espacial" extremamente premium, tecnológico, zoeiro e militarizado.

[Lista de Membros e Cidades]:
${rawList}

[Diretrizes do Layout]:
1. Desenhe um mini radar ou painel tecnológico em formato de texto usando caracteres ASCII simples e emojis de localização (📍, 📡, 🌌, ⚠️).
2. Estime distâncias geográficas cômicas ou piadas territoriais brasileiras (ex: cariocas marrentos na zona de perigo, paulistas na correria do PIB, baianos na rede de relaxamento total).
3. Aponte Marcos (@551420370026) se ele estiver na lista como "O Arquiteto Supremo / Central de Bauru-SP" com 0km de distância virtual.
4. Conclua com uma estatística fictícia e engraçada sobre a concentração geográfica do poder de fogo do grupo.
5. Lembre-se de usar gírias de cria e manter as marcações (@numero) intactas.`;

                const systemRule = "Você é a Central de Telemetria e Monitoramento Geográfico de Zoeira do Bochecha-IA.";

                const { response } = await global.keyRotator.executeWithRotation([], prompt, [], systemRule);
                const radarReport = response.response.text().trim();

                return radarReport;

            } catch (err) {
                console.error(err);
                return `❌ Erro ao compilar radar de localização: ${err.message}`;
            }
        }

        return "❌ Ação do radar inválida.";
    }
};
