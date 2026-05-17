const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_PATH = path.join(__dirname, 'key.json');

// In-memory cache
let keys = [];

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    return true;
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao salvar key.json: ' + (e && e.message)));
    return false;
  }
}

function init() {
  const cfg = loadConfig();
  if (cfg.keys && Array.isArray(cfg.keys)) {
    keys = cfg.keys.filter(k => typeof k === 'string' && k.trim().length);
  } else if (cfg.keyopenai && typeof cfg.keyopenai === 'string') {
    keys = [cfg.keyopenai];
    // Migration: converte keyopenai para um array "keys"
    cfg.keys = keys;
    delete cfg.keyopenai;
    try { saveConfig(cfg); console.log(chalk.green('[INFO] apiKeyManager: Migrou keyopenai para o sistema de múltiplas chaves (keys).')); } catch (e) {}
  } else {
    keys = [];
  }
}

let currentKey = null;

function getKey() {
  if (!keys || keys.length === 0) return null;
  
  // Se já temos uma chave ativa sendo usada, continuamos com ela!
  if (currentKey && keys.indexOf(currentKey) !== -1) {
    return currentKey;
  }
  
  // Caso contrário, pegamos a primeira da fila
  currentKey = keys[0];
  return currentKey;
}

function listKeys() {
  return Array.from(keys);
}

function markFailure(failedKey, force = false) {
  if (!failedKey) return;
  const idx = keys.indexOf(failedKey);
  if (idx === -1) return;
  
  if (!force) {
    console.log(chalk.yellow(`[AVISO] apiKeyManager: Falha/Exaustão detectada na chave ${failedKey.substring(0, 8)}... - Rotacionando para a próxima chave.`));
    // Move a chave que falhou para o final da fila (round-robin apenas sob falha)
    keys.splice(idx, 1);
    keys.push(failedKey);
    // Limpa a chave atual para que a próxima requisição escolha a nova primeira chave
    if (currentKey === failedKey) {
      currentKey = null;
    }
    return;
  }
  
  keys.splice(idx, 1);
  if (currentKey === failedKey) {
    currentKey = null;
  }
  try {
    const cfg = loadConfig();
    if (cfg.keys && Array.isArray(cfg.keys)) {
      cfg.keys = cfg.keys.filter(k => k !== failedKey);
      saveConfig(cfg);
      console.log(chalk.yellow(`[AVISO] apiKeyManager: Chave Gemini removida permanentemente por solicitação: ${failedKey.substring(0, 8)}...`));
    }
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao persistir remoção de chave: ' + (e && e.message)));
  }
}

function addKey(newKey) {
  if (!newKey || typeof newKey !== 'string') return false;
  const v = newKey.trim();
  if (!v) return false;
  if (keys.indexOf(v) !== -1) return false; // Já existe
  keys.push(v);
  try {
    const cfg = loadConfig();
    cfg.keys = Array.isArray(cfg.keys) ? cfg.keys.concat([v]) : [v];
    saveConfig(cfg);
    console.log(chalk.green(`[INFO] apiKeyManager: Nova chave adicionada com sucesso.`));
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao salvar nova chave: ' + (e && e.message)));
  }
  return true;
}

function hasKeys() {
  return keys.length > 0;
}

init();

module.exports = { getKey, listKeys, markFailure, addKey, hasKeys };
