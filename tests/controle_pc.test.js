const test = require('node:test');
const assert = require('node:assert/strict');
const child_process = require('child_process');

// Salva a função original de exec para não alterar o comportamento global depois do teste
const originalExec = child_process.exec;
let lastExecCommand = '';

child_process.exec = (cmd, callback) => {
    lastExecCommand = cmd;
    if (typeof callback === 'function') {
        callback(null, 'stdout mock', '');
    }
};

const controlePc = require('../skills/controle_pc');

test('Controle PC: rejeita acesso se não for dono', async () => {
    const res = await controlePc.execute({ acao: 'status' }, { isOwner: false });
    assert.match(res, /Erro de segurança: Acesso negado/);
});

test('Controle PC: executa status se for dono', async () => {
    const res = await controlePc.execute({ acao: 'status' }, { isOwner: true });
    assert.match(res, /STATUS DO SEU PC PESSOAL/);
});

test('Controle PC: abre YouTube sem parametro', async () => {
    lastExecCommand = '';
    const res = await controlePc.execute({ acao: 'abrir_youtube' }, { isOwner: true });
    assert.match(res, /Abrindo link no seu PC local/);
    assert.match(lastExecCommand, /https:\/\/www.youtube.com/);
});

test('Controle PC: pesquisa e abre musica foda no youtube', async () => {
    lastExecCommand = '';
    const res = await controlePc.execute({ acao: 'tocar_musica', parametro: 'musica foda' }, { isOwner: true });
    assert.match(res, /Abrindo link no seu PC local/);
    assert.match(lastExecCommand, /search_query=musica%20foda/);
});

// Restaura exec original
test('Limpeza do mock', () => {
    child_process.exec = originalExec;
});
