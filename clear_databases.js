const fs = require('fs');
const path = require('path');

console.log("🧹 [LIMPANDO BANCOS DE DADOS] Inicializando processo de reset geral...");

// 1. Limpar arquivos da pasta memory/ (Históricos de Conversas)
const memoryDir = path.join(__dirname, 'memory');
if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir);
    let count = 0;
    for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.bak')) {
            const filePath = path.join(memoryDir, file);
            try {
                fs.unlinkSync(filePath);
                count++;
            } catch (err) {
                console.error(`❌ Erro ao apagar '${file}':`, err.message);
            }
        }
    }
    console.log(`✅ [HISTÓRICO] Apagados ${count} arquivo(s) de conversas na pasta 'memory/'.`);
}

// 2. Resetar arquivos da pasta learnings/
const learningsDir = path.join(__dirname, 'learnings');
const learningsToReset = [
    'alarms.json',
    'chat_activity.json',
    'economy.json',
    'emotional_engine.json',
    'key_metrics.json',
    'knowledge_base.json',
    'schedules.json',
    'lid_mappings.json'
];

if (fs.existsSync(learningsDir)) {
    let count = 0;
    for (const filename of learningsToReset) {
        const filePath = path.join(learningsDir, filename);
        try {
            // Reinicia como objeto vazio
            const defaultValue = filename.endsWith('.log') ? "" : "{}";
            fs.writeFileSync(filePath, defaultValue, 'utf8');
            
            // Apaga backup se existir
            const bakPath = filePath + '.bak';
            if (fs.existsSync(bakPath)) {
                fs.unlinkSync(bakPath);
            }
            count++;
        } catch (err) {
            console.error(`❌ Erro ao resetar '${filename}':`, err.message);
        }
    }
    console.log(`✅ [LEARNINGS] Resetados ${count} arquivo(s) de métricas/dados na pasta 'learnings/'.`);
}

// 3. Resetar arquivos da raiz do projeto
const rootToReset = [
    'database_games.json',
    'database_security.json',
    'database_warnings.json',
    'notas.json'
];

let rootCount = 0;
for (const filename of rootToReset) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.writeFileSync(filePath, "{}", 'utf8');
            rootCount++;
        } catch (err) {
            console.error(`❌ Erro ao resetar arquivo raiz '${filename}':`, err.message);
        }
    }
}
console.log(`✅ [ROOT DATA] Resetados ${rootCount} arquivo(s) de dados na raiz.`);

// 4. Limpeza da Nuvem (Firestore - Coleção 'database_json')
async function clearCloudBackups() {
    console.log("🔥 [FIREBASE] Iniciando limpeza dos backups em nuvem na coleção 'database_json'...");
    try {
        const { db, collection, getDocs, deleteDoc, doc } = require('./firebase_connector');
        
        // Pega todos os documentos da coleção database_json
        const colRef = collection(db, "database_json");
        const snapshot = await getDocs(colRef);
        
        if (snapshot.empty) {
            console.log("🔥 [FIREBASE] Nenhum documento de backup encontrado no Firestore.");
            return;
        }

        let deleteCount = 0;
        for (const fbDoc of snapshot.docs) {
            const docId = fbDoc.id;
            // Exclui todos, exceto configurações essenciais de chaves ou settings
            if (docId !== "chaves_api" && docId !== "settings.json") {
                const docRef = doc(db, "database_json", docId);
                await deleteDoc(docRef);
                deleteCount++;
            }
        }
        console.log(`✅ [FIREBASE] Removidos ${deleteCount} documento(s) de backup do Firestore.`);
    } catch (err) {
        console.error("❌ [FIREBASE] Erro ao conectar ou limpar backups na nuvem:", err.message);
    }
}

clearCloudBackups().then(() => {
    console.log("✨ [SUCESSO] Limpeza concluída de todos os bancos de dados locais e na nuvem! O Bochecha está 100% limpo e ultra veloz. 🚀");
    process.exit(0);
}).catch(err => {
    console.error("❌ Processo finalizado com erros:", err);
    process.exit(1);
});
