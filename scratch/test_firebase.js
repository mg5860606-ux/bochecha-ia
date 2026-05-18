const { db, collection, doc, setDoc, getDoc } = require('../firebase_connector');

async function test() {
  try {
    console.log("Iniciando teste de gravação no Firestore...");
    const testDocRef = doc(db, "teste_conexao", "status");
    
    await setDoc(testDocRef, {
      conectado: true,
      timestamp: Date.now(),
      mensagem: "Salve Marcos! O cérebro do Bochecha está oficialmente conectado ao Cloud Firebase!"
    });
    console.log("Gravação efetuada com sucesso!");

    console.log("Iniciando teste de leitura...");
    const snap = await getDoc(testDocRef);
    if (snap.exists()) {
      console.log("Leitura efetuada! Dados recuperados:", snap.data());
    } else {
      console.log("Nenhum dado encontrado.");
    }
  } catch (err) {
    console.error("Erro durante o teste de conexão:", err);
  }
}

test();
