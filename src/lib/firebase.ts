// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Initialize Firestore with offline persistence
let db;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn(
            "Multiple tabs open, persistence can only be enabled in one tab at a time."
          );
        } else if (err.code == 'unimplemented') {
          console.warn(
            "The current browser does not support all of the features required to enable persistence."
          );
        }
      });
  } catch(e) {
    console.error("Error initializing Firestore with persistence", e);
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}


const auth = getAuth(app);

export { db, auth };
