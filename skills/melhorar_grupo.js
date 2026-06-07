const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { isOwnerNumber } = require('../config');

const Logger = global.Logger || {
    info: (...a) => console.log("[INFO]", ...a),
    error: (...a) => console.error("[ERROR]", ...a),
    success: (...a) => console.log("[SUCCESS]", ...a)
};

module.exports = {
    definition: {
        function: {
            name: "melhorar_grupo",
            description: "Usa inteligência artificial para criar e aplicar uma nova foto de perfil gerada por IA para o grupo, atualizar o nome ou melhorar a descrição do grupo de forma criativa. O bot precisa ser administrador. Só use se o Marcos/dono solicitar.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["foto", "nome", "descricao", "foto_ia"],
                        description: "O que atualizar: 'foto_ia' gera uma nova foto com IA baseada no nome e descrição do grupo. 'foto' usa uma imagem citada/respondida. 'nome' muda o nome do grupo. 'descricao' muda a descrição."
                    },
                    valor: {
                        type: "string",
                        description: "Para acao='nome': o novo nome do grupo. Para acao='descricao': a nova descrição. Para acao='foto_ia': instrução/estilo extra opcional (ex: 'estilo anime', 'dark neon', 'minimalista')."
                    }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, message, isOwner }) {
        if (!from.endsWith('@g.us')) {
            return "❌ Este comando só funciona em grupos.";
        }

        const sender = message.key.participant || message.key.remoteJid;
        if (!isOwner && !isOwnerNumber(sender)) {
            let isAdmin = false;
            try {
                const metadata = await sock.groupMetadata(from);
                const participant = metadata.participants.find(p => p.id.split('@')[0] === sender.split('@')[0]);
                isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            } catch (e) {}
            if (!isAdmin) {
                return "❌ Apenas administradores ou o Marcos podem usar esse comando.";
            }
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const groupName = metadata.subject || "grupo";
            const groupDesc = metadata.desc || "";

            let action = (args.acao || "").trim().toLowerCase();
            let val = (args.valor || "").trim();

            // Se veio via comando direto (/melhorar_grupo acao valor)
            if (!action && (args.texto || args.alvo)) {
                const rawText = (args.texto || args.alvo).trim();
                const parts = rawText.split(/\s+/);
                action = parts[0].toLowerCase();
                val = parts.slice(1).join(" ");
            }

            if (!action) {
                return "❌ Por favor, especifique uma ação: `foto_ia`, `foto`, `nome`, ou `descricao`.\nExemplo: `/melhorar_grupo foto_ia`";
            }

            switch (action) {

                case "nome": {
                    if (!val) return "❌ Informe o novo nome do grupo.";
                    await sock.groupUpdateSubject(from, val);
                    return `✅ Nome do grupo atualizado para *${val}* com sucesso! 🔥`;
                }

                case "descricao": {
                    if (!val) return "❌ Informe a nova descrição.";
                    await sock.groupUpdateDescription(from, val);
                    return `✅ Descrição do grupo atualizada!\n\n📝 *Nova descrição:*\n${val}`;
                }

                case "foto": {
                    const contextInfo = message.message?.extendedTextMessage?.contextInfo ||
                                       message.message?.[Object.keys(message.message || {})[0]]?.contextInfo;
                    const quotedMsg = contextInfo?.quotedMessage;
                    if (!quotedMsg || !quotedMsg.imageMessage) {
                        return "❌ Responda a uma imagem dizendo para mudar a foto do grupo.";
                    }
                    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    await sock.updateProfilePicture(from, buffer);
                    return "✅ Foto do grupo alterada com sucesso! 📸";
                }

                case "foto_ia": {
                    await sock.sendMessage(from, { text: `🎨 Gerando nova foto para o grupo *${groupName}* com inteligência artificial... aguenta aí! 🤖✨` });

                    // Monta o prompt baseado no nome + descrição + estilo extra
                    const extraStyle = val ? `, ${val}` : '';
                    const promptBase = [
                        groupName,
                        groupDesc ? groupDesc.slice(0, 120) : ''
                    ].filter(Boolean).join(", ");

                    const promptFull = `WhatsApp group profile picture for a group called "${promptBase}", vibrant, modern, digital art, high quality${extraStyle}, no text, no watermark, square format, eye-catching`;
                    const encodedPrompt = encodeURIComponent(promptFull);
                    const seed = Math.floor(Math.random() * 99999);

                    // Tenta duas APIs de geração de imagem gratuitas
                    let imageBuffer = null;

                    // Tentativa 1: Pollinations.ai
                    try {
                        Logger.info("melhorar_grupo", `Gerando imagem via Pollinations | Prompt: ${promptFull.slice(0, 80)}...`);
                        const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=512&height=512&nologo=true&model=flux`;
                        const response = await axios.get(imgUrl, {
                            responseType: 'arraybuffer',
                            timeout: 30000,
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                        if (response.data && response.data.byteLength > 5000) {
                            imageBuffer = Buffer.from(response.data);
                            Logger.success("melhorar_grupo", "Imagem gerada com sucesso via Pollinations.ai!");
                        }
                    } catch (e1) {
                        Logger.error("melhorar_grupo", `Pollinations falhou: ${e1.message}`);
                    }

                    // Tentativa 2: LoremFlickr fallback se Pollinations falhar
                    if (!imageBuffer) {
                        try {
                            Logger.info("melhorar_grupo", "Fallback para imagem alternativa...");
                            const fallbackUrl = `https://loremflickr.com/512/512/group,community,vibrant,abstract`;
                            const fallbackResponse = await axios.get(fallbackUrl, {
                                responseType: 'arraybuffer',
                                timeout: 15000
                            });
                            if (fallbackResponse.data && fallbackResponse.data.byteLength > 5000) {
                                imageBuffer = Buffer.from(fallbackResponse.data);
                                Logger.info("melhorar_grupo", "Imagem alternativa obtida via LoremFlickr.");
                            }
                        } catch (e2) {
                            Logger.error("melhorar_grupo", `Fallback LoremFlickr falhou: ${e2.message}`);
                        }
                    }

                    if (!imageBuffer) {
                        return "❌ Não consegui gerar a imagem agora. Os servidores de IA estão instáveis. Tenta novamente em alguns instantes!";
                    }

                    // Salva temporariamente para debugar
                    const tempPath = path.join(__dirname, '..', 'temp_media', `group_photo_${Date.now()}.jpg`);
                    try {
                        const tempDir = path.join(__dirname, '..', 'temp_media');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                        fs.writeFileSync(tempPath, imageBuffer);
                    } catch (e) {}

                    // Envia preview da imagem antes de atualizar
                    await sock.sendMessage(from, {
                        image: imageBuffer,
                        caption: `🖼️ *Preview da nova foto do grupo!*\n\n_Gerada por IA com base no nome e descrição do grupo._\n\nAplicando agora... ✨`
                    });

                    // Aplica como foto do grupo
                    await sock.updateProfilePicture(from, imageBuffer);

                    // Limpeza do arquivo temp
                    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}

                    Logger.success("melhorar_grupo", `Foto do grupo ${groupName} atualizada com imagem gerada por IA!`);
                    return `✅ *Feito!* Foto do grupo *${groupName}* atualizada com a imagem gerada pela IA! Ficou top demais! 🔥🎨`;
                }

                default:
                    return "❌ Ação desconhecida. Use: foto_ia, foto, nome, descricao.";
            }
        } catch (err) {
            Logger.error("melhorar_grupo", err);
            return `❌ Erro ao executar ação no grupo: ${err.message}\n_(O bot precisa ser administrador do grupo para alterar informações.)_`;
        }
    }
};
