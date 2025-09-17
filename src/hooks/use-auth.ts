"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { useToast } from './use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          toast({
            title: 'Authentication Failed',
            description: 'Could not connect to the service securely.',
            variant: 'destructive',
          });
          setLoading(false);
        });
      }
    });

    return () => unsubscribe();
  }, [toast]);

  return { user, loading };
}
