import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Giriş yapma özelliği için bu şart

// Bu bilgiler senin Firebase Console'undaki "Proje Ayarları" kısmından geliyor
const firebaseConfig = {
  apiKey: "AIzaSyAN7EJRSihDApBuKyIVxFzLeiZVxf7lsh8",
  authDomain: "panelnestra.firebaseapp.com",
  projectId: "panelnestra",
  storageBucket: "panelnestra.firebasestorage.app",
  messagingSenderId: "810529754725",
  appId: "1:810529754725:web:adc4df3c0807c944f4408c",
};

// Eğer uygulama daha önce başlatılmadıysa başlat, başlatıldıysa olanı kullan
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Dışarıya aktarılacak servisler
const db = getFirestore(app); // Veritabanı
const auth = getAuth(app);    // Kullanıcı girişi

export { db, auth }; // Hem db'yi hem auth'u dışarıya fırlatıyoruz ki page.tsx görebilsin