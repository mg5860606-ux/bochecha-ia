module.exports = {
    definition: {
        function: {
            name: "moeda",
            description: "Cara ou coroa - joga uma moeda. Pode apostar em cara ou coroa.",
            parameters: {
                type: "object",
                properties: {
                    aposta: { type: "string", enum: ["cara", "coroa"], description: "Aposta do usuário." }
                }
            }
        }
    },
    async execute(args, { sock, from, pushname }) {
        const raw = (args.aposta || args.texto || args.alvo || '').trim().toLowerCase();
        const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';
        const emoji = resultado === 'cara' ? '🪙' : '💰';

        if (raw === 'cara' || raw === 'coroa') {
            const ganhou = raw === resultado;
            return [
                `${emoji} *CARA OU COROA* ${emoji}`,
                ``,
                `🎯 *Sua aposta:* ${raw}`,
                `🪙 *Resultado:* *${resultado.toUpperCase()}*`,
                ``,
                ganhou ? `✅ *ACERTOU! Tá com sorte hoje, ${pushname}!* 🔥` : `❌ *ERROU! Azar no jogo, sorte no amor... ou não. 💀*`
            ].join('\n');
        }

        return `${emoji} *CARA OU COROA* ${emoji}\n\n🪙 *Resultado:* *${resultado.toUpperCase()}*\n\n_use /moeda cara ou /moeda coroa pra apostar. 💀_`;
    }
};
