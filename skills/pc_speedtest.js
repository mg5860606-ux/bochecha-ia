const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "pc_speedtest",
            description: "Mede a velocidade da internet (download, upload e ping) do servidor local do Bochecha.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },

    async execute(args, ctx) {
        const { sock, from, message, isOwner } = ctx;
        if (!isOwner) {
            return "🚨 Acesso negado! Este comando de monitoramento de internet é exclusivo do meu criador.";
        }

        await sock.sendMessage(from, { text: "⚡ *Bochecha Speedtest Engine* ⚡\n\nIniciando testes de latência e taxa de transferência... Aguarde 10 a 15 segundos." });

        try {
            // 1. Teste de Latência (Ping)
            const pingStart = Date.now();
            await axios.get('https://1.1.1.1', { timeout: 5000 });
            const ping = Date.now() - pingStart;

            // 2. Teste de Download (Baixa arquivo de 5MB do CDN Cloudflare)
            const downloadStart = Date.now();
            const downloadRes = await axios.get('https://speed.cloudflare.com/__down?bytes=5000000', {
                responseType: 'arraybuffer',
                timeout: 25000
            });
            const downloadEnd = Date.now();
            const downloadTimeSec = (downloadEnd - downloadStart) / 1000;
            const downloadSizeBits = downloadRes.data.length * 8;
            const downloadMbps = (downloadSizeBits / downloadTimeSec) / 1024 / 1024;

            // 3. Teste de Upload (Envia buffer dummy de 1MB para o httpbin)
            const uploadBuffer = Buffer.alloc(1024 * 1024, 'X'); // 1MB
            const uploadStart = Date.now();
            await axios.post('https://httpbin.org/post', uploadBuffer, {
                headers: { 'Content-Type': 'application/octet-stream' },
                timeout: 25000
            });
            const uploadEnd = Date.now();
            const uploadTimeSec = (uploadEnd - uploadStart) / 1000;
            const uploadSizeBits = uploadBuffer.length * 8;
            const uploadMbps = (uploadSizeBits / uploadTimeSec) / 1024 / 1024;

            const report = `📶 *BOCHECHA NETWORK DIAGNOSTIC* 🥀\n\n` +
                           `⚡ *Ping (Latência):* ${ping} ms\n` +
                           `📥 *Velocidade de Download:* ${downloadMbps.toFixed(2)} Mbps\n` +
                           `📤 *Velocidade de Upload:* ${uploadMbps.toFixed(2)} Mbps\n\n` +
                           `> *BOCHECHA NETWORK v4.5* 💀⚡🛸`;

            return report;

        } catch (err) {
            console.error("[Speedtest] Erro de teste de rede:", err);
            return `❌ Falha ao medir a velocidade da internet: ${err.message}`;
        }
    }
};
