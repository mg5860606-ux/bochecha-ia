const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc, query, limit } = require('firebase/firestore');

// Configuração base do Firebase fornecida pelo criador Marcos.
const firebaseConfig = {
  apiKey: "AIzaSyBipoRQcYMFH73LLymEG_K2oVOS8yOsNXQ",
  authDomain: "bochecha-ia.firebaseapp.com",
  projectId: "bochecha-ia",
  storageBucket: "bochecha-ia.firebasestorage.app",
  messagingSenderId: "1089187958350",
  appId: "1:1089187958350:web:3853e0677778234e1b7d1f"
};

let app = null;
let db = null;
let isAvailable = false;
let statusMessage = 'Firestore em modo local-only';

function getStatus() {
  return {
    available: isAvailable,
    mode: isAvailable ? 'online' : 'local-only',
    message: statusMessage
  };
}

try {
  console.log("[🔥 FIREBASE] Tentando conectar ao Firestore: bochecha-ia...");
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isAvailable = true;
  statusMessage = 'Firestore disponível';
  console.log("[✅ FIREBASE] Firestore disponível.");
} catch (error) {
  isAvailable = false;
  statusMessage = error && error.message ? error.message : 'Falha ao inicializar Firestore';
  console.warn("[⚠️ FIREBASE] Firestore indisponível; continuando em modo local.", statusMessage);
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
  limit,
  isAvailable,
  getStatus
};
