const assert = require('assert');
const path = require('path');
const fs = require('fs');
const config = require('../config.js');

// Pega o dono configurado dinamicamente para o sender passar nos checks de acesso de admin/dono
const ownerJid = (config.OWNER_NUMBERS && config.OWNER_NUMBERS[0] ? config.OWNER_NUMBERS[0] : "551420370026") + "@s.whatsapp.net";

// Mocks do storage e do ambiente
global.storage = {
    addCoins: async (from, jid, amt) => {
        return 100 + amt;
    },
    getRicos: async (from) => {
        return [{ user: "5511999999999", coins: 500 }];
    }
};

const mockSock = {
    user: { id: "551420370000@s.whatsapp.net" },
    authState: { creds: { me: { lid: "551420370000@lid" } } },
    sendMessage: async (from, content, options) => {
        return { key: { id: "msg_id_test" } };
    },
    groupMetadata: async (from) => {
        return {
            participants: [
                { id: ownerJid, admin: "superadmin" },
                { id: "5511999999999@s.whatsapp.net", admin: null },
                { id: "5511888888888@s.whatsapp.net", admin: null },
                { id: "5511777777777@s.whatsapp.net", admin: null }
            ]
        };
    }
};

async function testGuerraClas() {
    console.log("Testing Guerra de Clãs...");
    const skill = require('../skills/guerra_clas.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    const res = await skill.execute({ acao: "iniciar" }, ctx);
    assert(res === "A guerra foi iniciada." || res.includes("insuficiente"));
    
    // Status
    const statusRes = await skill.execute({ acao: "status" }, ctx);
    assert(statusRes.includes("GUERRA"));

    // Cancelar
    const cancelRes = await skill.execute({ acao: "cancelar" }, ctx);
    assert(cancelRes.includes("cancelada"));
}

async function testEleicaoImperador() {
    console.log("Testing Eleição Imperador...");
    const skill = require('../skills/eleicao_imperador.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    const res = await skill.execute({ acao: "iniciar" }, ctx);
    assert(res === "Iniciando inscrições.");

    const statusRes = await skill.execute({ acao: "status" }, ctx);
    assert(statusRes.includes("ELEIÇÃO"));

    const cancelRes = await skill.execute({ acao: "cancelar" }, ctx);
    assert(cancelRes.includes("cancelado"));
}

async function testIdentidadeSecreta() {
    console.log("Testing Identidade Secreta...");
    const skill = require('../skills/identidade_secreta.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    // Abre regras
    const regrasRes = await skill.execute({ acao: "regras" }, ctx);
    assert(regrasRes.includes("REGRAS"));

    // Iniciar
    const res = await skill.execute({ acao: "iniciar" }, ctx);
    assert(res.includes("AGENTE SECRETO"));

    // Cancelar/revelar
    const revRes = await skill.execute({ acao: "revelar" }, ctx);
    assert(revRes.includes("sucesso") || revRes.includes("revelado") || revRes.includes("Revelado"));
}

async function testOraculoBochecha() {
    console.log("Testing Oráculo do Bochecha...");
    const skill = require('../skills/oraculo_bochecha.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    const res = await skill.execute({ alvo1: "5511999999999@s.whatsapp.net", alvo2: "5511888888888@s.whatsapp.net" }, ctx);
    assert(res === "Oráculo consultado.");
    
    // Forçar limpeza do Oráculo no global após o teste
    global.activeOracles.delete("120363000000000@g.us");
}

async function testArenaDebates() {
    console.log("Testing Arena de Debates...");
    const skill = require('../skills/arena_debates.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    const res = await skill.execute({ acao: "iniciar", alvo: "5511999999999@s.whatsapp.net", tema: "Bolacha vs Biscoito" }, ctx);
    assert(res.includes("Arena de debate"));

    const statusRes = await skill.execute({ acao: "status" }, ctx);
    assert(statusRes.includes("ARENA"));

    const cancelRes = await skill.execute({ acao: "cancelar" }, ctx);
    assert(cancelRes.includes("cancelado"));
}

async function testQuizAoVivo() {
    console.log("Testing Quiz ao Vivo...");
    const skill = require('../skills/quiz_aovivo.js');
    const ctx = {
        sock: mockSock,
        from: "120363000000000@g.us",
        sender: ownerJid,
        pushname: "Marcos",
        message: {}
    };

    const res = await skill.execute({ acao: "iniciar" }, ctx);
    assert(res === "Iniciando Show do Milhão.");

    const statusRes = await skill.execute({ acao: "status" }, ctx);
    assert(statusRes.includes("QUIZ"));

    const cancelRes = await skill.execute({ acao: "cancelar" }, ctx);
    assert(cancelRes.includes("cancelado"));
}

async function runAll() {
    try {
        await testGuerraClas();
        await testEleicaoImperador();
        await testIdentidadeSecreta();
        await testOraculoBochecha();
        await testArenaDebates();
        await testQuizAoVivo();
        console.log("All Megalis tests passed! ✅");
        process.exit(0);
    } catch (e) {
        console.error("Test failed: ❌", e);
        process.exit(1);
    }
}

runAll();
