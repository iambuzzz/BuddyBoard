
"use client";

import { useState, useEffect, useContext, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { FirebaseContext } from '../provider';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


type UserHookState = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refetch: () => void;
};

export const useUser = (): UserHookState => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useUser must be used within a FirebaseProvider');
  }
  const { auth, firestore } = context;
  
  const [userState, setUserState] = useState<{
    user: FirebaseUser | null;
    profile: UserProfile | null;
    isLoading: boolean;
  }>({
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!auth || !firestore) {
      setUserState({ user: null, profile: null, isLoading: false });
      return;
    }

    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      // Clean up previous listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }

      if (user) {
        setUserState(prevState => ({ ...prevState, user, isLoading: true }));
        const userProfileRef = doc(firestore, 'users', user.uid);

        profileUnsubscribe = onSnapshot(userProfileRef, 
          (profileSnap) => {
            if (profileSnap.exists()) {
              setUserState({ user, profile: profileSnap.data() as UserProfile, isLoading: false });
            } else {
              setUserState({ user, profile: null, isLoading: false });
            }
          },
          (error) => {
            console.error("Error listening to user profile:", error);
            setUserState({ user, profile: null, isLoading: false });
          }
        );
      } else {
        // User logged out
        setUserState({ user: null, profile: null, isLoading: false });
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore]);

  const refetch = useCallback(async () => {
    if (auth?.currentUser && firestore) {
      const user = auth.currentUser;
      setUserState(prevState => ({ ...prevState, isLoading: true }));
      try {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          setUserState({ user, profile: userProfileSnap.data() as UserProfile, isLoading: false });
        } else {
          setUserState({ user, profile: null, isLoading: false });
        }
      } catch (error) {
        console.error("Error refetching user profile:", error);
        setUserState(prevState => ({ ...prevState, isLoading: false }));
      }
    }
  }, [auth, firestore]);


  return { ...userState, refetch };
};
