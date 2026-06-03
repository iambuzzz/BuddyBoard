import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from "firebase/storage";


const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function initializeFirebase() {
    const isAlreadyInitialized = getApps().length > 0;
    const app = isAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // initializeFirestore() can only be called ONCE per app with custom options.
    // On subsequent calls (HMR, re-renders), use getFirestore() instead.
    const firestore = isAlreadyInitialized
        ? getFirestore(app)
        : initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
            }),
        });

    const storage = getStorage(app);

    return { app, auth, firestore, storage };
}

export { initializeFirebase };

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';

