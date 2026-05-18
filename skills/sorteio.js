module.exports = {
    definition: {
        function: {
            name: "sorteio",
            description: "Realiza sorteios: número aleatório, membro do grupo, item de lista, gera senha segura.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["numero", "membro", "lista", "senha", "escolher"],
                        description: "Tipo de sorteio."
                    },
                    minimo: { type: "number", description: "Mínimo para sorteio de número." },
                    maximo: { type: "number", description: "Máximo para sorteio de número." },
                    itens: { type: "string", description: "Lista de itens separados por vírgula." },
                    tamanho: { type: "number", description: "Tamanho da senha." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, message }) {
        // ── MODO COMANDO DIRETO ──
        // /sorteio → sorteia membro do grupo
        // /sorteio 1 100 → número entre 1 e 100
        // /sorteio senha → gera senha
        // /sorteio senha 16 → senha de 16 chars
        // /sorteio pizza, hamburguer, sushi → escolhe da lista
        if (!args.acao) {
            const texto = (args.texto || args.alvo || '').trim();

            // Sem argumento → sorteia membro do grupo
            if (!texto) {
                return await sortearMembro(sock, from, message);
            }

            const low = texto.toLowerCase();

            // /sorteio senha [tamanho]
            if (low.startsWith('senha')) {
                const parts = low.split(/\s+/);
                const tam = parseInt(parts[1]) || 12;
                return gerarSenha(tam);
            }

            // /sorteio 1 100 (dois números = intervalo)
            const numMatch = texto.match(/^(\d+)\s+(\d+)$/);
            if (numMatch) {
                const min = parseInt(numMatch[1]);
                const max = parseInt(numMatch[2]);
                if (min >= max) return "❌ O mínimo precisa ser menor que o máximo.";
                const r = Math.floor(Math.random() * (max - min + 1)) + min;
                return `🎲 *SORTEIO DE NÚMERO*\n\n📊 *Intervalo:* ${min} a ${max}\n🎯 *RESULTADO:* *${r}* 💀🥀`;
            }

            // /sorteio pizza, hamburguer, sushi (lista com vírgulas)
            if (texto.includes(',')) {
                const lista = texto.split(',').map(i => i.trim()).filter(i => i.length > 0);
                if (lista.length < 2) return "❌ Coloca pelo menos 2 itens separados por vírgula.";
                const escolhido = lista[Math.floor(Math.random() * lista.length)];
                return `🎯 *SORTEIO DE LISTA*\n\n📋 *Opções:* ${lista.join(', ')}\n\n🏆 *ESCOLHIDO:* *${escolhido}* 💀🥀`;
            }

            // Número único → sorteia de 1 até esse número
            const numUnico = parseInt(texto);
            if (!isNaN(numUnico) && numUnico > 1) {
                const r = Math.floor(Math.random() * numUnico) + 1;
                return `🎲 *SORTEIO DE NÚMERO*\n\n📊 *De 1 a ${numUnico}*\n🎯 *RESULTADO:* *${r}* 💀🥀`;
            }

            // Fallback → sorteio de membro
            return await sortearMembro(sock, from, message);
        }

        // ── MODO IA ──
        switch (args.acao) {
            case "numero": {
                const min = args.minimo ?? 1;
                const max = args.maximo ?? 100;
                if (min >= max) return "❌ O mínimo precisa ser menor que o máximo.";
                const r = Math.floor(Math.random() * (max - min + 1)) + min;
                return `🎲 *SORTEIO*\n\n📊 *Intervalo:* ${min} a ${max}\n🎯 *RESULTADO:* *${r}* 💀🥀`;
            }
            case "membro":
                return await sortearMembro(sock, from, message);
            case "lista":
            case "escolher": {
                if (!args.itens) return "❌ Informe os itens separados por vírgula.";
                const lista = args.itens.split(',').map(i => i.trim()).filter(i => i.length > 0);
                if (lista.length < 2) return "❌ Precisa de pelo menos 2 itens.";
                const escolhido = lista[Math.floor(Math.random() * lista.length)];
                return `🎯 *SORTEIO DE LISTA*\n\n📋 *Opções:* ${lista.join(', ')}\n\n🏆 *ESCOLHIDO:* *${escolhido}* 💀🥀`;
            }
            case "senha":
                return gerarSenha(args.tamanho || 12);
            default:
                return "❌ Ação inválida.";
        }
    }
};

async function sortearMembro(sock, from, message) {
    if (!from.endsWith('@g.us')) {
        return "❌ Sorteio de membro só funciona em grupos.";
    }
    try {
        const metadata = await sock.groupMetadata(from);
        const membros = metadata.participants.filter(p => !p.id.includes('@lid'));
        if (membros.length === 0) return "❌ Grupo vazio.";
        const sorteado = membros[Math.floor(Math.random() * membros.length)];
        const jid = sorteado.id;
        const num = jid.split('@')[0];
        await sock.sendMessage(from, {
            text: `🎯 *SORTEIO DE MEMBRO DO GRUPO* 🎯\n\n🎲 Rodando o algoritmo do destino...\n\n💀 *O ESCOLHIDO PELO SUBMUNDO É:*\n\n⚡ @${num} ⚡\n\n_não tem pra onde correr. 🥀_`,
            mentions: [jid]
        });
        return "Membro sorteado!";
    } catch (e) {
        return `❌ Erro ao sortear membro: ${e.message}`;
    }
}

function gerarSenha(tamanho) {
    const tam = Math.min(Math.max(parseInt(tamanho) || 12, 6), 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let senha = '';
    for (let i = 0; i < tam; i++) senha += chars[Math.floor(Math.random() * chars.length)];
    return `🔐 *SENHA GERADA (${tam} caracteres)*\n\n\`${senha}\`\n\n⚠️ _Guarda isso e não mostra pra ninguém. Nem pra mim. 💀_`;
}
