"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut, Settings } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserState } from '@/lib/types';
import Link from 'next/link';

const ActionButtons = () => {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <Link href="/settings">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 hover:bg-slate-100"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="text-slate-600 hover:bg-slate-100"
        aria-label="Logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
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
      }, (error) => {
        console.error("Error listening to task list:", error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, firestore]);
  
  useEffect(() => {
    // This effect listens for profile changes and forces a re-render
    // if the user's name or theme changes on the settings page.
    if (user && firestore) {
      const profileRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          // We just need to trigger a state update to reflect new profile data from useUser hook
           setUserState(prevState => ({...prevState} as UserState));
        }
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
      <ActionButtons />
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
