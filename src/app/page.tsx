
"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut, Settings } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import type { UserState, UserProfile, Group } from '@/lib/types';
import Link from 'next/link';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

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
    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
      <Link href="/settings">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 hover:bg-slate-100 bg-white/50 backdrop-blur-sm"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="text-slate-600 hover:bg-slate-100 bg-white/50 backdrop-blur-sm"
        aria-label="Logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]">
    <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
  </div>
);

const SoloView = ({ userId, profile }: { userId: string; profile: UserProfile }) => {
    const firestore = useFirestore();
    const [userState, setUserState] = useState<UserState | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const taskListRef = doc(firestore, 'task_lists', userId);
        const unsubscribe = onSnapshot(taskListRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserState(docSnap.data() as UserState);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [firestore, userId]);


    if (isLoading || !userState) {
        return (
             <div className="h-full w-full flex items-center justify-center">
               <div className="flex flex-col items-center gap-4 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Loading your tasks...</p>
               </div>
             </div>
        );
    }

    return <TaskCard userState={userState} userProfile={profile} userId={userId} />;
};

const GroupView = ({ groupId, currentUserId }: { groupId: string; currentUserId: string }) => {
    const firestore = useFirestore();
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [userStates, setUserStates] = useState<Record<string, UserState>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const groupRef = doc(firestore, 'groups', groupId);
        
        const unsubGroup = onSnapshot(groupRef, (groupSnap) => {
            if (!groupSnap.exists()) {
                setIsLoading(false);
                return;
            }
            const groupData = groupSnap.data() as Group;
            const memberUids = Object.keys(groupData.members);

            if (memberUids.length === 0) {
                 setIsLoading(false);
                 return;
            }
            
            const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
            const unsubUsers = onSnapshot(usersQuery, (usersSnap) => {
                const membersData = usersSnap.docs.map(d => d.data() as UserProfile);
                membersData.sort((a, b) => {
                    if (a.uid === currentUserId) return -1;
                    if (b.uid === currentUserId) return 1;
                    return a.displayName.localeCompare(b.displayName);
                });
                setMembers(membersData);

                // Now that we have members, listen to their task lists
                const unsubTasks = membersData.map(member => 
                    onSnapshot(doc(firestore, 'task_lists', member.uid), (taskSnap) => {
                        if (taskSnap.exists()) {
                            setUserStates(prev => ({ ...prev, [member.uid]: taskSnap.data() as UserState }));
                        }
                    })
                );

                const allLoaded = membersData.every(m => userStates[m.uid]);
                if(allLoaded || membersData.length === Object.keys(userStates).length) {
                    setIsLoading(false);
                }
                
                return () => unsubTasks.forEach(unsub => unsub());
            });

             return () => unsubUsers();
        });

        return () => unsubGroup();
    }, [firestore, groupId, currentUserId]);
    
     useEffect(() => {
        if (members.length > 0 && Object.keys(userStates).length >= members.length) {
            setIsLoading(false);
        }
     }, [members, userStates]);


    if (isLoading && members.length === 0) {
        return (
             <div className="h-full w-full flex items-center justify-center">
               <div className="flex flex-col items-center gap-4 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Loading group tasks...</p>
               </div>
             </div>
        );
    }

    return (
        <div className="w-full h-full space-y-8 overflow-y-auto pb-8 snap-y snap-mandatory">
            {members.map(member => (
                <div key={member.uid} className="h-full w-full max-w-md mx-auto flex-shrink-0 snap-start">
                    {userStates[member.uid] ? (
                        <TaskCard 
                            userState={userStates[member.uid]}
                            userProfile={member}
                            userId={member.uid}
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-2xl">
                           <div className="flex flex-col items-center gap-4 text-slate-500">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <p>Loading {member.displayName}'s tasks...</p>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


export default function Home() {
  const { user, profile, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || !profile) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e3eeff] p-4 relative overflow-hidden">
      <ActionButtons />
      {profile.groupId ? (
        <GroupView groupId={profile.groupId} currentUserId={user.uid} />
      ) : (
        <div className="h-full w-full max-w-md mx-auto">
            <SoloView userId={user.uid} profile={profile} />
        </div>
      )}
    </div>
  );
}
