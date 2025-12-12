"use client";

import { useState, useEffect, useContext, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { FirebaseContext } from '../provider';
import { doc, getDoc } from 'firebase/firestore';
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

  const fetchUserProfile = useCallback(async (user: FirebaseUser | null) => {
    if (!auth || !firestore) {
      setUserState({ user: null, profile: null, isLoading: false });
      return;
    }

    if (user) {
      // Set loading to true when starting to fetch a profile
      setUserState(prevState => ({ ...prevState, user, isLoading: true }));
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data() as UserProfile;
        setUserState({ user, profile: userProfile, isLoading: false });
      } else {
        setUserState({ user, profile: null, isLoading: false });
      }
    } else {
      setUserState({ user: null, profile: null, isLoading: false });
    }
  }, [auth, firestore]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        fetchUserProfile(user);
    });
    return () => unsubscribe();
  }, [auth, fetchUserProfile]);

  const refetch = useCallback(() => {
    if(auth?.currentUser) {
        fetchUserProfile(auth.currentUser);
    }
  }, [auth, fetchUserProfile]);


  return { ...userState, refetch };
};
