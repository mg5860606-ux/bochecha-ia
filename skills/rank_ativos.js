const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "rank_ativos",
            description: "Gera o ranking dos mais ativos do chat (top 5) no estilo 'RANK ATIVOS DO CHAT'.",
            parameters: {
                type: "object",
                properties: {
                    top: { type: "number", description: "Quantidade de posições a mostrar (opcional, padrão 5)." }
                }
            }
        }
    },
    async execute(args, ctx) {
        try {
            const { chatId } = ctx;
            const topN = (args.top && Number(args.top)) ? Math.max(1, Math.min(20, Number(args.top))) : 5;

            const dbPath = path.join(__dirname, '..', 'learnings', 'chat_activity.json');
            if (!fs.existsSync(dbPath)) return 'Banco de atividade não encontrado.';

            const raw = fs.readFileSync(dbPath, 'utf8');
            const db = JSON.parse(raw || '{}');
            const entries = db[chatId] || [];

            if (!entries || entries.length === 0) return 'Sem atividade registrada neste chat.';

            // Agrega por usuário (campo 'user' preferencialmente)
            const agg = new Map();
            for (const e of entries) {
                const uid = (e.user || e.lid || e.phone || '').split('@')[0];
                if (!uid) continue;
                if (!agg.has(uid)) agg.set(uid, { uid, pushname: e.pushname || uid, msgs: 0, figs: 0, cmd: 0, video: 0, img: 0, audio: 0, doc: 0, device: 'Desconhecido' });
                const cur = agg.get(uid);
                cur.msgs += 1;
                const txt = (e.text || '').toString().toLowerCase();
                if (txt.startsWith('/') || txt.startsWith('!') || txt.startsWith('.')) cur.cmd += 1;
                if (txt.includes('figurinha') || txt.includes('sticker') || txt.includes('fig')) cur.figs += 1;
                if (txt.includes('video') || txt.includes('vídeo') || txt.includes('clip')) cur.video += 1;
                if (txt.includes('img') || txt.includes('imagem') || txt.includes('foto') || txt.includes('image')) cur.img += 1;
                if (txt.includes('audio') || txt.includes('voz') || txt.includes('ptt') || txt.includes('ogg') || txt.includes('opus')) cur.audio += 1;
                if (txt.includes('pdf') || txt.includes('doc') || txt.includes('documento') || txt.includes('zip') || txt.includes('rar')) cur.doc += 1;
                if (/iphone|ios/.test(txt)) cur.device = 'Iphone';
                else if (/android/.test(txt)) cur.device = 'Android';
            }

            const arr = Array.from(agg.values());
            arr.sort((a, b) => b.msgs - a.msgs);

            const lines = [];
            lines.push('「 *𝐑𝐀𝐍𝐊 𝐀𝐓𝐈𝐕𝐎𝐒 𝐃𝐎 𝐂𝐇𝐀𝐓* 」\n');

            const medal = ['1º 𝐋𝐔𝐆𝐀𝐑', '2º 𝐋𝐔𝐆𝐀𝐑', '3º 𝐋𝐔𝐆𝐀𝐑'];
            for (let i = 0; i < Math.min(topN, arr.length); i++) {
                const r = arr[i];
                const place = i < 3 ? medal[i] : `${i + 1}º 𝐋𝐔𝐆𝐀𝐑`;
                lines.push('╭─── ･ ' + place + ' 🏆');
                lines.push(`├─ ⊹°🥀𝚄𝚂𝙴𝚁: @${r.pushname}`);
                lines.push(`├─ ⊹°🥀𝙼𝚂𝙶: ${r.msgs}`);
                lines.push(`├─ ⊹°🥀𝙲𝙾𝙽𝙽𝙴𝙲𝚃: ${r.device} ${r.device === 'Iphone' ? '💸' : '🚀'}`);
                lines.push(`├─ ⊹°🥀𝙵𝙸𝙶: ${r.figs}`);
                lines.push(`├─ ⊹°🥀𝙲𝙼𝙳: ${r.cmd}`);
                lines.push(`├─ ⊹°🥀𝚅𝙸𝙳𝙴𝙾: ${r.video}`);
                lines.push(`├─ ⊹°🥀𝙸𝙼𝙶: ${r.img}`);
                lines.push(`├─ ⊹°🥀𝙰𝚄𝙳𝙸𝙾: ${r.audio}`);
                lines.push(`├─ ⊹°🥀𝙳𝙾𝙲: ${r.doc}`);
                lines.push('╰─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. \n');
            }

            return lines.join('\n');
        } catch (e) {
            console.error('[rank_ativos]', e);
            return `Erro ao gerar ranking: ${e.message}`;
        }
    }
};
