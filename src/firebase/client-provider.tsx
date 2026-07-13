"use client";

import React, { useState, useEffect } from 'react';
import { initializeFirebase, FirebaseProvider } from '.';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseInstances, setFirebaseInstances] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
  } | null>(null);

  useEffect(() => {
    // Patch console.error to ignore Firestore future update time warning which triggers Next.js error overlay
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Detected an update time that is in the future')
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Firebase should only be initialized on the client.
    const instances = initializeFirebase();
    setFirebaseInstances(instances);

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  if (!firebaseInstances) {
    // You can show a loader here if you want.
    // For now, we'll just render nothing until Firebase is ready.
    return null;
  }
  
  return (
    <FirebaseProvider
      app={firebaseInstances.app}
      auth={firebaseInstances.auth}
      firestore={firebaseInstances.firestore}
      storage={firebaseInstances.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
