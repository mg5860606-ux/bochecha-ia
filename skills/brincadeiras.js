module.exports = {
    definition: {
        function: {
            name: "brincadeiras",
            description: "Comandos de diversão e zoeira do grupo com envio de fotos e animações (gay, corno, beijar, etc).",
            parameters: {
                type: "object",
                properties: {
                    comando: { 
                        type: "string", 
                        enum: ["gay", "corno", "gado", "fofo", "lindo", "beijar", "atacar", "matar", "shipar", "casal", "tapa", "chute", "comer", "abracar"],
                        description: "Qual brincadeira executar." 
                    },
                    alvo: { 
                        type: "string", 
                        description: "O nome ou menção da pessoa (opcional)." 
                    }
                },
                required: ["comando"]
            }
        }
    },
    async execute(args, { sock, from, pushname, message }) {
        const percent = Math.floor(Math.random() * 101);
        const mentioned = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid 
            || message?.message?.extendedTextMessage?.contextInfo?.participant && [message.message.extendedTextMessage.contextInfo.participant]
            || [];
        // Se args.alvo vier como @número da IA, usa direto; senão usa o mencionado ou fallback
        const targetRaw = mentioned[0] ? `@${mentioned[0].split('@')[0]}` : (args.alvo || "Você");
        const target = targetRaw;
        
        let mediaUrl = "";
        let caption = "";
        let isGif = false;

        switch (args.comando) {
            case "gay":
                mediaUrl = "https://files.catbox.moe/kgu21k.jpg"; 
                caption = `🌈 *EXAME DE GAY:* \n\nAnalizando o DNA de ${target}...\n\nO resultado é: *${percent}% GAY!* 🏳️‍🌈`;
                break;
            case "corno":
                mediaUrl = "https://files.catbox.moe/7h4s7j.jpg"; 
                caption = `🐂 *MEDIDOR DE CHIFRE:* \n\nO gado ${target} está com um chifre de: \n*${percent}% CORNO!* 🤘`;
                break;
            case "gado":
                mediaUrl = "https://files.catbox.moe/u6v9w1.jpg";
                caption = `🌾 *GADOMETRO:* \n\n${target} é *${percent}% GADO!* 🐄`;
                break;
            case "beijar":
                mediaUrl = "https://media.tenor.com/7T9X_5Tsh_4AAAAC/anime-kiss.gif";
                caption = `💋 ${pushname} mandou um beijão para ${target}! ❤️`;
                isGif = true;
                break;
            case "matar":
                mediaUrl = "https://media.tenor.com/8N69FmRzM3AAAAAC/coffin-dance.gif";
                caption = `💀 ${pushname} acaba de assassinar ${target}! ⚰️`;
                isGif = true;
                break;
            case "tapa":
                mediaUrl = "https://media.tenor.com/4S06Y1aW_8MAAAAC/slap.gif";
                caption = `🖐️ ${pushname} deu um tapão em ${target}! 💥`;
                isGif = true;
                break;
            case "chute":
                mediaUrl = "https://media.tenor.com/fK5R8BvH7YAAAAAC/anime-kick.gif";
                caption = `🦶 ${pushname} deu um chute em ${target}! 💨`;
                isGif = true;
                break;
            case "abracar":
                mediaUrl = "https://media.tenor.com/0vM08N5x4YMAAAAC/anime-hug.gif";
                caption = `🫂 ${pushname} abraçou ${target}! ✨❤️`;
                isGif = true;
                break;
            case "comer":
                mediaUrl = "https://files.catbox.moe/u6v9w1.jpg";
                caption = `😋 ${pushname} está comendo ${target} sem dó! 🔥🔞`;
                break;
            case "fofo":
                mediaUrl = "https://media.tenor.com/2X9tS2S_qLAAAAAC/cute-kitten.gif";
                caption = `✨ *NÍVEL DE FOFURA:* \n\n${target} é *${percent}% FOFO(A)!* 🥰`;
                isGif = true;
                break;
            case "lindo":
                mediaUrl = "https://files.catbox.moe/8t4a7v.jpg"; // Reutilizando moldura ou similar
                caption = `💎 *BELEZA REAL:* \n\n${target} é *${percent}% LINDO(A)!* 😍`;
                break;
            case "atacar":
                mediaUrl = "https://media.tenor.com/p_pD_pZ_pIAAAAAC/anime-sword-slash.gif";
                caption = `⚔️ ${pushname} atacou ${target}! CAUSOU ${percent} DE DANO! 💥`;
                isGif = true;
                break;
            case "shipar":
            case "casal":
                if (mentioned.length < 2) return "❌ Mencione duas pessoas para eu shipar ou ver o casal!";
                const user1 = `@${mentioned[0].split('@')[0]}`;
                const user2 = `@${mentioned[1].split('@')[0]}`;
                mediaUrl = "https://files.catbox.moe/8t4a7v.jpg";
                caption = `💘 *SHIPÔMETRO:* \n\n💖 *${user1}* \n💖 *${user2}* \n\nChance: *${percent}%*! 💍`;
                break;
        }

        const msgPayload = {
            caption: caption,
            mentions: mentioned.length > 0 ? mentioned : []
        };

        if (isGif) {
            msgPayload.video = { url: mediaUrl };
            msgPayload.gifPlayback = true;
        } else {
            msgPayload.image = { url: mediaUrl };
        }

        await sock.sendMessage(from, msgPayload);
        return "Zoeira enviada com mídia!";
    }
};
