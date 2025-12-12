"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserState } from '@/lib/types';

const LogoutButton = () => {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      className="absolute top-4 right-4 text-slate-600 hover:bg-slate-100"
      aria-label="Logout"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
};

export default function Home() {
  const { user, profile, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      setIsLoading(true);
      const taskListRef = doc(firestore, 'task_lists', user.uid);
      const unsubscribe = onSnapshot(taskListRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserState(docSnap.data() as UserState);
        } else {
          // If the task list doc doesn't exist, it might be created shortly after signup
          setUserState(null); 
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, firestore]);

  if (isUserLoading || isLoading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]">
        <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e3eeff] p-4 relative">
      <LogoutButton />
      <div className="h-full w-full max-w-md mx-auto">
        {userState ? (
          <TaskCard userState={userState} userProfile={profile} userId={user.uid} />
        ) : (
           <div className="h-full w-full flex items-center justify-center">
             <div className="flex flex-col items-center gap-4 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Loading your tasks...</p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
