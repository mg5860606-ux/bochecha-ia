module.exports = {
    definition: {
        function: {
            name: "rolar_dados",
            description: "Rola um ou mais dados (de qualquer número de lados, como d6, d20) e retorna o resultado no grupo.",
            parameters: {
                type: "object",
                properties: {
                    quantidade: {
                        type: "number",
                        description: "Quantidade de dados a serem rolados (padrão: 1)."
                    },
                    lados: {
                        type: "number",
                        description: "Número de lados de cada dado (padrão: 6)."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        let qtd = args.quantidade || 1;
        let lados = args.lados || 6;
        
        // Proteção contra abuso
        if (qtd > 100) qtd = 100;
        if (lados < 2) lados = 6;
        if (lados > 1000) lados = 1000;

        let resultados = [];
        let soma = 0;
        
        for(let i=0; i<qtd; i++){
            let rolo = Math.floor(Math.random() * lados) + 1;
            resultados.push(rolo);
            soma += rolo;
        }
        
        let msg = `🎲 Rolando ${qtd} dado(s) de ${lados} lados (D${lados})...\n\n`;
        if (qtd === 1) {
            msg += `Resultado: *${soma}*`;
        } else {
            msg += `Resultados: [ ${resultados.join(', ')} ]\nSoma total: *${soma}*`;
        }
        
        await sock.sendMessage(from, { text: msg });
        return `Você rolou os dados. O resultado total foi ${soma}. Use isso no chat para brincar com o usuário.`;
    }
};
