module.exports = {
    definition: {
        function: {
            name: "dado_rpg",
            description: "Rola dados para RPG com notação NdN (ex: 2d6, 1d20). Suporta múltiplos dados, modificadores e sistemas como D&D.",
            parameters: {
                type: "object",
                properties: {
                    expressao: {
                        type: "string",
                        description: "Expressão de dados (ex: '2d6', '1d20+5', '3d8-2', '4d6k3' para jogar 4 e manter os 3 melhores)."
                    }
                },
                required: ["expressao"]
            }
        }
    },
    async execute(args, { sock, from, pushname }) {
        const rawTexto = (args.expressao || args.texto || args.alvo || '').trim();

        if (!rawTexto) {
            return [
                `🎲 *DADO DE RPG - USO*`,
                ``,
                `/dado 1d20 → dado de 20 faces`,
                `/dado 2d6 → dois dados de 6`,
                `/dado 2d6+3 → dois d6 com +3`,
                `/dado 4d6k3 → 4d6 mantendo 3 melhores`,
                `/dado 1d20-2 → 1d20 com -2`,
                ``,
                `_Sistemas suportados: D&D, Pathfinder, GURPS, etc._`
            ].join('\n');
        }

        try {
            const resultado = rolarExpressao(rawTexto, pushname);
            await sock.sendMessage(from, { text: resultado });
            return "Dado rolado!";
        } catch (e) {
            return `❌ Expressão inválida: "${rawTexto}"\n\nExemplos: 1d20, 2d6+5, 4d6k3`;
        }
    }
};

function rolarExpressao(expr, pushname) {
    const exprLow = expr.toLowerCase().trim();

    // Expressões múltiplas separadas por espaço (ex: "1d20 2d6+3")
    const partes = exprLow.split(/\s+/);
    if (partes.length > 1 && partes.every(p => /^\d*d\d+/.test(p))) {
        const resultados = partes.map(p => rolarParte(p));
        let text = `🎲 *ROLAGEM MÚLTIPLA* 🎲\n\n`;
        let total = 0;
        resultados.forEach((r, i) => {
            text += `🎯 *${partes[i].toUpperCase()}:* ${r.detalhes}\n`;
            text += `   Resultado: *${r.total}*\n\n`;
            total += r.total;
        });
        text += `⚡ *TOTAL GERAL: ${total}*\n\n_${pushname || 'aventureiro'} rolou os dados do submundo. 💀_`;
        return text;
    }

    // Expressão simples
    const r = rolarParte(exprLow);
    let emoji = '🎲';
    if (r.total === r.max) emoji = '🔥';
    else if (r.total === r.min) emoji = '💀';

    let text = `${emoji} *ROLAGEM: ${expr.toUpperCase()}* ${emoji}\n\n`;
    if (r.dados.length > 1) {
        text += `🎯 *Dados:* [${r.dados.join(', ')}]\n`;
        if (r.kept) text += `✂️ *Mantidos:* [${r.kept.join(', ')}]\n`;
        text += `\n`;
    }
    if (r.modificador !== 0) {
        text += `➕ *Modificador:* ${r.modificador > 0 ? '+' : ''}${r.modificador}\n`;
    }
    text += `🏆 *RESULTADO: *${r.total}**`;

    if (r.faces === 20) {
        if (r.dados[0] === 20 && r.dados.length === 1) text += `\n\n🌟 *CRÍTICO NATURAL! 20!* 🌟`;
        else if (r.dados[0] === 1 && r.dados.length === 1) text += `\n\n💀 *FALHA CRÍTICA! 1!* 💀`;
    }

    text += `\n\n_${pushname || 'aventureiro'} rolou os dados do destino. 💀_`;
    return text;
}

function rolarParte(expr) {
    // Suporta: NdN, NdN+M, NdN-M, NdNkK (keep highest K)
    const match = expr.match(/^(\d*)d(\d+)(?:k(\d+))?([+-]\d+)?$/);
    if (!match) throw new Error('Expressão inválida');

    const qtd = parseInt(match[1]) || 1;
    const faces = parseInt(match[2]);
    const keep = match[3] ? parseInt(match[3]) : null;
    const mod = match[4] ? parseInt(match[4]) : 0;

    if (qtd > 100) throw new Error('Muitos dados');
    if (faces < 2 || faces > 10000) throw new Error('Faces inválidas');

    const dados = [];
    for (let i = 0; i < qtd; i++) {
        dados.push(Math.floor(Math.random() * faces) + 1);
    }

    let usados = [...dados];
    let kept = null;

    if (keep !== null && keep < qtd) {
        usados = [...dados].sort((a, b) => b - a).slice(0, keep);
        kept = usados;
    }

    const soma = usados.reduce((a, b) => a + b, 0) + mod;

    return {
        dados,
        kept,
        faces,
        modificador: mod,
        total: soma,
        min: usados.length + mod,
        max: usados.length * faces + mod,
        detalhes: kept
            ? `[${dados.join(', ')}] → mantendo [${kept.join(', ')}]${mod !== 0 ? ` ${mod > 0 ? '+' : ''}${mod}` : ''}`
            : `[${dados.join(', ')}]${mod !== 0 ? ` ${mod > 0 ? '+' : ''}${mod}` : ''}`
    };
}
