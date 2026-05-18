module.exports = {
    definition: {
        function: {
            name: "calcular",
            description: "Calculadora e conversor de unidades. Calcula expressões matemáticas, converte temperaturas, pesos, distâncias, velocidades. Calcula IMC, porcentagem, fatorial e potência.",
            parameters: {
                type: "object",
                properties: {
                    acao: {
                        type: "string",
                        enum: ["calcular", "converter_temp", "converter_peso", "converter_distancia", "converter_velocidade", "imc", "porcentagem", "fatorial", "potencia"],
                        description: "O tipo de operação a realizar."
                    },
                    expressao: { type: "string", description: "A expressão ou valor." },
                    de: { type: "string", description: "Unidade de origem." },
                    para: { type: "string", description: "Unidade de destino." },
                    peso: { type: "number", description: "Peso em kg para IMC." },
                    altura: { type: "number", description: "Altura em metros para IMC." },
                    total: { type: "number", description: "Valor total para porcentagem." },
                    parte: { type: "number", description: "Porcentagem a calcular." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, pushname, message }) {
        // ── MODO COMANDO DIRETO: /calcular <expressão ou subcomando> ──
        if (!args.acao || args.isCommand) {
            const texto = (args.texto || args.alvo || '').trim();

            if (!texto) {
                return [
                    `🧮 *CALCULADORA DO SUBMUNDO*`,
                    ``,
                    `📌 *Uso:* /calcular <expressão>`,
                    ``,
                    `*Exemplos:*`,
                    `  /calcular 2+2*10`,
                    `  /calcular imc 80 1.75`,
                    `  /calcular 37c em f`,
                    `  /calcular 10% de 250`,
                    `  /calcular 5!`,
                    `  /calcular 2^10`,
                    `  /calcular 5kg em lb`,
                    `  /calcular 100km em mi`
                ].join('\n');
            }

            const low = texto.toLowerCase();

            // IMC: /calcular imc 80 1.75
            const imcMatch = low.match(/^imc\s+([\d.,]+)\s+([\d.,]+)$/);
            if (imcMatch) {
                const peso = parseFloat(imcMatch[1].replace(',', '.'));
                const altura = parseFloat(imcMatch[2].replace(',', '.'));
                return calcularIMC(peso, altura);
            }

            // Porcentagem: /calcular 10% de 250 ou /calcular 10% 250
            const pctMatch = low.match(/^([\d.,]+)%\s*(?:de\s*)?([\d.,]+)$/);
            if (pctMatch) {
                const parte = parseFloat(pctMatch[1].replace(',', '.'));
                const total = parseFloat(pctMatch[2].replace(',', '.'));
                const resultado = (total * parte) / 100;
                return `📊 *PORCENTAGEM*\n\n*${parte}%* de *${total}* = *${resultado.toFixed(2)}* 💀`;
            }

            // Fatorial: /calcular 5!
            const fatMatch = texto.match(/^(\d+)!$/);
            if (fatMatch) {
                const n = parseInt(fatMatch[1]);
                if (n > 20) return "❌ Número muito grande. Máximo 20!";
                let fat = 1n;
                for (let i = 2n; i <= BigInt(n); i++) fat *= i;
                return `🔢 *FATORIAL*\n\n*${n}!* = *${fat.toString()}* 💀`;
            }

            // Potência: /calcular 2^10
            const potMatch = texto.match(/^([\d.,]+)\^([\d.,]+)$/);
            if (potMatch) {
                const base = parseFloat(potMatch[1]);
                const exp = parseFloat(potMatch[2]);
                return `⚡ *POTENCIAÇÃO*\n\n*${base}^${exp}* = *${Math.pow(base, exp)}* 💀`;
            }

            // Temperatura: /calcular 37c em f  ou  /calcular 37 celsius em fahrenheit
            const tempMatch = low.match(/^([\d.,]+)\s*(c|f|k|celsius|fahrenheit|kelvin)\s+em\s+(c|f|k|celsius|fahrenheit|kelvin)$/);
            if (tempMatch) {
                const val = parseFloat(tempMatch[1].replace(',', '.'));
                const de = normTemp(tempMatch[2]);
                const para = normTemp(tempMatch[3]);
                return converterTemp(val, de, para);
            }

            // Peso: /calcular 80kg em lb ou /calcular 80 kg em lb
            const pesoMatch = low.match(/^([\d.,]+)\s*(kg|g|lb|oz|ton)\s+em\s+(kg|g|lb|oz|ton)$/);
            if (pesoMatch) {
                const val = parseFloat(pesoMatch[1].replace(',', '.'));
                return converterPeso(val, pesoMatch[2], pesoMatch[3]);
            }

            // Distância: /calcular 100km em mi
            const distMatch = low.match(/^([\d.,]+)\s*(km|m|cm|mi|ft|in)\s+em\s+(km|m|cm|mi|ft|in)$/);
            if (distMatch) {
                const val = parseFloat(distMatch[1].replace(',', '.'));
                return converterDistancia(val, distMatch[2], distMatch[3]);
            }

            // Velocidade: /calcular 100kph em mph
            const velMatch = low.match(/^([\d.,]+)\s*(kph|mph|ms|knot)\s+em\s+(kph|mph|ms|knot)$/);
            if (velMatch) {
                const val = parseFloat(velMatch[1].replace(',', '.'));
                return converterVelocidade(val, velMatch[2], velMatch[3]);
            }

            // Expressão matemática pura
            try {
                const expr = texto.replace(/[^0-9+\-*/().% ]/g, '').trim();
                if (!expr) return "❌ Expressão inválida.";
                const resultado = Function(`"use strict"; return (${expr})`)();
                if (!isFinite(resultado)) return "❌ Erro: divisão por zero ou resultado inválido.";
                return `🧮 *CALCULADORA DO SUBMUNDO*\n\n📐 *Expressão:* \`${texto}\`\n✅ *Resultado:* *${Number(resultado.toFixed(8))}*\n\n_calculei em menos de 1ms, só pra você saber do nível. 💀_`;
            } catch (e) {
                return `❌ Não entendi essa expressão. Tenta: /calcular 2+2`;
            }
        }

        // ── MODO IA ──
        try {
            switch (args.acao) {
                case "calcular": {
                    if (!args.expressao) return "❌ Manda a expressão.";
                    const expr = args.expressao.replace(/[^0-9+\-*/().% ]/g, '').trim();
                    const resultado = Function(`"use strict"; return (${expr})`)();
                    if (!isFinite(resultado)) return "❌ Erro: divisão por zero.";
                    return `🧮 *CALCULADORA*\n\n📐 \`${args.expressao}\` = *${Number(resultado.toFixed(8))}* 💀`;
                }
                case "converter_temp": return converterTemp(parseFloat(args.expressao), args.de, args.para);
                case "converter_peso": return converterPeso(parseFloat(args.expressao), args.de, args.para);
                case "converter_distancia": return converterDistancia(parseFloat(args.expressao), args.de, args.para);
                case "converter_velocidade": return converterVelocidade(parseFloat(args.expressao), args.de, args.para);
                case "imc": return calcularIMC(args.peso, args.altura);
                case "porcentagem": {
                    const r = (args.total * args.parte) / 100;
                    return `📊 *PORCENTAGEM*\n\n*${args.parte}%* de *${args.total}* = *${r.toFixed(2)}* 💀`;
                }
                case "fatorial": {
                    const n = parseInt(args.expressao);
                    if (n > 20) return "❌ Máximo 20.";
                    let f = 1n;
                    for (let i = 2n; i <= BigInt(n); i++) f *= i;
                    return `🔢 *${n}!* = *${f.toString()}* 💀`;
                }
                case "potencia": {
                    const [b, e] = args.expressao.split('^').map(parseFloat);
                    return `⚡ *${b}^${e}* = *${Math.pow(b, e)}* 💀`;
                }
                default: return "❌ Ação inválida.";
            }
        } catch (e) {
            return `❌ Erro: ${e.message}`;
        }
    }
};

// ── Funções auxiliares ──

function normTemp(t) {
    if (t === 'c' || t === 'celsius') return 'celsius';
    if (t === 'f' || t === 'fahrenheit') return 'fahrenheit';
    if (t === 'k' || t === 'kelvin') return 'kelvin';
    return t;
}

function converterTemp(val, de, para) {
    if (isNaN(val)) return "❌ Valor inválido.";
    de = normTemp(de); para = normTemp(para);
    let r;
    if (de === 'celsius' && para === 'fahrenheit') r = val * 9/5 + 32;
    else if (de === 'fahrenheit' && para === 'celsius') r = (val - 32) * 5/9;
    else if (de === 'celsius' && para === 'kelvin') r = val + 273.15;
    else if (de === 'kelvin' && para === 'celsius') r = val - 273.15;
    else if (de === 'fahrenheit' && para === 'kelvin') r = (val - 32) * 5/9 + 273.15;
    else if (de === 'kelvin' && para === 'fahrenheit') r = (val - 273.15) * 9/5 + 32;
    else return "❌ Conversão de temperatura inválida. Use: celsius, fahrenheit, kelvin.";
    return `🌡️ *CONVERSOR DE TEMPERATURA*\n\n*${val} ${de}* = *${r.toFixed(2)} ${para}* 💀`;
}

function converterPeso(val, de, para) {
    if (isNaN(val)) return "❌ Valor inválido.";
    const t = {
        'kg_lb': v => v * 2.20462, 'lb_kg': v => v / 2.20462,
        'kg_g': v => v * 1000, 'g_kg': v => v / 1000,
        'kg_ton': v => v / 1000, 'ton_kg': v => v * 1000,
        'lb_g': v => v * 453.592, 'g_lb': v => v / 453.592,
        'oz_g': v => v * 28.3495, 'g_oz': v => v / 28.3495,
        'kg_oz': v => v * 35.274, 'oz_kg': v => v / 35.274
    };
    const fn = t[`${de}_${para}`];
    if (!fn) return "❌ Conversão não suportada. Use: kg, g, lb, oz, ton.";
    return `⚖️ *CONVERSOR DE PESO*\n\n*${val} ${de}* = *${fn(val).toFixed(4)} ${para}* 💀`;
}

function converterDistancia(val, de, para) {
    if (isNaN(val)) return "❌ Valor inválido.";
    const t = {
        'km_mi': v => v * 0.621371, 'mi_km': v => v / 0.621371,
        'km_m': v => v * 1000, 'm_km': v => v / 1000,
        'km_cm': v => v * 100000, 'cm_km': v => v / 100000,
        'm_cm': v => v * 100, 'cm_m': v => v / 100,
        'm_mi': v => v * 0.000621371, 'mi_m': v => v / 0.000621371,
        'ft_m': v => v * 0.3048, 'm_ft': v => v / 0.3048,
        'km_ft': v => v * 3280.84, 'ft_km': v => v / 3280.84,
        'mi_ft': v => v * 5280, 'ft_mi': v => v / 5280,
        'in_cm': v => v * 2.54, 'cm_in': v => v / 2.54
    };
    const fn = t[`${de}_${para}`];
    if (!fn) return "❌ Conversão não suportada. Use: km, m, cm, mi, ft, in.";
    return `📏 *CONVERSOR DE DISTÂNCIA*\n\n*${val} ${de}* = *${fn(val).toFixed(4)} ${para}* 💀`;
}

function converterVelocidade(val, de, para) {
    if (isNaN(val)) return "❌ Valor inválido.";
    const t = {
        'kph_mph': v => v * 0.621371, 'mph_kph': v => v / 0.621371,
        'kph_ms': v => v / 3.6, 'ms_kph': v => v * 3.6,
        'mph_ms': v => v * 0.44704, 'ms_mph': v => v / 0.44704,
        'kph_knot': v => v * 0.539957, 'knot_kph': v => v / 0.539957
    };
    const fn = t[`${de}_${para}`];
    if (!fn) return "❌ Conversão não suportada. Use: kph, mph, ms, knot.";
    return `🚀 *CONVERSOR DE VELOCIDADE*\n\n*${val} ${de}* = *${fn(val).toFixed(4)} ${para}* 💀`;
}

function calcularIMC(peso, altura) {
    if (!peso || !altura) return "❌ Informe peso (kg) e altura (m). Ex: /calcular imc 80 1.75";
    const imc = peso / (altura * altura);
    let cls = '';
    if (imc < 18.5) cls = '🟡 Abaixo do peso';
    else if (imc < 25) cls = '🟢 Peso normal';
    else if (imc < 30) cls = '🟠 Sobrepeso';
    else if (imc < 35) cls = '🔴 Obesidade Grau I';
    else if (imc < 40) cls = '🔴 Obesidade Grau II';
    else cls = '💀 Obesidade Grau III';
    return `⚖️ *CALCULADORA DE IMC*\n\n👤 *Peso:* ${peso} kg\n📏 *Altura:* ${altura} m\n\n🔢 *IMC:* *${imc.toFixed(2)}*\n📊 *Classificação:* ${cls}\n\n_dado pela maior mente do WhatsApp. 💀_`;
}
