"use client";

import { useState, useEffect, useContext } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { FirebaseContext } from '../provider';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


type UserState = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
};

export const useUser = (): UserState => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useUser must be used within a FirebaseProvider');
  }
  const { auth, firestore } = context;
  
  const [userState, setUserState] = useState<UserState>({
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!auth || !firestore) {
      setUserState({ user: null, profile: null, isLoading: false });
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data() as UserProfile;
          setUserState({ user, profile: userProfile, isLoading: false });
        } else {
          // Handle case where user exists in Auth but not in user_roles
          setUserState({ user, profile: null, isLoading: false });
        }
      } else {
        setUserState({ user: null, profile: null, isLoading: false });
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return userState;
};
