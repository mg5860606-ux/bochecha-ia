/**
 * chat.js — Servidor web de chat standalone do Bochecha-IA
 * Sobe o motor de IA + painel web em http://localhost:3030
 * Rode em paralelo ao isa-start com: npm run chat
 */

const chalk = require('chalk');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log(chalk.gray('Carregando motores cognitivos do Bochecha-IA...'));
const sansekai = require('./sansekai.js');
const { startPanelServer } = require('./lib/panelServer.js');

const PORT = 3030;

// Mock do Socket (sem WhatsApp conectado)
const dummySock = {
    user: null,
    sendPresenceUpdate: async () => {},
    sendMessage: async () => ({ key: { id: 'mock_' + Date.now() } }),
    groupMetadata: async (jid) => ({
        id: jid,
        subject: 'Chat Web Local',
        participants: [{ id: '551420370026@s.whatsapp.net', admin: 'superadmin' }]
    })
};

const banner = `
╔══════════════════════════════════════════════════════════╗
║        🛸  BOCHECHA-IA — CHAT WEB LOCAL  🛸              ║
║         Acesse: http://localhost:${PORT}                    ║
╚══════════════════════════════════════════════════════════╝
`;

setTimeout(() => {
    startPanelServer(PORT, sansekai, () => dummySock);
    console.log(chalk.cyan(banner));
    console.log(chalk.green('✅ Painel web de chat iniciado com sucesso!'));
    console.log(chalk.gray('Abra o navegador em: ') + chalk.bold.cyan(`http://localhost:${PORT}`));
    console.log(chalk.gray('Pressione CTRL+C para encerrar.\n'));
}, 3000);
