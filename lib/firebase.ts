import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAN7EJRSihDApBuKyIVxFzLeiZVxf7lsh8",
  authDomain: "panelnestra.firebaseapp.com",
  projectId: "panelnestra",
  storageBucket: "panelnestra.firebasestorage.app",
  messagingSenderId: "810529754725",
  appId: "1:810529754725:web:adc4df3c0807c944f4408c",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);