const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "exibir_menu",
            description: "Exibe o Menu Principal com todas as ferramentas instaladas.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        try {
            const prefix = "/";
            const NomeDoBot = "𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀";
            const DonoName = "𝐌𝐀𝐑𝐂𝐎𝐒 亗";
            const owners = ["551420370091", "20723854790881", "556584770585"];

            const sender = message.key.participant || message.key.remoteJid;
            const isOwner = owners.some(num => sender.includes(num));

            let isGroupAdmins = false;
            if (from.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                const admins = participants.filter(p => p.admin !== null).map(p => p.id);
                isGroupAdmins = admins.includes(sender);
            }

            const uptime = process.uptime();
            const dias = Math.floor(uptime / 86400);
            const horas = Math.floor((uptime % 86400) / 3600);
            const minutos = Math.floor((uptime % 3600) / 60);
            const uptimeStr = `${String(dias).padStart(2, '0')}d ${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`;

            const speed = (Date.now() - (message.messageTimestamp * 1000)) / 1000;

            // Painel Exclusivo de Desenvolvedor / Dono
            let ownerPanel = "";
            if (isOwner) {
                ownerPanel = `
┇ |
┇ | 💻 *𝐏𝐀𝐈𝐍𝐄𝐋 𝐃𝐎 𝐃𝐄𝐒𝐄𝐍𝐕𝐎𝐋𝐕𝐄𝐃𝐎𝐑 (𝐃𝐎𝐍𝐎)*
┇ |⚙️⋆͜͡҈➳ ${prefix}eval (Executa código JavaScript nativo)
┇ |⚙️⋆͜͡҈➳ ${prefix}run / ${prefix}terminal (Executa comando no terminal)
┇ |⚙️⋆͜͡҈➳ ${prefix}controle_pc (Hardware, RAM, CPU & processos)
┇ |⚙️⋆͜͡҈➳ ${prefix}afins (Afinidade emocional de todos no grupo)
┇ |⚙️⋆͜͡҈➳ ${prefix}telemetria (Diagnóstico de latência e API)
┇ |⚙️⋆͜͡҈➳ ${prefix}addkey / ${prefix}removekey (Rotacionador de chaves)
┇ |⚙️⋆͜͡҈➳ ${prefix}limparkeys (Limpa chaves com falha)
┇ |⚙️⋆͜͡҈➳ ${prefix}reload (Recarrega todas as habilidades/skills)
┇ |⚙️⋆͜͡҈➳ ${prefix}reiniciar (Reinicia a máquina do Bochecha)
┇ |⚙️⋆͜͡҈➳ ${prefix}dream / ${prefix}refletir (Força reflexão da IA)
┇ |⚙️⋆͜͡҈➳ ${prefix}github (Explorador de Repositórios GitHub)
┇ |⚙️⋆͜͡҈➳ ${prefix}buscaria / ${prefix}superia (Caçador de repositórios IA)
┇ |⚙️⋆͜͡҈➳ ${prefix}release (Gerador de Changelog automático)
┇ |⚙️⋆͜͡҈➳ ${prefix}issue (Manipulador de issues e tarefas dev)`;
            }

            const menuText = `╭⊱ ───── ⋆⋅ ♰ ⋅⋆ ───── ⊰˖°🥀ִ ࣪𖤐
├─ ⊹ 𖤐 𝐈𝐍𝐅𝐎𝐒 𝐃𝐎 𝐁𝐎𝐓 / 𝐔𝐒𝐄𝐑
╎🥀˖ ▸ 𝗨𝘀𝘂́𝗮𝗿𝗶𝗼: @${sender.split('@')[0]}
╎🥀˖ ▸ 𝗩𝗜𝗣: ${isOwner ? "Sim ✅" : "Não ❌"}
╎🥀˖ ▸ 𝗖𝗮𝗿𝗴𝗼: ${isGroupAdmins ? "Admin" : "Membro"}
╎🥀˖ ▸ 𝗗𝗼𝗻𝗼: ${DonoName}
╎🥀˖ ▸ 𝗕𝗼𝘁: ${NomeDoBot}
╎🥀˖ ▸ 𝗣𝗿𝗲𝗳𝗶𝘅𝗼: ${prefix}
╎🥀˖ ▸ 𝗩𝗲𝗹𝗼𝗰𝗶𝗱𝗮𝗱𝗲: ${speed.toFixed(3)}s
╎🥀˖ ▸ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeStr}
├⊱ ───── ⋆⋅ ♰ ⋅⋆ ───── ⊰˖°🥀ִ ࣪𖤐
▹▫◃
┎┶┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆
┖╮
╭┤ˑ࣪    ִ .̇  ۫  ̣ ֽ֗🛸 𝐌𝐄𝐍𝐔 𝐃𝐎 𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀-𝐈𝐀 🛸·๋  ִ֗  ᐧ ֶּ֓ ˑ࣪ 
┇├┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
┇ | 
┇ | 👑 *𝐒𝐔𝐏𝐄𝐑-𝐇𝐀𝐁𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 𝐄𝐋𝐈𝐓𝐄 𝟐𝟎𝟐𝟔*
┇ |🔥⋆͜͡҈➳ ${prefix}editar (Editor Universal de Fotos, Vídeos, Áudios & PDFs)
┇ |🔥⋆͜͡҈➳ ${prefix}voz <preset> <texto> (Modulador de Voz cômico/dublagem)
┇ |🔥⋆͜͡҈➳ ${prefix}devaneios (Sonhos subconscientes surreais do grupo)
┇ |🔥⋆͜͡҈➳ ${prefix}localidade / ${prefix}radar (Radar geográfico ativo)
┇ |🔥⋆͜͡҈➳ ${prefix}bochecha_modo (Muda personalidade do bot)
┇ |🔥⋆͜͡҈➳ ${prefix}detector_ko (Laudo polígrafo de mentiras - quoted)
┇ |🔥⋆͜͡҈➳ ${prefix}analise_grupo (Laudo psicológico/social do chat)
┇ |🔥⋆͜͡҈➳ ${prefix}casar / ${prefix}divorciar (Casamento & economia litigiosa)
┇ |🔥⋆͜͡҈➳ ${prefix}tribunal @vacilao (Júri popular e kick democrático)
┇ |🔥⋆͜͡҈➳ ${prefix}executar_codigo (Interpretador JavaScript VM isolada)
${ownerPanel}
┇ |
┇ | ♰ *𝐈𝐍𝐅𝐎𝐒 & 𝐒𝐓𝐀𝐓𝐔𝐒*
┇ |♱˖ ▸ ${prefix}ping (Testa latência)
┇ |♱˖ ▸ ${prefix}status (Status do sistema)
┇ |♱˖ ▸ ${prefix}infogp (Informações do grupo)
┇ |♱˖ ▸ ${prefix}ranking (Exibe ranking de XP)
┇ |♱˖ ▸ ${prefix}perfil (Sua carteira, level, XPs e humor com IA)
┇ |♱˖ ▸ ${prefix}total_comandos (Total de comandos)
┇ |
┇ | ♰ *𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄̂𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋*
┇ |✨⋆͜͡҈➳ ${prefix}gpt (Falar com a IA)
┇ |✨⋆͜͡҈➳ ${prefix}gerar (Gera imagem por IA)
┇ |✨⋆͜͡҈➳ ${prefix}efeitos (Efeitos na imagem por IA)
┇ |
┇ | ♰ *𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑𝐒 & 𝐌𝐈́𝐃𝐈𝐀*
┇ |🎥⋆͜͡҈➳ ${prefix}baixar / ${prefix}play (Baixa de YouTube, Reels, TikTok e Pinterest)
┇ |🎥⋆͜͡҈➳ ${prefix}yt (Busca de vídeos e links do YouTube)
┇ |🎥⋆͜͡҈➳ ${prefix}falar (Sintetizador de texto para voz realista)
┇ |🎥⋆͜͡҈➳ ${prefix}revelar (Revela qualquer mensagem de visualização única)
┇ |🎥⋆͜͡҈➳ ${prefix}resumir / ${prefix}fofoca (Resumo de IA das conversas recentes)
┇ |
┇ | ♰ *𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒*
┇ |🎭⋆͜͡҈➳ ${prefix}s (Cria figurinha de imagem)
┇ |🎭⋆͜͡҈➳ ${prefix}fstiker (Efeitos e artes de stickers)
┇ |🎭⋆͜͡҈➳ ${prefix}attp (Figurinha de texto animada)
┇ |🎭⋆͜͡҈➳ ${prefix}rename (Renomeia figurinha)
┇ |
┇ | ♰ *𝐏𝐄𝐒𝑄𝐔𝐈𝐒𝐀𝐒 & 𝐃𝐀𝐃𝐎𝐒*
┇ |🎲⋆͜͡҈➳ ${prefix}clima (Consulta o clima)
┇ |🎲⋆͜͡҈➳ ${prefix}google (Busca no Google)
┇ |🎲⋆͜͡҈➳ ${prefix}wiki (Busca na Wikipédia)
┇ |🎲⋆͜͡҈➳ ${prefix}cpf (Consulta de CPF)
┇ |🎲⋆͜͡҈➳ ${prefix}cnpj (Consulta de CNPJ)
┇ |🎲⋆͜͡҈➳ ${prefix}placa (Consulta de Placa)
┇ |🎲⋆͜͡҈➳ ${prefix}cep (Consulta de CEP)
┇ |🎲⋆͜͡҈➳ ${prefix}ip (Consulta de IP)
┇ |
┇ | ♰ *𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐂̧𝐀̃𝐎*
┇ |🛡️⋆͜͡҈➳ ${prefix}ban (Remove membro)
┇ |🛡️⋆͜͡҈➳ ${prefix}adicionar (Adiciona membro ao grupo)
┇ |🛡️⋆͜͡҈➳ ${prefix}promover (Dá admin)
┇ |🛡️⋆͜͡҈➳ ${prefix}rebaixar (Tira admin)
┇ |🛡️⋆͜͡҈➳ ${prefix}warn (Adverte membro)
┇ |🛡️⋆͜͡҈➳ ${prefix}radv (Remove advertência)
┇ |🛡️⋆͜͡҈➳ ${prefix}mutar (Muta o grupo)
┇ |🛡️⋆͜͡҈➳ ${prefix}desmutar (Desmuta o grupo)
┇ |🛡️⋆͜͡҈➳ ${prefix}apagar (Apaga mensagens)
┇ |🛡️⋆͜͡҈➳ ${prefix}todos (Marca todos os membros)
┇ |🛡️⋆͜͡҈➳ ${prefix}bv (Configura boas-vindas)
┇ |🛡️⋆͜͡҈➳ ${prefix}configurar_grupo (Configura o grupo)
┇ |🛡️⋆͜͡҈➳ ${prefix}noturno (Modo noturno automático)
┇ |🛡️⋆͜͡҈➳ ${prefix}postar_status (Posta status)
┇ |
┇ | ♰ *𝐒𝐄𝐆𝐔𝐑𝐀𝐍𝐂̧𝐀 & 𝐓𝐑𝐀𝐕𝐀𝐒*
┇ |🛡️⋆͜͡҈➳ ${prefix}configurar_seguranca (Configura antilink/antiporn/antistatus)
┇ |🛡️⋆͜͡҈➳ ${prefix}antilink <on/off> (Bloqueia links de grupo)
┇ |🛡️⋆͜͡҈➳ ${prefix}antiporn <on/off> (Bloqueia pornografia)
┇ |🛡️⋆͜͡҈➳ ${prefix}antidelete <on/off> (Reenvia msgs deletadas)
┇ |🛡️⋆͜͡҈➳ ${prefix}antifake <on/off> (Bloqueia números gringos)
┇ |🛡️⋆͜͡҈➳ ${prefix}antistatus <on/off> (Bloqueia links nos status)
┇ |🛡️⋆͜͡҈➳ ${prefix}antipromote <on/off> (Segurança de promoção de admins)
┇ |🛡️⋆͜͡҈➳ ${prefix}antidemote <on/off> (Segurança de rebaixamento de admins)
┇ |🛡️⋆͜͡҈➳ ${prefix}antipagamento <on/off> (Bloqueia pagamentos)
┇ |🛡️⋆͜͡҈➳ ${prefix}antiflood <on/off> (Muta spammers)
┇ |🛡️⋆͜͡҈➳ ${prefix}bemvindo <on/off> (Boas-vindas automáticas)
┇ |
┇ | ♰ *𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 𝐄 𝐂𝐀𝐒𝐒𝐈𝐍𝐎*
┇ |💰⋆͜͡҈➳ ${prefix}saldo (Ver Bochecha-Coins)
┇ |💰⋆͜͡҈➳ ${prefix}minerar (Minera moedas)
┇ |💰⋆͜͡҈➳ ${prefix}pix (Transfere moedas)
┇ |💰⋆͜͡҈➳ ${prefix}duelo (Duelo de moedas)
┇ |💰⋆͜͡҈➳ ${prefix}blackjack (Jogo do Blackjack)
┇ |💰⋆͜͡҈➳ ${prefix}cassino (Jogo de Cassino)
┇ |💰⋆͜͡҈➳ ${prefix}ricos (Mais ricos do grupo)
┇ |
┇ | ♰ *𝐉𝐎𝐆𝐎𝐒 & 𝐙𝐎𝐄𝐈𝐑𝐀*
┇ |🕹⋆͜͡҈➳ ${prefix}velha (Jogo da velha)
┇ |🕹⋆͜͡҈➳ ${prefix}forca (Jogo da forca)
┇ |🕹⋆͜͡҈➳ ${prefix}roleta (Roleta russa)
┇ |🕹⋆͜͡҈➳ ${prefix}quiz (Quiz interativo)
┇ |🕹⋆͜͡҈➳ ${prefix}jokenpo (Pedra, papel, tesoura)
┇ |🕹⋆͜͡҈➳ ${prefix}enquete (Cria enquetes)
┇ |🕹⋆͜͡҈➳ ${prefix}namorar (Namora alguém)
┇ |🕹⋆͜͡҈➳ ${prefix}separar (Separa namoro)
┇ |🕹⋆͜͡҈➳ ${prefix}casais (Forma casais)
┇ |🕹⋆͜͡҈➳ ${prefix}dado_rpg (Dado RPG)
┇ |🕹⋆͜͡҈➳ ${prefix}piada (Conta piadas)
┇ |🕹⋆͜͡҈➳ ${prefix}fato_curioso (Conta fatos)
┇ |🕹⋆͜͡҈➳ ${prefix}desafio (Desafios zueiros)
┇ |🕹⋆͜͡҈➳ ${prefix}moeda (Cara ou coroa)
┇ |🕹⋆͜͡҈➳ ${prefix}enquete_rapida (Enquete rápida)
┇ |🕹⋆͜͡҈➳ ${prefix}matar (Brincadeira matar)
┇ |🕹⋆͜͡҈➳ ${prefix}comer (Brincadeira comer)
┇ |🕹⋆͜͡҈➳ ${prefix}beijar (Brincadeira beijar)
┇ |🕹⋆͜͡҈➳ ${prefix}abracar (Brincadeira abraçar)
┇ |🕹⋆͜͡҈➳ ${prefix}tapa (Brincadeira dar tapa)
┇ |🕹⋆͜͡҈➳ ${prefix}chute (Brincadeira dar chute)
┇ |🕹⋆͜͡҈➳ ${prefix}gay (Mede nível gay)
┇ |🕹⋆͜͡҈➳ ${prefix}corno (Mede nível corno)
┇ |🕹⋆͜͡҈➳ ${prefix}gado (Mede nível gado)
┇ |🕹⋆͜͡҈➳ ${prefix}fofo (Mede nível fofo)
┇ |🕹⋆͜͡҈➳ ${prefix}lindo (Mede nível lindo)
┇ |
┇ | ♰ *♈ 𝐀𝐒𝐓𝐑𝐎𝐋𝐎𝐆𝐈𝐀 & 𝐌𝐔𝐍𝐃𝐎*
┇ |🔮⋆͜͡҈➳ ${prefix}horoscopo (Ver horóscopo do dia)
┇ |🔮⋆͜͡҈➳ ${prefix}signo (Ver signo)
┇ |🔮⋆͜͡҈➳ ${prefix}hora_mundial (Ver hora no mundo)
┇ |
┇ | ♰ *🧮 𝐅𝐄𝐑𝐑𝐀𝐌𝐄𝐍𝐓𝐀𝐒 & 𝐔́𝐓𝐄𝐈𝐒*
┇ |🔧⋆͜͡҈➳ ${prefix}calcular (Calculadora avançada)
┇ |🔧⋆͜͡҈➳ ${prefix}sorteio (Realiza sorteio)
┇ |🔧⋆͜͡҈➳ ${prefix}tradutor (Traduz texto)
┇ |🔧⋆͜͡҈➳ ${prefix}texto (Modifica textos)
┇ |🔧⋆͜͡҈➳ ${prefix}base64 (Codifica/Decodifica)
┇ |🔧⋆͜͡҈➳ ${prefix}cor_hex (Gera cores hex)
┇ |🔧⋆͜͡҈➳ ${prefix}lembrete (Cria lembretes)
┇ |🔧⋆͜͡҈➳ ${prefix}fato (Lembra fatos importantes)
┇ |🔧⋆͜͡҈➳ ${prefix}avisos (Gerencia avisos)
┇ |🔧⋆͜͡҈➳ ${prefix}contagem (Contagem regressiva)
┇ |🔧⋆͜͡҈➳ ${prefix}placar (Ver placar do grupo)
┇ |🔧⋆͜͡҈➳ ${prefix}votacao (Inicia votações)
┇ |
┇ | 🤖 *𝐇𝐀𝐁𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 𝐀𝐔𝐓𝐎̂𝐍𝐎𝐌𝐀𝐒 𝐃𝐀 𝐈𝐀*
┇ | _Fale naturalmente com o Bochecha:_
┇ |🗣️⋆͜͡҈➳ Áudios: Mande áudios ou peça pra ele falar
┇ |🗣️⋆͜͡҈➳ Mídia: "Faz figurinha", "Gera imagem", "Edita foto"
┇ |🗣️⋆͜͡҈➳ Admin: "Bane o @", "Averte", "Promove"
┇ |🗣️⋆͜͡҈➳ PV: "Manda mensagem no PV dizendo..."
┇ |🗣️⋆͜͡҈➳ Busca: "Pesquisa no YouTube", "Baixa o vídeo"
┇ |🗣️⋆͜͡҈➳ Lembretes: "Me lembra em 10 min de..."
┇ |🗣️⋆͜͡҈➳ Status: "Posta isso no seu status"
┇ |
┇ ╰┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
  _${NomeDoBot} Power by ${DonoName}_
 ╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ ⚡ ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;

            await sock.sendMessage(from, {
                video: { url: "https://files.catbox.moe/mcnawn.mp4" },
                caption: menuText,
                gifPlayback: true,
                mentions: [sender]
            });

            return "O Menu foi exibido.";
        } catch (e) {
            return `Erro ao exibir o menu: ${e.message}`;
        }
    }
};
