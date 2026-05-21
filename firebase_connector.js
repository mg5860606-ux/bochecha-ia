const config = require('./config.js');

let db = null;
let collection = () => {};
let doc = () => {};
let getDoc = async () => ({ exists: () => false, data: () => null });
let setDoc = async () => {};
let getDocs = async () => ({ docs: [] });
let deleteDoc = async () => {};
let updateDoc = async () => {};
let query = () => {};
let limit = () => {};

if (config.USE_FIREBASE) {
  try {
    const { initializeApp } = require('firebase/app');
    const { getFirestore, collection: fCollection, doc: fDoc, getDoc: fGetDoc, setDoc: fSetDoc, getDocs: fGetDocs, deleteDoc: fDeleteDoc, updateDoc: fUpdateDoc, query: fQuery, limit: fLimit } = require('firebase/firestore');

    const firebaseConfig = {
      apiKey: "AIzaSyBipoRQcYMFH73LLymEG_K2oVOS8yOsNXQ",
      authDomain: "bochecha-ia.firebaseapp.com",
      projectId: "bochecha-ia",
      storageBucket: "bochecha-ia.firebasestorage.app",
      messagingSenderId: "1089187958350",
      appId: "1:1089187958350:web:3853e0677778234e1b7d1f"
    };

    console.log("[🔥 FIREBASE] Conectando ao projeto Firestore: bochecha-ia...");

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    collection = fCollection;
    doc = fDoc;
    getDoc = fGetDoc;
    setDoc = fSetDoc;
    getDocs = fGetDocs;
    deleteDoc = fDeleteDoc;
    updateDoc = fUpdateDoc;
    query = fQuery;
    limit = fLimit;
  } catch (err) {
    console.error("[🔥 FIREBASE] Erro ao conectar ao Firebase, usando modo local:", err.message);
  }
} else {
  console.log("[🔥 FIREBASE] Sincronização em nuvem desativada no config.js. Operando em modo 100% local.");
}

module.exports = {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  limit
};
