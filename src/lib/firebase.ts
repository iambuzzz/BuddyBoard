// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ---
// You can get this from your project's settings in the Firebase console.
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLzLnKlMBmG24TCLisORuO21-rRLoFQfw",
  authDomain: "studio-2709310238-bb315.firebaseapp.com",
  projectId: "studio-2709310238-bb315",
  storageBucket: "studio-2709310238-bb315.firebasestorage.app",
  messagingSenderId: "201140323091",
  appId: "1:201140323091:web:fac69e924bac71727450e6"
};
// ----------------------------------------------------

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
