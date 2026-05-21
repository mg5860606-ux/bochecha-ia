module.exports = {
    definition: {
        function: {
            name: "cor_hex",
            description: "Gera cores aleatórias, converte entre HEX e RGB, e mostra paletas de cores.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["random", "hex2rgb", "rgb2hex", "paleta"], description: "Ação." },
                    valor: { type: "string", description: "Valor da cor." }
                }
            }
        }
    },
    async execute(args) {
        const raw = (args.valor || args.texto || args.alvo || '').trim();
        const low = raw.toLowerCase();

        if (!raw && !args.acao) {
            // Gera cor aleatória
            const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            const [r, g, b] = hexToRgb(hex);
            return `🎨 *COR ALEATÓRIA*\n\n🔹 *HEX:* ${hex}\n🔹 *RGB:* rgb(${r}, ${g}, ${b})\n\n_usa essa no CSS e manda ver. 💀_`;
        }

        // /cor paleta ou /cor paleta 5
        if (low.startsWith('paleta') || args.acao === 'paleta') {
            const n = parseInt(low.replace('paleta', '').trim()) || 5;
            const count = Math.min(Math.max(n, 2), 10);
            let t = `🎨 *PALETA DE CORES* 🎨\n\n`;
            for (let i = 0; i < count; i++) {
                const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                const [r, g, b] = hexToRgb(hex);
                t += `🔹 ${hex} → rgb(${r}, ${g}, ${b})\n`;
            }
            return t + `\n_paleta gerada do submundo. 💀_`;
        }

        // Converte HEX → RGB
        if (raw.startsWith('#') || /^[0-9a-f]{6}$/i.test(raw)) {
            const hex = raw.startsWith('#') ? raw : '#' + raw;
            const [r, g, b] = hexToRgb(hex);
            if (r === null) return "❌ Cor HEX inválida.";
            return `🎨 *HEX → RGB*\n\n🔹 *HEX:* ${hex}\n🔹 *RGB:* rgb(${r}, ${g}, ${b})\n🔹 *HSL:* ${rgbToHsl(r, g, b)} 💀`;
        }

        // Converte RGB → HEX: "255 0 128" ou "255,0,128"
        const rgbMatch = raw.match(/(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/);
        if (rgbMatch) {
            const [, r, g, b] = rgbMatch.map(Number);
            if (r > 255 || g > 255 || b > 255) return "❌ Valores RGB devem ser 0-255.";
            const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
            return `🎨 *RGB → HEX*\n\n🔹 *RGB:* rgb(${r}, ${g}, ${b})\n🔹 *HEX:* ${hex}\n🔹 *HSL:* ${rgbToHsl(r, g, b)} 💀`;
        }

        // Gera cor aleatória como fallback
        const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const [r, g, b] = hexToRgb(hex);
        return `🎨 *COR ALEATÓRIA*\n\n🔹 *HEX:* ${hex}\n🔹 *RGB:* rgb(${r}, ${g}, ${b})\n\n_Uso: /cor #FF0000 ou /cor 255,0,0 ou /cor paleta 💀_`;
    }
};

function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return [null, null, null];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
