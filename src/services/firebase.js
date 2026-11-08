// Inisialisasi Firebase (Auth + Firestore). Dipakai oleh dataService.js dan gambarService.js.
// Catatan: konfigurasi web Firebase memang bukan rahasia. Keamanan data dijaga oleh firestore.rules.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAM_87DMkGGJtWi4Z4k8hMSSajfJsrBr6o",
  authDomain: "superexamapp.firebaseapp.com",
  projectId: "superexamapp",
  storageBucket: "superexamapp.firebasestorage.app",
  messagingSenderId: "576899351612",
  appId: "1:576899351612:web:483b8cf1c3a86f5bbf6f39"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth utama: sesi login disimpan di HP sehingga siswa tidak perlu login ulang setiap membuka aplikasi.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app); // sudah diinisialisasi (misalnya saat fast refresh)
}

let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // lebih stabil di jaringan sekolah / HP tertentu
    ignoreUndefinedProperties: true, // field undefined diabaikan, bukan error
  });
} catch (e) {
  db = getFirestore(app); // sudah diinisialisasi (misalnya saat fast refresh)
}

// Instance kedua khusus untuk membuat akun siswa.
// createUserWithEmailAndPassword otomatis me-login akun baru; dengan instance terpisah,
// sesi admin di instance utama tidak tergantikan.
function ambilAuthSekunder() {
  let sekunder;
  try {
    sekunder = getApp('sekunder');
  } catch (e) {
    sekunder = initializeApp(firebaseConfig, 'sekunder');
  }
  return getAuth(sekunder);
}

export { app, auth, db, ambilAuthSekunder };
