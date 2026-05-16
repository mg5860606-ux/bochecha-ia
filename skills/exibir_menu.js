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
            const owners = ["556584770585", "176291932332072"];

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
╭┤ˑ࣪    ִ .̇  ۫  ̣ ֽ֗🛸 𝐌𝐄𝐍𝐔 - 𝐆𝐄𝐑𝐀𝐋 🛸·๋  ִ֗  ᐧ ֶּ֓ ˑ࣪ 
┇├┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
┇ | 
┇ | ♰ *ＯＵＴＲＯＳ-ＭＥＮＵＳ*
┇ |♱˖ ▸ ${prefix}menubasico
┇ |♱˖ ▸ ${prefix}menudownload
┇ |♱˖ ▸ ${prefix}menufig
┇ |♱˖ ▸ ${prefix}menulink
┇ |♱˖ ▸ ${prefix}menuvip
┇ |♱˖ ▸ ${prefix}menuanimes
┇ |♱˖ ▸ ${prefix}menurpg
┇ |
┇ | ♰ *𝐈𝐍𝐅𝐎𝐒 / 𝐂𝐇𝐄𝐂𝐊𝐒*
┇ |♱˖ ▸ ${prefix}ping
┇ |♱˖ ▸ ${prefix}status
┇ |♱˖ ▸ ${prefix}infogp
┇ |♱˖ ▸ ${prefix}ranking
┇ |♱˖ ▸ ${prefix}estatisticas
┇ |
┇ | ♰ *𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒*
┇ |💿⋆͜͡҈➳ ${prefix}play
┇ |💿⋆͜͡҈➳ ${prefix}video
┇ |💿⋆͜͡҈➳ ${prefix}tiktok
┇ |💿⋆͜͡҈➳ ${prefix}insta
┇ |💿⋆͜͡҈➳ ${prefix}ytsearch
┇ |💿⋆͜͡҈➳ ${prefix}spotify
┇ |
┇ | ♰ *𝐏𝐄𝐒𝑄𝐔𝐈𝐒𝐀𝐒*
┇ |🎲⋆͜͡҈➳ ${prefix}consultar
┇ |🎲⋆͜͡҈➳ ${prefix}clima
┇ |🎲⋆͜͡҈➳ ${prefix}google
┇ |🎲⋆͜͡҈➳ ${prefix}wiki
┇ |🎲⋆͜͡҈➳ ${prefix}cpf
┇ |🎲⋆͜͡҈➳ ${prefix}cnpj
┇ |🎲⋆͜͡҈➳ ${prefix}placa
┇ |🎲⋆͜͡҈➳ ${prefix}cep
┇ |🎲⋆͜͡҈➳ ${prefix}ip
┇ |
┇ | ♰ *𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄̂𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋*
┇ |✨⋆͜͡҈➳ ${prefix}gpt
┇ |✨⋆͜͡҈➳ ${prefix}gerar
┇ |✨⋆͜͡҈➳ ${prefix}anime
┇ |✨⋆͜͡҈➳ ${prefix}revelar
┇ |
┇ | ♰ *𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒*
┇ |🎭⋆͜͡҈➳ ${prefix}s
┇ |🎭⋆͜͡҈➳ ${prefix}fstiker
┇ |🎭⋆͜͡҈➳ ${prefix}attp
┇ |🎭⋆͜͡҈➳ ${prefix}rename
┇ |🎭⋆͜͡҈➳ ${prefix}toimg
┇ |🎭⋆͜͡҈➳ ${prefix}togif
┇ |
┇ | ♰ *𝐉𝐎𝐆𝐎𝐒 & 𝐙𝐎𝐄𝐈𝐑𝐀*
┇ |🕹⋆͜͡҈➳ ${prefix}velha
┇ |🕹⋆͜͡҈➳ ${prefix}forca
┇ |🕹⋆͜͡҈➳ ${prefix}roleta
┇ |🕹⋆͜͡҈➳ ${prefix}quiz
┇ |🕹⋆͜͡҈➳ ${prefix}jokenpo
┇ |🕹⋆͜͡҈➳ ${prefix}enquete
┇ |🕹⋆͜͡҈➳ ${prefix}gay
┇ |🕹⋆͜͡҈➳ ${prefix}corno
┇ |🕹⋆͜͡҈➳ ${prefix}gado
┇ |🕹⋆͜͡҈➳ ${prefix}fofo
┇ |🕹⋆͜͡҈➳ ${prefix}lindo
┇ |🕹⋆͜͡҈➳ ${prefix}beijar
┇ |🕹⋆͜͡҈➳ ${prefix}abracar
┇ |🕹⋆͜͡҈➳ ${prefix}tapa
┇ |🕹⋆͜͡҈➳ ${prefix}chute
┇ |🕹⋆͜͡҈➳ ${prefix}namorar
┇ |🕹⋆͜͡҈➳ ${prefix}casais
┇ |🕹⋆͜͡҈➳ ${prefix}comer
┇ |🕹⋆͜͡҈➳ ${prefix}shipar
┇ |
┇ | 🛡️ *𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐂̧𝐀̃𝐎*
┇ |🛡⋆͜͡҈➳ ${prefix}ban
┇ |🛡⋆͜͡҈➳ ${prefix}kick
┇ |🛡⋆͜͡҈➳ ${prefix}promover
┇ |🛡⋆͜͡҈➳ ${prefix}rebaixar
┇ |🛡⋆͜͡҈➳ ${prefix}marcar
┇ |🛡⋆͜͡҈➳ ${prefix}del
┇ |🛡⋆͜͡҈➳ ${prefix}mute
┇ |🛡⋆͜͡҈➳ ${prefix}unmute
┇ |🛡⋆͜͡҈➳ ${prefix}config
┇ |🛡⋆͜͡҈➳ ${prefix}noturno
┇ |🛡⋆͜͡҈➳ ${prefix}bemvindo1
┇ |🛡⋆͜͡҈➳ ${prefix}bemvindo2
┇ |🛡⋆͜͡҈➳ ${prefix}nomegp
┇ |🛡⋆͜͡҈➳ ${prefix}descgp
┇ |🛡⋆͜͡҈➳ ${prefix}fotogp
┇ |🛡⋆͜͡҈➳ ${prefix}linkgp
┇ |🛡⋆͜͡҈➳ ${prefix}resetlink
┇ |🛡⋆͜͡҈➳ ${prefix}advertir
┇ |🛡⋆͜͡҈➳ ${prefix}radv
┇ |🛡⋆͜͡҈➳ ${prefix}postar_status
┇ |
┇ | 🛡️ *𝐒𝐄𝐆𝐔𝐑𝐀𝐍𝐂̧𝐀 (𝐓𝐑𝐀𝐕𝐀𝐒)*
┇ |🛡⋆͜͡҈➳ ${prefix}antidelete
┇ |🛡⋆͜͡҈➳ ${prefix}antilink
┇ |🛡⋆͜͡҈➳ ${prefix}antipromote
┇ |🛡⋆͜͡҈➳ ${prefix}antidemote
┇ |🛡⋆͜͡҈➳ ${prefix}antifake
┇ |🛡⋆͜͡҈➳ ${prefix}antiporn
┇ |🛡⋆͜͡҈➳ ${prefix}bemvindo
┇ |
┇ | 💰 *𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀*
┇ |💰⋆͜͡҈➳ ${prefix}minerar
┇ |💰⋆͜͡҈➳ ${prefix}cassino
┇ |💰⋆͜͡҈➳ ${prefix}saldo
┇ |💰⋆͜͡҈➳ ${prefix}pix
┇ |
┇ | 🚀 *𝐎𝐔𝐓𝐑𝐎𝐒*
┇ |🌀⋆͜͡҈➳ ${prefix}lembrete
┇ |🌀⋆͜͡҈➳ ${prefix}fato
┇ |
┇╰┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ ⚡ ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆
    _${NomeDoBot} Power by ${DonoName}_
`;

            await sock.sendMessage(from, {
                image: { url: "https://files.catbox.moe/t7w3gk.jpg" },
                caption: menuText,
                mentions: [sender]
            });

            return "O Menu foi exibido.";
        } catch (e) {
            return `Erro ao exibir o menu: ${e.message}`;
        }
    }
};
