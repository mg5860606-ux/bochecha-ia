const fs = require('fs');
const path = require('path');
const DB = path.join(__dirname, 'database_votacao.json');

function load() { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return {}; } }
function save(d) { fs.writeFileSync(DB, JSON.stringify(d, null, 2)); }

module.exports = {
    definition: {
        function: {
            name: "votacao",
            description: "Sistema de votações com contagem de votos. Cada membro vota uma vez.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["criar", "votar", "resultado", "encerrar"], description: "Ação." },
                    pergunta: { type: "string", description: "Pergunta ou título da votação." },
                    opcao: { type: "string", description: "Opção para votar ou opções separadas por vírgula." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname }) {
        const db = load();
        const ck = from.replace(/@.+/, '');
        const raw = (args.texto || args.alvo || '').trim();
        const low = raw.toLowerCase();

        // MODO COMANDO DIRETO
        if (!args.acao) {
            if (!raw) {
                if (db[ck] && db[ck].ativa) return mostrarResultado(db[ck]);
                return `/votacao criar Pergunta? Op1, Op2, Op3\n/votacao votar <opção>\n/votacao resultado\n/votacao encerrar`;
            }
            if (low.startsWith('criar ')) return criarVotacao(db, ck, raw.slice(6), sender, pushname);
            if (low.startsWith('votar ')) return votar(db, ck, raw.slice(6), sender, pushname);
            if (low === 'resultado' || low === 'ver') return db[ck]?.ativa ? mostrarResultado(db[ck]) : "❌ Sem votação ativa.";
            if (low === 'encerrar' || low === 'fechar') return encerrar(db, ck);
            // Tenta votar direto
            if (db[ck]?.ativa) return votar(db, ck, raw, sender, pushname);
            return criarVotacao(db, ck, raw, sender, pushname);
        }

        // MODO IA
        switch (args.acao) {
            case 'criar': return criarVotacao(db, ck, args.pergunta + (args.opcao ? ' ' + args.opcao : ''), sender, pushname);
            case 'votar': return votar(db, ck, args.opcao || '', sender, pushname);
            case 'resultado': return db[ck]?.ativa ? mostrarResultado(db[ck]) : "❌ Sem votação ativa.";
            case 'encerrar': return encerrar(db, ck);
            default: return "❌ Ação inválida.";
        }
    }
};

function criarVotacao(db, ck, texto, sender, pushname) {
    if (!texto) return "❌ Informe: /votacao criar Pergunta? Op1, Op2, Op3";
    let pergunta = texto, opcoes = [];
    const sq = texto.split('?');
    if (sq.length >= 2) { pergunta = sq[0].trim(); const r = sq.slice(1).join('?').trim(); if (r) opcoes = r.split(',').map(o => o.trim()).filter(o => o); }
    if (opcoes.length < 2) { const p = texto.split(','); if (p.length >= 3) { pergunta = p[0].trim(); opcoes = p.slice(1).map(o => o.trim()).filter(o => o); } }
    if (opcoes.length < 2) return "❌ Precisa de pelo menos 2 opções separadas por vírgula.";
    const votos = {};
    opcoes.forEach(o => { votos[o] = []; });
    db[ck] = { ativa: true, pergunta, opcoes, votos, criador: sender, data: Date.now() };
    save(db);
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    let t = `🗳️ *VOTAÇÃO ABERTA!* 🗳️\n\n❓ *${pergunta}*\n\n`;
    opcoes.forEach((o, i) => { t += `${emojis[i] || '▸'} ${o}\n`; });
    t += `\n_Vote com: /votacao votar <opção>_\n_Criada por ${pushname}. 💀_`;
    return t;
}

function votar(db, ck, opcao, sender, pushname) {
    if (!db[ck]?.ativa) return "❌ Sem votação ativa. Crie uma com /votacao criar";
    const vot = db[ck];
    const op = opcao.trim();
    // Busca match parcial
    const match = vot.opcoes.find(o => o.toLowerCase() === op.toLowerCase()) ||
                  vot.opcoes.find(o => o.toLowerCase().includes(op.toLowerCase()));
    if (!match) return `❌ Opção "${op}" não existe.\nOpções: ${vot.opcoes.join(', ')}`;
    // Verifica se já votou
    for (const k in vot.votos) {
        const idx = vot.votos[k].indexOf(sender);
        if (idx !== -1) { vot.votos[k].splice(idx, 1); break; }
    }
    vot.votos[match].push(sender);
    save(db);
    const total = Object.values(vot.votos).reduce((a, b) => a + b.length, 0);
    return `✅ *${pushname}* votou em *${match}*! (${total} voto${total > 1 ? 's' : ''} no total) 💀`;
}

function mostrarResultado(vot) {
    const total = Object.values(vot.votos).reduce((a, b) => a + b.length, 0) || 1;
    let t = `🗳️ *RESULTADO DA VOTAÇÃO* 🗳️\n\n❓ *${vot.pergunta}*\n\n`;
    const sorted = Object.entries(vot.votos).sort((a, b) => b[1].length - a[1].length);
    sorted.forEach(([op, voters]) => {
        const pct = Math.round((voters.length / total) * 100);
        const bar = '▓'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        t += `📊 *${op}:* ${voters.length} (${pct}%)\n[${bar}]\n\n`;
    });
    t += `_Total: ${total} voto(s). 💀_`;
    return t;
}

function encerrar(db, ck) {
    if (!db[ck]?.ativa) return "❌ Sem votação ativa.";
    const res = mostrarResultado(db[ck]);
    db[ck].ativa = false;
    save(db);
    return `🏁 *VOTAÇÃO ENCERRADA!* 🏁\n\n${res}`;
}
