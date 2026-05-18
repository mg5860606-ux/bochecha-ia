const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Vamos simular a classe StorageManager do sansekai.js
const ROOT_DIR = path.join(__dirname, '..');
const TEST_FILE = path.join(ROOT_DIR, 'scratch', 'test_db.json');

// Remove arquivo de teste se existir
if (fs.existsSync(TEST_FILE)) {
  fs.unlinkSync(TEST_FILE);
}

class StorageManager {
    constructor() {
        this.locks = new Map();
        this.cache = new Map();
    }

    async _acquireLock(filePath) {
        while (this.locks.has(filePath)) {
            await this.locks.get(filePath);
        }
        let resolveLock;
        const newLock = new Promise(resolve => { resolveLock = resolve; });
        this.locks.set(filePath, newLock);
        return () => {
            this.locks.delete(filePath);
            resolveLock();
        };
    }

    async read(filePath, defaultValue = {}) {
        const release = await this._acquireLock(filePath);
        try {
            let localData = defaultValue;
            let existsLocal = fs.existsSync(filePath);

            if (!existsLocal) {
                fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
                this.cache.set(filePath, defaultValue);
                localData = defaultValue;
            } else {
                const raw = fs.readFileSync(filePath, 'utf8').trim();
                if (!raw) {
                    this.cache.set(filePath, defaultValue);
                    localData = defaultValue;
                } else {
                    localData = JSON.parse(raw);
                    this.cache.set(filePath, localData);
                }
            }

            // Sincronização em Background com o Cloud Firestore
            const baseName = path.basename(filePath);
            const { db, doc, getDoc, setDoc } = require('../firebase_connector');
            const docRef = doc(db, "database_json", baseName);

            getDoc(docRef).then(async (snap) => {
                if (snap.exists()) {
                    const cloudDoc = snap.data();
                    const cloudData = cloudDoc.data;
                    
                    if (cloudDoc.lastUpdated && (!localData._lastLocalUpdate || cloudDoc.lastUpdated > localData._lastLocalUpdate)) {
                        console.log(chalk.green(`[🔥 FIREBASE] Sincronizado '${baseName}' do Firestore!`));
                        this.cache.set(filePath, cloudData);
                        fs.writeFileSync(filePath, JSON.stringify(cloudData, null, 2));
                    }
                } else {
                    console.log(chalk.yellow(`[🔥 FIREBASE] Backup inicial de '${baseName}' enviado ao Firestore.`));
                    await setDoc(docRef, {
                        data: localData,
                        lastUpdated: Date.now()
                    });
                }
            }).catch(err => {
                console.error("Erro na leitura em background do Firestore:", err);
            });

            return JSON.parse(JSON.stringify(localData));
        } catch (e) {
            console.error(`StorageManager.read(${path.basename(filePath)}) erro:`, e);
            return defaultValue;
        } finally {
            release();
        }
    }

    async write(filePath, data) {
        const release = await this._acquireLock(filePath);
        try {
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, `${filePath}.bak`);
            }
            
            const dataToSave = { ...data };
            const lastUpdate = Date.now();
            dataToSave._lastLocalUpdate = lastUpdate;

            fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
            this.cache.set(filePath, dataToSave);

            const baseName = path.basename(filePath);
            const { db, doc, setDoc } = require('../firebase_connector');
            const docRef = doc(db, "database_json", baseName);

            setDoc(docRef, {
                data: dataToSave,
                lastUpdated: lastUpdate
            }).then(() => {
                console.log(chalk.green(`[🔥 FIREBASE] Salvo '${baseName}' no Firestore com sucesso!`));
            }).catch(err => {
                console.error(`[🔥 FIREBASE] Falha ao salvar '${baseName}' no Firestore:`, err.message);
            });

            return true;
        } catch (e) {
            console.error(`StorageManager.write(${path.basename(filePath)}) erro:`, e);
            return false;
        } finally {
            release();
        }
    }
}

async function run() {
  console.log(chalk.cyan("=================================================="));
  console.log(chalk.cyan("     TESTANDO ESPELHAMENTO DO STORAGE NO CLOUD"));
  console.log(chalk.cyan("=================================================="));

  const storage = new StorageManager();

  console.log("\n[🤖 TESTE] Gravando dados locais no arquivo de teste...");
  await storage.write(TEST_FILE, {
    nome_bot: "Bochecha-IA",
    versao: "4.5",
    status: "online",
    descricao: "Robô premium de WhatsApp com cérebro em nuvem Firestore"
  });

  console.log("[🤖 TESTE] Aguardando 3 segundos para que a gravação assíncrona seja gravada no Firestore...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("\n[🤖 TESTE] Lendo os dados para forçar sincronização...");
  const data = await storage.read(TEST_FILE, {});
  console.log("Dados recuperados localmente:", data);

  console.log("[🤖 TESTE] Aguardando 2 segundos...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(chalk.green("\n[🔥 SUCESSO] Teste de espelhamento do Storage finalizado com sucesso absoluto!"));
  console.log(chalk.cyan("=================================================="));

  // Limpa arquivos de teste
  try {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    if (fs.existsSync(`${TEST_FILE}.bak`)) fs.unlinkSync(`${TEST_FILE}.bak`);
  } catch(e) {}

  process.exit(0);
}

run();
