const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_contagem.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

module.exports = {
    definition: {
        function: {
            name: "contagem_regressiva",
            description: "Cria contagens regressivas para eventos, contadores simples do grupo e calcula tempo até uma data.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["criar_evento", "ver_eventos", "remover_evento", "incrementar_contador", "ver_contador", "zerar_contador", "tempo_ate"],
                        description: "A ação a executar."
                    },
                    nome: { type: "string", description: "Nome do evento ou contador." },
                    data: { type: "string", description: "Data no formato DD/MM/AAAA ou DD/MM/AAAA HH:MM." },
                    valor: { type: "number", description: "Valor para incrementar (padrão: 1)." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender, pushname }) {
        const db = loadDB();
        const chatKey = from.replace('@g.us', '').replace('@s.whatsapp.net', '');
        if (!db[chatKey]) db[chatKey] = { eventos: {}, contadores: {} };
        const chat = db[chatKey];

        // ── MODO COMANDO DIRETO ──
        // /contagem → ver eventos e contadores
        // /contagem evento Copa do Mundo 12/06/2026
        // /contagem +1 Banimentos
        // /contagem ver Banimentos
        // /contagem zerar Banimentos
        // /contagem tempo 31/12/2026
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();

            if (!texto) {
                // Mostra eventos e contadores
                return exibirTudo(chat);
            }

            const low = texto.toLowerCase();
            const parts = texto.split(/\s+/);

            // /contagem tempo 31/12/2026
            if (low.startsWith('tempo ')) {
                const dataStr = parts.slice(1).join(' ');
                return calcularTempoAte(dataStr);
            }

            // /contagem +N Nome → incrementa contador
            const incMatch = texto.match(/^\+(\d*)\s+(.+)$/);
            if (incMatch) {
                const inc = parseInt(incMatch[1]) || 1;
                const nome = incMatch[2].trim();
                if (!chat.contadores[nome]) chat.contadores[nome] = { total: 0 };
                chat.contadores[nome].total += inc;
                saveDB(db);
                return `🔢 *CONTADOR: ${nome}*\n\n➕ +${inc}\n📊 *Total:* *${chat.contadores[nome].total}* vezes! 💀`;
            }

            // /contagem zerar Nome
            if (low.startsWith('zerar ')) {
                const nome = texto.slice(6).trim();
                if (!chat.contadores[nome]) return `❌ Contador "${nome}" não encontrado.`;
                chat.contadores[nome].total = 0;
                saveDB(db);
                return `✅ Contador *${nome}* zerado. 💀`;
            }

            // /contagem ver Nome
            if (low.startsWith('ver ')) {
                const nome = texto.slice(4).trim();
                if (chat.contadores[nome]) {
                    return `🔢 *CONTADOR: ${nome}*\n📊 *Total:* *${chat.contadores[nome].total}* vezes! 💀`;
                }
                if (chat.eventos[nome]) {
                    const diff = chat.eventos[nome].data - Date.now();
                    if (diff < 0) return `📅 Evento *${nome}* já aconteceu!`;
                    const d = Math.floor(diff / 86400000);
                    const h = Math.floor((diff % 86400000) / 3600000);
                    return `📅 *${nome}*\n⏳ Faltam: *${d}d ${h}h* 💀`;
                }
                return `❌ Nada encontrado com o nome "${nome}".`;
            }

            // /contagem remover Nome
            if (low.startsWith('remover ')) {
                const nome = texto.slice(8).trim();
                if (chat.eventos[nome]) { delete chat.eventos[nome]; saveDB(db); return `✅ Evento "${nome}" removido.`; }
                if (chat.contadores[nome]) { delete chat.contadores[nome]; saveDB(db); return `✅ Contador "${nome}" removido.`; }
                return `❌ "${nome}" não encontrado.`;
            }

            // /contagem evento Nome DD/MM/AAAA
            const eventoMatch = texto.match(/^(?:evento\s+)?(.+?)\s+(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)$/i);
            if (eventoMatch) {
                const nome = eventoMatch[1].trim();
                const dataStr = eventoMatch[2].trim();
                return criarEvento(db, chat, chatKey, nome, dataStr);
            }

            return [
                `📅 *CONTAGEM REGRESSIVA - USO*`,
                ``,
                `/contagem → ver tudo`,
                `/contagem tempo 31/12/2026 → tempo até data`,
                `/contagem Copa 12/06/2026 → criar evento`,
                `/contagem +1 Banimentos → incrementar contador`,
                `/contagem ver Banimentos → ver contador`,
                `/contagem zerar Banimentos → zerar contador`,
                `/contagem remover Nome → remover evento/contador`
            ].join('\n');
        }

        // ── MODO IA ──
        switch (args.acao) {
            case "criar_evento":
                return criarEvento(db, chat, chatKey, args.nome, args.data);
            case "ver_eventos":
                return exibirTudo(chat);
            case "remover_evento": {
                if (!args.nome) return "❌ Informe o nome do evento.";
                if (!chat.eventos[args.nome]) return `❌ Evento "${args.nome}" não encontrado.`;
                delete chat.eventos[args.nome];
                saveDB(db);
                return `✅ Evento *${args.nome}* removido.`;
            }
            case "incrementar_contador": {
                if (!args.nome) return "❌ Informe o nome do contador.";
                const inc = args.valor || 1;
                if (!chat.contadores[args.nome]) chat.contadores[args.nome] = { total: 0 };
                chat.contadores[args.nome].total += inc;
                saveDB(db);
                return `🔢 *CONTADOR: ${args.nome}*\n➕ +${inc}\n📊 *Total:* *${chat.contadores[args.nome].total}* 💀`;
            }
            case "ver_contador": {
                if (args.nome) {
                    if (!chat.contadores[args.nome]) return `❌ Contador "${args.nome}" não encontrado.`;
                    return `🔢 *${args.nome}:* ${chat.contadores[args.nome].total} vezes 💀`;
                }
                return exibirTudo(chat);
            }
            case "zerar_contador": {
                if (!args.nome) return "❌ Informe o nome.";
                if (!chat.contadores[args.nome]) return `❌ Contador "${args.nome}" não encontrado.`;
                chat.contadores[args.nome].total = 0;
                saveDB(db);
                return `✅ Contador *${args.nome}* zerado. 💀`;
            }
            case "tempo_ate":
                return calcularTempoAte(args.data);
            default:
                return "❌ Ação inválida.";
        }
    }
};

function criarEvento(db, chat, chatKey, nome, dataStr) {
    if (!nome) return "❌ Informe o nome do evento.";
    if (!dataStr) return "❌ Informe a data.";
    let dataEvento;
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dataStr)) {
        const [dp, tp] = dataStr.split(' ');
        const [d, m, y] = dp.split('/');
        dataEvento = new Date(`${y}-${m}-${d}T${tp}:00-03:00`);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        const [d, m, y] = dataStr.split('/');
        dataEvento = new Date(`${y}-${m}-${d}T00:00:00-03:00`);
    } else {
        return "❌ Formato de data inválido. Use DD/MM/AAAA ou DD/MM/AAAA HH:MM.";
    }
    if (isNaN(dataEvento.getTime())) return "❌ Data inválida.";
    if (dataEvento < new Date()) return "❌ A data já passou.";
    chat.eventos[nome] = { data: dataEvento.getTime() };
    const db2 = loadDB();
    db2[chatKey] = chat;
    saveDB(db2);
    const diff = dataEvento - Date.now();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return `📅 *EVENTO CRIADO!*\n\n🎯 *Nome:* ${nome}\n📆 *Data:* ${dataStr}\n⏳ *Faltam:* *${d}* dias e *${h}* horas 💀`;
}

function exibirTudo(chat) {
    const agora = Date.now();
    let text = '';

    const eventos = Object.entries(chat.eventos || {}).filter(([, v]) => v.data > agora);
    if (eventos.length > 0) {
        text += `📅 *EVENTOS ATIVOS*\n\n`;
        for (const [nome, info] of eventos) {
            const diff = info.data - agora;
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            text += `🎯 *${nome}*: Faltam *${d}d ${h}h*\n`;
        }
        text += '\n';
    }

    const contadores = Object.entries(chat.contadores || {});
    if (contadores.length > 0) {
        text += `🔢 *CONTADORES*\n\n`;
        for (const [nome, info] of contadores) {
            text += `📌 *${nome}:* ${info.total} vezes\n`;
        }
    }

    if (!text) return "📭 Nenhum evento ou contador cadastrado. Use /contagem para ver o uso.";
    return text.trim() + '\n\n_dados em tempo real. 💀_';
}

function calcularTempoAte(dataStr) {
    if (!dataStr) return "❌ Informe a data. Ex: /contagem tempo 31/12/2026";
    let dataAlvo;
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dataStr)) {
        const [dp, tp] = dataStr.split(' ');
        const [d, m, y] = dp.split('/');
        dataAlvo = new Date(`${y}-${m}-${d}T${tp}:00-03:00`);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        const [d, m, y] = dataStr.split('/');
        dataAlvo = new Date(`${y}-${m}-${d}T00:00:00-03:00`);
    } else {
        return "❌ Formato inválido. Use DD/MM/AAAA ou DD/MM/AAAA HH:MM.";
    }
    if (isNaN(dataAlvo.getTime())) return "❌ Data inválida.";
    const diff = dataAlvo - Date.now();
    if (diff < 0) {
        const d = Math.floor(Math.abs(diff) / 86400000);
        const h = Math.floor((Math.abs(diff) % 86400000) / 3600000);
        return `⏰ *DATA PASSADA*\n\n📆 ${dataStr}\n\n_Essa data já passou há ${d}d e ${h}h. 💀_`;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `⏰ *CONTAGEM REGRESSIVA*\n\n📆 Data: ${dataStr}\n\n⏳ *Faltam:*\n📅 *${d}* dias\n🕐 *${h}* horas\n⏱️ *${m}* minutos\n⚡ *${s}* segundos\n\n_o tempo passa e o Bochecha não perdoa. 💀_`;
}
