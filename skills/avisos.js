const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_avisos.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

module.exports = {
    definition: {
        function: {
            name: "avisos",
            description: "Gerencia avisos fixos e regras do grupo. Adiciona, lista, remove e pina avisos importantes.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["adicionar", "listar", "remover", "limpar", "regras"],
                        description: "Ação a executar."
                    },
                    texto: { type: "string", description: "Texto do aviso." },
                    numero: { type: "number", description: "Número do aviso a remover." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, isOwner, message }) {
        const db = loadDB();
        const chatKey = from.replace('@g.us', '').replace('@s.whatsapp.net', '');
        if (!db[chatKey]) db[chatKey] = { avisos: [], regras: [] };

        // Verifica admin
        let isAdmin = isOwner;
        if (!isAdmin && from.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(from);
                const p = meta.participants.find(p => p.id === sender || p.id === sender + '@s.whatsapp.net');
                if (p && (p.admin === 'admin' || p.admin === 'superadmin')) isAdmin = true;
            } catch {}
        }

        // ── MODO COMANDO DIRETO ──
        // /avisos → listar avisos
        // /avisos add Texto do aviso
        // /avisos remover 1
        // /avisos limpar
        // /regras → listar regras do grupo
        if (!args.acao) {
            const rawTexto = (args.texto || args.alvo || '').trim();
            const low = rawTexto.toLowerCase();
            const parts = rawTexto.split(/\s+/);
            const subcmd = parts[0];

            if (!rawTexto || low === 'listar' || low === 'ver' || low === 'list') {
                return listarAvisos(db[chatKey]);
            }

            if (low === 'limpar') {
                if (!isAdmin) return "❌ Apenas administradores podem limpar avisos.";
                db[chatKey].avisos = [];
                saveDB(db);
                return "✅ Todos os avisos removidos! 💀";
            }

            if (low.startsWith('remover ') || low.startsWith('del ') || low.startsWith('rm ')) {
                if (!isAdmin) return "❌ Apenas administradores podem remover avisos.";
                const num = parseInt(parts[1]);
                if (isNaN(num) || num < 1 || num > db[chatKey].avisos.length) {
                    return `❌ Número inválido. Use /avisos remover <número>.`;
                }
                const removido = db[chatKey].avisos.splice(num - 1, 1)[0];
                saveDB(db);
                return `✅ Aviso #${num} removido: "${removido.texto.substring(0, 50)}..." 💀`;
            }

            if (low.startsWith('add ') || low.startsWith('adicionar ')) {
                if (!isAdmin) return "❌ Apenas administradores podem adicionar avisos.";
                const texto = rawTexto.replace(/^(add|adicionar)\s+/i, '').trim();
                if (!texto) return "❌ Informe o texto do aviso.";
                db[chatKey].avisos.push({ texto, data: Date.now(), autor: sender });
                saveDB(db);
                return `📌 *AVISO #${db[chatKey].avisos.length} ADICIONADO!*\n\n_${texto}_\n\n_fixado no mural do submundo. 💀_`;
            }

            // Fallback: adicionar aviso direto
            if (isAdmin) {
                db[chatKey].avisos.push({ texto: rawTexto, data: Date.now(), autor: sender });
                saveDB(db);
                return `📌 *AVISO #${db[chatKey].avisos.length} ADICIONADO!*\n\n_${rawTexto}_\n\n_fixado. 💀_`;
            }

            return listarAvisos(db[chatKey]);
        }

        // ── MODO IA ──
        switch (args.acao) {
            case 'adicionar': {
                if (!isAdmin) return "❌ Apenas administradores podem adicionar avisos.";
                if (!args.texto) return "❌ Informe o texto do aviso.";
                db[chatKey].avisos.push({ texto: args.texto, data: Date.now(), autor: sender });
                saveDB(db);
                return `📌 *AVISO #${db[chatKey].avisos.length} ADICIONADO!*\n\n_${args.texto}_\n\n_fixado no mural do submundo. 💀_`;
            }
            case 'listar':
                return listarAvisos(db[chatKey]);
            case 'remover': {
                if (!isAdmin) return "❌ Apenas administradores podem remover avisos.";
                const num = args.numero;
                if (!num || num < 1 || num > db[chatKey].avisos.length) return "❌ Número inválido.";
                db[chatKey].avisos.splice(num - 1, 1);
                saveDB(db);
                return `✅ Aviso #${num} removido. 💀`;
            }
            case 'limpar': {
                if (!isAdmin) return "❌ Apenas administradores podem limpar avisos.";
                db[chatKey].avisos = [];
                saveDB(db);
                return "✅ Todos os avisos removidos! 💀";
            }
            case 'regras':
                return listarAvisos(db[chatKey]);
            default:
                return "❌ Ação inválida.";
        }
    }
};

function listarAvisos(chat) {
    const avisos = chat.avisos || [];
    if (avisos.length === 0) {
        return `📋 *AVISOS DO GRUPO*\n\n_Nenhum aviso fixado ainda._\n\n_Use /avisos add <texto> para adicionar. 💀_`;
    }
    let text = `📋 *AVISOS DO GRUPO* 📋\n\n`;
    avisos.forEach((a, i) => {
        const data = a.data ? new Date(a.data).toLocaleDateString('pt-BR') : '';
        text += `📌 *#${i + 1}* ${data ? `_(${data})_` : ''}\n${a.texto}\n\n`;
    });
    return text.trim() + '\n\n_mural do submundo. 💀_';
}
