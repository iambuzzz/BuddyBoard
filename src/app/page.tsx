
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
import { collection, doc, onSnapshot, query, where, setDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

const CreateProfile = () => {
    const { user, refetch } = useUser();
    const firestore = useFirestore();
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !displayName.trim()) {
            toast({ title: "Error", description: "Please enter a display name.", variant: "destructive"});
            return;
        }

        setLoading(true);

        const batch = writeBatch(firestore);

        // 1. Create user profile
        const userProfileRef = doc(firestore, 'users', user.uid);
        const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: displayName.trim(),
            cardTheme: 'riya', // default theme
        };
        batch.set(userProfileRef, newUserProfile);

        // 2. Create initial task list
        const taskListRef = doc(firestore, 'task_lists', user.uid);
        const newTaskList: UserState = {
            tasks: [],
            previousTasks: [],
            isLocked: false,
            isFinished: false,
            totalCompleted: 0,
            totalAssigned: 0,
            currentStreak: 0,
            maxStreak: 0,
            lockedAt: null,
            lastLockedAt: null,
            pairedWith: null,
        };
        batch.set(taskListRef, newTaskList);

        try {
            await batch.commit();
            toast({ title: "Welcome!", description: "Your profile has been created."});
            refetch?.(); // Refetch the user data to get the new profile
        } catch (error: any) {
            console.error("Error creating profile:", error);
            toast({ title: "Error", description: "Could not create your profile. Please try again.", variant: "destructive" });
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff] p-4">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                    <CardDescription>Let's set up your profile. What should we call you?</CardDescription>
                </CardHeader>
                <form onSubmit={handleCreateProfile}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="display-name">Display Name</Label>
                            <Input
                                id="display-name"
                                type="text"
                                placeholder="e.g., Ambuj"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : null}
                            Create Profile
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};


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
        if (!firestore || !groupId) return;

        const groupRef = doc(firestore, 'groups', groupId);
        
        const unsubGroup = onSnapshot(groupRef, async (groupSnap) => {
            if (!groupSnap.exists()) {
                // This might happen if the user leaves the group
                setIsLoading(false);
                return;
            }

            const groupData = groupSnap.data() as Group;
            const memberUids = Object.keys(groupData.members);

            if (memberUids.length === 0) {
                setMembers([]);
                setUserStates({});
                setIsLoading(false);
                return;
            }

            const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
            const unsubUsers = onSnapshot(usersQuery, (usersSnap) => {
                const fetchedMembers = usersSnap.docs.map(d => d.data() as UserProfile);

                fetchedMembers.sort((a, b) => {
                    if (a.uid === currentUserId) return -1;
                    if (b.uid === currentUserId) return 1;
                    return a.displayName.localeCompare(b.displayName);
                });
                
                setMembers(fetchedMembers);

                const taskListeners = fetchedMembers.map(member => 
                    onSnapshot(doc(firestore, 'task_lists', member.uid), (taskSnap) => {
                         setUserStates(prev => ({
                            ...prev,
                            [member.uid]: taskSnap.exists() ? (taskSnap.data() as UserState) : null,
                        }));
                    })
                );

                return () => taskListeners.forEach(unsub => unsub());
            });
            
            return () => unsubUsers();
        });

        return () => unsubGroup();

    }, [firestore, groupId, currentUserId]);
    
     useEffect(() => {
        if (members.length > 0 && Object.keys(userStates).length >= members.length) {
            // Check if all fetched members have a corresponding state (even if null)
            const allStatesAccountedFor = members.every(m => Object.prototype.hasOwnProperty.call(userStates, m.uid));
            if (allStatesAccountedFor) {
              setIsLoading(false);
            }
        } else if (members.length === 0 && !isLoading) {
            // Handled in the group snapshot listener, but as a fallback
            setIsLoading(false);
        }
     }, [members, userStates, isLoading]);


    if (isLoading) {
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
                            userState={userStates[member.uid]!}
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

  if (isUserLoading) {
    return <LoadingScreen />;
  }
  
  if (user && !profile) {
      return <CreateProfile />;
  }

  if (!user || !profile) {
    // This case should be covered by the useEffect redirect, but as a fallback
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

    