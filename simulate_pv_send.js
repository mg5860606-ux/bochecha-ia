const sansekaiHandler = require('./sansekai.js');

const results = [];

const fakeSock = {
  user: { id: '000000000000000@s.whatsapp.net' },
  sendMessage: async (jid, content, options = {}) => {
    results.push({ jid, content, options });
    return { jid, content, options };
  },
  groupMetadata: async () => ({ participants: [] })
};

(async () => {
  try {
    sansekaiHandler.bind(fakeSock, {});

    console.log('=== Simulação de envio em PV ===');
    await fakeSock.sendMessage(
      '5511999999999@s.whatsapp.net',
      {
        text: 'Olá, teste PV',
        mentions: ['5511888888888@s.whatsapp.net'],
        contextInfo: { mentionedJid: ['5511888888888@s.whatsapp.net'] }
      },
      {
        quoted: { key: { remoteJid: '5511888888888@s.whatsapp.net' } },
        mentions: ['5511888888888@s.whatsapp.net']
      }
    );

    console.log('=== Simulação de envio em GRUPO ===');
    await fakeSock.sendMessage(
      '12345-67890@g.us',
      {
        text: 'Olá, teste grupo',
        mentions: ['5511888888888@s.whatsapp.net']
      },
      {
        quoted: { key: { remoteJid: '5511888888888@s.whatsapp.net' } },
        mentions: ['5511888888888@s.whatsapp.net']
      }
    );

    results.forEach((r, index) => {
      console.log(`\nEnvio ${index + 1}:`);
      console.log(`  jid: ${r.jid}`);
      console.log(`  content: ${JSON.stringify(r.content, null, 2)}`);
      console.log(`  options: ${JSON.stringify(r.options, null, 2)}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Erro durante a simulação:', err);
    process.exit(1);
  }
})();
