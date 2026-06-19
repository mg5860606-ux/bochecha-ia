const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { db, doc, getDoc, setDoc, isAvailable } = require('./firebase_connector');

const CONFIG_PATH = path.join(__dirname, 'key.json');

// In-memory cache
let keys = [];
let claudekeys = [];

function normalizeKey(newKey) {
  if (typeof newKey !== 'string') return null;
  const value = newKey.trim();
  return value.length ? value : null;
}

function normalizeKeyList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(k => normalizeKey(k))
    .filter(Boolean);
}

function mergeKeyLists(localKeys, remoteKeys) {
  const combined = [...normalizeKeyList(localKeys), ...normalizeKeyList(remoteKeys)];
  const seen = new Set();
  return combined.filter(k => {
    const normalized = k.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function persistKeyState() {
  try {
    const cfg = loadConfig();
    cfg.keys = Array.from(keys).filter(k => typeof k === 'string' && k.trim().length);
    cfg.claudekeys = Array.from(claudekeys).filter(k => typeof k === 'string' && k.trim().length);
    saveConfig(cfg);
    saveToFirestore();
    return true;
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao persistir estado de chaves: ' + (e && e.message)));
    return false;
  }
}

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

async function saveToFirestore() {
  if (!isAvailable || !db) {
    return false;
  }

  try {
    const docRef = doc(db, "configuracoes", "chaves_api");
    await setDoc(docRef, {
      keys: keys,
      claudekeys: claudekeys,
      ultima_atualizacao: Date.now()
    });
    console.log(chalk.green(`[🔥 FIREBASE] Chaves salvas na nuvem (Firestore) com sucesso!`));
    return true;
  } catch (err) {
    console.error(chalk.red(`[🔥 FIREBASE] Erro ao salvar chaves no Firestore:`), err);
    return false;
  }
}

async function syncWithFirestore() {
  if (!isAvailable || !db) {
    console.log(chalk.yellow('[INFO] apiKeyManager: Firestore indisponível; usando apenas backup local.'));
    return false;
  }

  try {
    const docRef = doc(db, "configuracoes", "chaves_api");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteKeys = normalizeKeyList(data?.keys);
      const remoteClaudeKeys = normalizeKeyList(data?.claudekeys);
      console.log(chalk.green(`[🔥 FIREBASE] Chaves de API sincronizadas do Firestore! Gemini: ${remoteKeys.length} | Claude: ${remoteClaudeKeys.length}`));

      if (remoteKeys.length > 0 || remoteClaudeKeys.length > 0) {
        keys = mergeKeyLists(keys, remoteKeys);
        claudekeys = mergeKeyLists(claudekeys, remoteClaudeKeys);
        persistKeyState();
      } else {
        keys = normalizeKeyList(keys);
        claudekeys = normalizeKeyList(claudekeys);
        if (keys.length > 0 || claudekeys.length > 0) {
          persistKeyState();
        }
      }
    } else {
      console.log(chalk.yellow(`[🔥 FIREBASE] Nenhuma chave encontrada no Firestore. Iniciando backup automático na nuvem...`));
      if (keys.length > 0 || claudekeys.length > 0) {
        await saveToFirestore();
      }
    }
  } catch (err) {
    console.error(chalk.red(`[🔥 FIREBASE] Erro ao sincronizar chaves do Firestore:`), err);
  }
}

function init() {
  const cfg = loadConfig();
  if (cfg.keys && Array.isArray(cfg.keys)) {
    keys = cfg.keys.filter(k => typeof k === 'string' && k.trim().length).map(k => k.trim());
  } else if (cfg.keyopenai && typeof cfg.keyopenai === 'string') {
    keys = [cfg.keyopenai.trim()].filter(Boolean);
    cfg.keys = keys;
    delete cfg.keyopenai;
    try { saveConfig(cfg); console.log(chalk.green('[INFO] apiKeyManager: Migrou keyopenai para o sistema de múltiplas chaves (keys).')); } catch (e) {}
  } else {
    keys = [];
  }

  if (cfg.claudekeys && Array.isArray(cfg.claudekeys)) {
    claudekeys = cfg.claudekeys.filter(k => typeof k === 'string' && k.trim().length).map(k => k.trim());
  } else {
    claudekeys = [];
  }

  // Sincroniza em background com o Firestore
  syncWithFirestore();
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

function setCurrentKey(newKey) {
  if (!newKey || typeof newKey !== 'string') {
    currentKey = null;
    return null;
  }

  if (!keys || keys.indexOf(newKey) === -1) {
    currentKey = null;
    return null;
  }

  currentKey = newKey;
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
    }
    saveToFirestore();
    console.log(chalk.yellow(`[AVISO] apiKeyManager: Chave Claude removida permanentemente: ${failedKey.substring(0, 8)}...`));
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
    }
    saveToFirestore();
    console.log(chalk.yellow(`[AVISO] apiKeyManager: Chave Gemini removida permanentemente: ${failedKey.substring(0, 8)}...`));
  } catch (e) {
    console.error(chalk.red('[ERRO] apiKeyManager: Falha ao persistir remoção de chave: ' + (e && e.message)));
  }
}

function addKey(newKey) {
  const v = normalizeKey(newKey);
  if (!v) return false;
  
  const isClaude = v.startsWith('sk-ant-');
  const targetArray = isClaude ? claudekeys : keys;
  const existing = targetArray.some(k => k.toLowerCase() === v.toLowerCase());
  if (existing) return false; // Já existe

  targetArray.push(v);
  try {
    const cfg = loadConfig();
    const configField = isClaude ? 'claudekeys' : 'keys';
    cfg[configField] = Array.isArray(cfg[configField]) ? cfg[configField].concat([v]) : [v];
    saveConfig(cfg);
    saveToFirestore();
    console.log(chalk.green(`[INFO] apiKeyManager: Nova chave ${isClaude ? 'Claude' : 'Gemini'} adicionada com sucesso.`));
  } catch (e) {
    console.error(chalk.red(`[ERRO] apiKeyManager: Falha ao salvar nova chave ${isClaude ? 'Claude' : 'Gemini'}: ` + (e && e.message)));
  }
  return true;
}

function removeKey(keyToRemove) {
  const v = normalizeKey(keyToRemove);
  if (!v) return false;

  const isClaude = v.startsWith('sk-ant-');
  const targetArray = isClaude ? claudekeys : keys;
  const idx = targetArray.findIndex(k => k.toLowerCase() === v.toLowerCase());
  if (idx === -1) return false;

  const removedKey = targetArray.splice(idx, 1)[0];
  if (isClaude) {
    if (currentClaudeKey && currentClaudeKey.toLowerCase() === removedKey.toLowerCase()) {
      currentClaudeKey = null;
    }
  } else if (currentKey && currentKey.toLowerCase() === removedKey.toLowerCase()) {
    currentKey = null;
  }

  try {
    const cfg = loadConfig();
    const configField = isClaude ? 'claudekeys' : 'keys';
    cfg[configField] = Array.isArray(cfg[configField])
      ? cfg[configField].filter(k => typeof k === 'string' && k.trim().toLowerCase() !== v.toLowerCase())
      : [];
    saveConfig(cfg);
    saveToFirestore();
    console.log(chalk.green(`[INFO] apiKeyManager: Chave ${isClaude ? 'Claude' : 'Gemini'} removida com sucesso.`));
  } catch (e) {
    console.error(chalk.red(`[ERRO] apiKeyManager: Falha ao remover chave ${isClaude ? 'Claude' : 'Gemini'}: ` + (e && e.message)));
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
  setCurrentKey,
  getClaudeKey,
  listKeys, 
  listClaudeKeys,
  markFailure, 
  markClaudeFailure,
  addKey,
  removeKey,
  hasKeys,
  hasClaudeKeys,
  syncWithFirestore,
  mergeKeyLists
};
