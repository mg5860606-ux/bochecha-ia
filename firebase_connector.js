const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc, query, limit } = require('firebase/firestore');

// Configuração do Firebase fornecida pelo criador Marcos
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
const db = getFirestore(app);

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
