const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_PATH = path.join(__dirname, 'key.json');

// In-memory cache
let keys = [];
let claudekeys = [];

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
    cfg.keys = keys;
    delete cfg.keyopenai;
    try { saveConfig(cfg); console.log(chalk.green('[INFO] apiKeyManager: Migrou keyopenai para o sistema de múltiplas chaves (keys).')); } catch (e) {}
  } else {
    keys = [];
  }

  if (cfg.claudekeys && Array.isArray(cfg.claudekeys)) {
    claudekeys = cfg.claudekeys.filter(k => typeof k === 'string' && k.trim().length);
  } else {
    claudekeys = [];
  }
}

let currentKey = null;
let currentClaudeKey = null;

function getKey() {
  if (!keys || keys.length === 0) return null;
  
  if (currentKey && keys.indexOf(currentKey) !== -1) {
    return currentKey;
  }
  
  currentKey = keys[0];
  return currentKey;
}

function getClaudeKey() {
  if (!claudekeys || claudekeys.length === 0) return null;
  
  if (currentClaudeKey && claudekeys.indexOf(currentClaudeKey) !== -1) {
    return currentClaudeKey;
  }
  
  currentClaudeKey = claudekeys[0];
  return currentClaudeKey;
}

function listKeys() {
  return Array.from(keys);
}

function listClaudeKeys() {
  return Array.from(claudekeys);
}

function markClaudeFailure(failedKey, force = false) {
  if (!failedKey) return;
  const idx = claudekeys.indexOf(failedKey);
  if (idx === -1) return;
  
  if (!force) {
    console.log(chalk.yellow(`[AVISO] apiKeyManager: Falha/Exaustão detectada na chave Claude ${failedKey.substring(0, 8)}... - Rotacionando para a próxima chave.`));
    claudekeys.splice(idx, 1);
    claudekeys.push(failedKey);
    if (currentClaudeKey === failedKey) {
      currentClaudeKey = null;
    }
    return;
  }
  
  claudekeys.splice(idx, 1);
  if (currentClaudeKey === failedKey) {
    currentClaudeKey = null;
  }
  try {
    const cfg = loadConfig();
    if (cfg.claudekeys && Array.isArray(cfg.claudekeys)) {
      cfg.claudekeys = cfg.claudekeys.filter(k => k !== failedKey);
      saveConfig(cfg);
      console.log(chalk.yellow(`[AVISO] apiKeyManager: Chave Claude removida permanentemente por solicitação: ${failedKey.substring(0, 8)}...`));
    }
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao persistir remoção de chave Claude: ' + (e && e.message)));
  }
}

function markFailure(failedKey, force = false) {
  if (!failedKey) return;
  
  if (failedKey.startsWith('sk-ant-')) {
    return markClaudeFailure(failedKey, force);
  }

  const idx = keys.indexOf(failedKey);
  if (idx === -1) return;
  
  if (!force) {
    console.log(chalk.yellow(`[AVISO] apiKeyManager: Falha/Exaustão detectada na chave ${failedKey.substring(0, 8)}... - Rotacionando para a próxima chave.`));
    keys.splice(idx, 1);
    keys.push(failedKey);
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
  
  const isClaude = v.startsWith('sk-ant-');
  const targetArray = isClaude ? claudekeys : keys;
  const configField = isClaude ? 'claudekeys' : 'keys';
  
  if (targetArray.indexOf(v) !== -1) return false; // Já existe
  targetArray.push(v);
  try {
    const cfg = loadConfig();
    cfg[configField] = Array.isArray(cfg[configField]) ? cfg[configField].concat([v]) : [v];
    saveConfig(cfg);
    console.log(chalk.green(`[INFO] apiKeyManager: Nova chave ${isClaude ? 'Claude' : 'Gemini'} adicionada com sucesso.`));
  } catch (e) {
    console.error(chalk.red(`[ERRO] apiKeyManager: Falha ao salvar nova chave ${isClaude ? 'Claude' : 'Gemini'}: ` + (e && e.message)));
  }
  return true;
}

function hasKeys() {
  return keys.length > 0 || claudekeys.length > 0;
}

function hasClaudeKeys() {
  return claudekeys.length > 0;
}

init();

module.exports = { 
  getKey, 
  getClaudeKey,
  listKeys, 
  listClaudeKeys,
  markFailure, 
  markClaudeFailure,
  addKey, 
  hasKeys,
  hasClaudeKeys
};
