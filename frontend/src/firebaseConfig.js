import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeIyTgZ2SxCfM3Z1FRd-zh2FCZrzyg87A",
  authDomain: "whatsapp-bot-mila.firebaseapp.com",
  projectId: "whatsapp-bot-mila",
  storageBucket: "whatsapp-bot-mila.firebasestorage.app",
  messagingSenderId: "958667073024",
  appId: "1:958667073024:web:324a968682a07eb034dae5",
  measurementId: "G-DPVJ35FJLE"
};

const app = initializeApp(firebaseConfig);

// AQUI: Adicionamos o nome do seu banco de dados específico
export const db = getFirestore(app, "db-clientes-contcertbr"); 
export default app;