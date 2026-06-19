const assert = require('assert');
const path = require('path');

const axios = require('axios');
const skillPath = path.join(__dirname, '..', 'skills', 'baixar_adulto.js');

const originalGet = axios.get;
axios.get = async () => {
    throw new Error('API indisponível');
};

const skill = require(skillPath);
(async () => {
    try {
        const result = await skill.execute({ busca: 'teste' }, {
            sock: { sendMessage: async () => {} },
            from: '1200000000000@s.whatsapp.net',
            isOwner: true,
            isGroup: false,
            pushname: 'Teste'
        });

        assert.ok(
            /temporariamente indisponível|indisponível/i.test(result),
            `Esperava resposta de fallback, recebeu: ${result}`
        );
        console.log('baixar_adulto fallback regression check passed.');
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        axios.get = originalGet;
        delete require.cache[require.resolve(skillPath)];
    }
})();
