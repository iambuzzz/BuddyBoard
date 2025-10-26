"use client";

import { useState, useEffect, useContext } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '..';
import { UserRole, User } from '@/lib/types';
import { FirebaseContext } from '../provider';

type UserState = {
  user: FirebaseUser | null;
  listName: User | null;
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
    listName: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!auth || !firestore) {
      setUserState({ user: null, listName: null, isLoading: false });
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRoleRef = doc(firestore, 'user_roles', user.uid);
        const userRoleSnap = await getDoc(userRoleRef);
        
        if (userRoleSnap.exists()) {
          const userRole = userRoleSnap.data() as UserRole;
          setUserState({ user, listName: userRole.listName, isLoading: false });
        } else {
          // Handle case where user exists in Auth but not in user_roles
          setUserState({ user, listName: null, isLoading: false });
        }
      } else {
        setUserState({ user: null, listName: null, isLoading: false });
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return userState;
};
