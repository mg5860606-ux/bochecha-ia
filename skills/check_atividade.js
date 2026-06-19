const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "check_atividade",
            description: "Gera um relatório estilizado de atividade de um usuário no grupo (mensagens, mídias, figurinha, áudios, etc).",
            parameters: {
                type: "object",
                properties: {
                    usuario: { type: "string", description: "Número ou JID do usuário (opcional)." }
                }
            }
        }
    },
    async execute(args, ctx) {
        try {
            const { chatId, message, sender, sock } = ctx;
            const target = (args.usuario || '').trim();

            const dbPath = path.join(__dirname, '..', 'learnings', 'chat_activity.json');
            if (!fs.existsSync(dbPath)) {
                return 'Banco de atividade não encontrado.';
            }

            const raw = fs.readFileSync(dbPath, 'utf8');
            const db = JSON.parse(raw || '{}');
            const entries = db[chatId] || [];

            // Resolve alvo: se houve menção textual no contexto, usa ela
            let targetId = null;
            if (target) {
                // aceita número simples
                if (!target.includes('@')) {
                    const digits = target.replace(/[^0-9]/g, '');
                    targetId = digits ? `${digits}@s.whatsapp.net` : null;
                } else {
                    targetId = target;
                }
            } else if (message && message.extendedTextMessage && message.extendedTextMessage.contextInfo && message.extendedTextMessage.contextInfo.mentionedJid && message.extendedTextMessage.contextInfo.mentionedJid.length > 0) {
                targetId = message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (sender) {
                targetId = sender;
            }

            if (!targetId) return 'Não consegui determinar o usuário alvo. Use `/checkativo NUMERO` ou mencione o usuário.';

            // Normaliza para buscar no DB (o DB usa campo 'user' que pode ser @lid)
            const simple = targetId.split('@')[0];

            const userEntries = entries.filter(e => {
                if (!e || !e.user) return false;
                const u = e.user.split('@')[0];
                return u === simple || (e.lid && e.lid.split('@')[0] === simple) || (e.pushname && e.pushname.toLowerCase().includes(simple));
            });

            if (userEntries.length === 0) {
                return `❌ Não encontrei atividade recente para @${simple} neste grupo.`;
            }

            // Estatísticas simples a partir do histórico disponível
            const msgs = userEntries.length;
            const figs = userEntries.filter(e => /figurinha|sticker|fig/i.test(e.text || '')).length;
            const imgs = userEntries.filter(e => /img|imagem|foto|image/i.test(e.text || '')).length;
            const vids = userEntries.filter(e => /video|vídeo|clip/i.test(e.text || '')).length;
            const auds = userEntries.filter(e => /audio|voz|ptt|ogg|opus/i.test(e.text || '')).length;
            const docs = userEntries.filter(e => /pdf|doc|documento|zip|rar/i.test(e.text || '')).length;

            // Tentativa de inferir dispositivo a partir de textos (quando disponível)
            let device = 'Desconhecido';
            if (userEntries.some(e => /iphone|ios/i.test(e.text || ''))) device = 'Iphone';
            else if (userEntries.some(e => /android/i.test(e.text || ''))) device = 'Android';

            // Último pushname
            const last = userEntries[userEntries.length - 1];
            const display = last.pushname || simple;

            const out = [];
            out.push('╭─── ･ 𝐂𝐇𝐄𝐂𝐊 𝐀𝐓𝐈𝐕𝐈𝐃𝐀𝐃𝐄 😼');
            out.push(`├─ ⊹°🥀𝚄𝚂𝙴𝚁: @${display}`);
            out.push(`├─ ⊹°🥀𝙼𝚂𝙶: ${msgs}`);
            out.push(`├─ ⊹°🥀𝙲𝙾𝙽𝙽𝙴𝙲𝚃: ${device} 💸`);
            out.push(`├─ ⊹°🥀𝙵𝙸𝙶: ${figs}`);
            out.push(`├─ ⊹°🥀𝙲𝙼𝙳: 0`);
            out.push(`├─ ⊹°🥀𝚅𝙸𝙳𝙴𝙾: ${vids}`);
            out.push(`├─ ⊹°🥀𝙸𝙼𝙶: ${imgs}`);
            out.push(`├─ ⊹°🥀𝙰𝚄𝙳𝙸𝙾: ${auds}`);
            out.push(`├─ ⊹°🥀𝙳𝙾𝙲: ${docs}`);
            out.push('╰─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ.');

            return out.join('\n');
        } catch (e) {
            console.error(chalk.red('[check_atividade]'), e);
            return `Erro ao gerar relatório: ${e.message}`;
        }
    }
};
