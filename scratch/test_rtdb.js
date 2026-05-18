const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyBipoRQcYMFH73LLymEG_K2oVOS8yOsNXQ",
  authDomain: "bochecha-ia.firebaseapp.com",
  projectId: "bochecha-ia",
  storageBucket: "bochecha-ia.firebasestorage.app",
  messagingSenderId: "1089187958350",
  appId: "1:1089187958350:web:3853e0677778234e1b7d1f"
  // O SDK resolve automaticamente a databaseURL do Realtime Database com base no projectId!
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function test() {
  try {
    console.log("[🔥 RTDB] Testando gravação no Realtime Database...");
    const testRef = ref(db, "teste_conexao/status");
    
    await set(testRef, {
      conectado: true,
      timestamp: Date.now(),
      mensagem: "Salve Marcos! O cérebro do Bochecha está oficialmente conectado ao Realtime Database!"
    });
    console.log("[🔥 RTDB] Gravação efetuada com sucesso!");

    console.log("[🔥 RTDB] Testando leitura...");
    const snap = await get(testRef);
    if (snap.exists()) {
      console.log("[🔥 RTDB] Leitura efetuada! Dados:", snap.val());
    } else {
      console.log("[🔥 RTDB] Nenhum dado encontrado.");
    }
  } catch (err) {
    console.error("[🔥 RTDB] Erro no Realtime Database:", err);
  }
}

test();
