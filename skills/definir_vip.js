const path = require('path');
const { isOwnerNumber } = require('../config');

const VIP_FILE = path.join(__dirname, 'database_vips.json');

module.exports = {
    definition: {
        function: {
            name: "definir_vip",
            description: "Permite ao Marcos definir um tratamento especial para um número específico. Ex: 'trate ela com o máximo de respeito e prioridade'. O bot vai lembrar e aplicar o tratamento sempre que essa pessoa interagir. Use SOMENTE quando o Marcos (isOwner) der uma ordem explícita de tratamento para alguém.",
            parameters: {
                type: "object",
                properties: {
                    numero: {
                        type: "string",
                        description: "O número ou JID da pessoa (ex: 5511999999999 ou @5511999999999)"
                    },
                    nome: {
                        type: "string",
                        description: "Nome ou apelido da pessoa (ex: Maria, VIP, amiga)"
                    },
                    tratamento: {
                        type: "string",
                        description: "A instrução de tratamento em texto livre (ex: 'trate ela com prioridade máxima e chame de rainha')"
                    },
                    acao: {
                        type: "string",
                        enum: ["definir", "remover", "listar"],
                        description: "definir = adiciona/atualiza o tratamento; remover = remove o VIP; listar = mostra todos os VIPs ativos"
                    }
                },
                required: ["acao"]
            }
        }
    },

    async execute(args, { sock, from, isOwner, message }) {
        // Apenas o Marcos pode usar essa skill
        if (!isOwner) {
            return "🚨 Acesso negado! Apenas o Marcos pode definir tratamentos especiais para outros usuários.";
        }

        const storage = global.storage || require('../sansekai').storage;
        let db = await storage.read(VIP_FILE, {});

        // Fallback para comando direto: /definir_vip <acao> [@numero] [nome] [tratamento]
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();
            if (texto) {
                const partes = texto.split(/\s+/);
                const acoes = ['definir', 'remover', 'listar'];
                if (acoes.includes(partes[0]?.toLowerCase())) {
                    args.acao = partes[0].toLowerCase();
                    if (partes[1] && (partes[1].startsWith('@') || /^[0-9]{8,}/.test(partes[1]))) {
                        args.numero = partes[1];
                        if (partes.length > 2) args.tratamento = partes.slice(2).join(' ');
                    }
                }
            }
            if (!args.acao) return "❌ Use: /definir_vip listar | /definir_vip definir @numero tratamento | /definir_vip remover @numero";
        }

        const { acao, numero, nome, tratamento } = args;

        // ── LISTAR ──────────────────────────────────────────
        if (acao === "listar") {
            const entries = Object.entries(db);
            if (entries.length === 0) {
                return "📋 Nenhum VIP definido ainda, Marcos.";
            }
            let lista = "👑 *LISTA DE VIPs DO MARCOS* 👑\n\n";
            entries.forEach(([num, info]) => {
                lista += `• @${num} (${info.nome || 'sem nome'})\n`;
                lista += `  ↳ ${info.tratamento}\n\n`;
            });
            return lista.trim();
        }

        // ── REMOVER ─────────────────────────────────────────
        if (acao === "remover") {
            if (!numero) return "⚠️ Informe o número da pessoa a remover da lista VIP.";
            const cleanNum = numero.replace(/[^0-9]/g, '');
            if (db[cleanNum]) {
                const nomeRemovido = db[cleanNum].nome || cleanNum;
                delete db[cleanNum];
                await storage.write(VIP_FILE, db);
                return `✅ Tratamento especial de *${nomeRemovido}* (@${cleanNum}) removido com sucesso.`;
            }
            return `⚠️ O número @${cleanNum} não está na lista VIP.`;
        }

        // ── DEFINIR / ATUALIZAR ──────────────────────────────
        if (acao === "definir") {
            if (!numero || !tratamento) {
                return "⚠️ Informe o número e o tratamento desejado. Ex: 'esse número @5511999 trate ela como rainha'.";
            }

            const cleanNum = numero.replace(/[^0-9]/g, '');
            const isNew = !db[cleanNum];

            db[cleanNum] = {
                nome: nome || cleanNum,
                tratamento: tratamento,
                definidoPor: "Marcos",
                definidoEm: new Date().toISOString()
            };

            await storage.write(VIP_FILE, db);

            const nomeExib = nome || `@${cleanNum}`;
            return isNew
                ? `✅ Perfeito! A partir de agora vou tratar *${nomeExib}* com tratamento especial:\n"${tratamento}"\n\nSe ela perguntar, falo que foi você quem mandou, Marcos. 👑`
                : `✅ Tratamento de *${nomeExib}* atualizado!\nNovo tratamento: "${tratamento}"`;
        }

        return "⚠️ Ação inválida. Use: definir, remover ou listar.";
    },

    /**
     * Retorna as instruções de tratamento de um número, se existirem.
     * Usado pelo sansekai para injetar no contexto da IA.
     * @param {string} numero  número limpo (sem @s.whatsapp.net)
     * @returns {Object|null}
     */
    async getVipInfo(numero) {
        try {
            const storage = global.storage;
            if (!storage) return null;
            const db = await storage.read(VIP_FILE, {});
            const cleanNum = numero.replace(/[^0-9]/g, '');
            return db[cleanNum] || null;
        } catch {
            return null;
        }
    }
};
