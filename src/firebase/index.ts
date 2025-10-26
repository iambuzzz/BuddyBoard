import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBLzLnKlMBmG24TCLisORuO21-rRLoFQfw",
    authDomain: "studio-2709310238-bb315.firebaseapp.com",
    projectId: "studio-2709310238-bb315",
    storageBucket: "studio-2709310238-bb315.firebasestorage.app",
    messagingSenderId: "201140323091",
    appId: "1:201140323091:web:fac69e924bac71727450e6"
};

function initializeFirebase() {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    if (typeof window !== 'undefined') {
        enableIndexedDbPersistence(firestore, {
            force: true,
            cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence could not be enabled. Another tab has it open.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support all of the features required to enable persistence.');
            }
        });
    }

    return { app, auth, firestore };
}

export { initializeFirebase };

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
