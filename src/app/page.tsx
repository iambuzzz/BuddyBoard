
"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, LogOut, Settings, RefreshCw } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import type { UserState, UserProfile, Group } from '@/lib/types';
import Link from 'next/link';
import { collection, doc, onSnapshot, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

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
    <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
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

        const userProfileRef = doc(firestore, 'users', user.uid);
        const newUserProfile: Omit<UserProfile, 'groupId' | 'pairedWith'> = {
            uid: user.uid,
            email: user.email!,
            displayName: displayName.trim(),
            cardTheme: 'riya',
        };
        batch.set(userProfileRef, newUserProfile);

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
        };
        batch.set(taskListRef, newTaskList);

        try {
            await batch.commit();
            toast({ title: "Welcome!", description: "Your profile has been created."});
            refetch();
        } catch (error: any) {
            console.error("Error creating profile:", error);
            toast({ title: "Error", description: "Could not create your profile. Please try again.", variant: "destructive" });
        } finally {
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

const PairedView = ({ currentUserId, partnerId }: { currentUserId: string, partnerId: string }) => {
    const firestore = useFirestore();
    const [showBack, setShowBack] = useState(false);
    const [currentUserData, setCurrentUserData] = useState<{profile: UserProfile, state: UserState} | null>(null);
    const [partnerData, setPartnerData] = useState<{profile: UserProfile, state: UserState} | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);

        const fetchData = (userId: string, setData: (data: {profile: UserProfile, state: UserState}) => void) => {
            let unsubProfile: () => void;
            let unsubState: () => void;

            const profileRef = doc(firestore, 'users', userId);
            unsubProfile = onSnapshot(profileRef, (profileSnap) => {
                if (profileSnap.exists()) {
                    const profile = profileSnap.data() as UserProfile;
                    const stateRef = doc(firestore, 'task_lists', userId);
                    unsubState = onSnapshot(stateRef, (stateSnap) => {
                        if (stateSnap.exists()) {
                            const state = stateSnap.data() as UserState;
                            setData({ profile, state });
                        }
                    });
                }
            });

            return () => {
                unsubProfile && unsubProfile();
                unsubState && unsubState();
            };
        };

        const unsubCurrentUser = fetchData(currentUserId, setCurrentUserData);
        const unsubPartner = fetchData(partnerId, setPartnerData);

        return () => {
            unsubCurrentUser();
            unsubPartner();
        };
    }, [firestore, currentUserId, partnerId]);

    useEffect(() => {
        if (currentUserData && partnerData) {
            setIsLoading(false);
        }
    }, [currentUserData, partnerData]);


    if (isLoading || !currentUserData || !partnerData) {
         return <LoadingScreen />;
    }

    const userToSwitch = showBack ? currentUserData.profile.displayName : partnerData.profile.displayName;
    const themeForSwitchButton = (showBack ? partnerData.profile.cardTheme : currentUserData.profile.cardTheme) || 'riya';


    const getButtonThemeClass = (theme: string) => {
        switch(theme) {
            case 'riya': return 'bg-purple-500 hover:bg-purple-600 text-white';
            case 'naitik': return 'bg-cyan-500 hover:bg-cyan-600 text-white';
            case 'ambuj': return 'bg-emerald-500 hover:bg-emerald-600 text-white';
            default: return 'bg-purple-500 hover:bg-purple-600 text-white';
        }
    }
    
    return (
        <div className="h-full w-full max-w-4xl mx-auto flex flex-col items-center px-4">
             <Button
                onClick={() => setShowBack(p => !p)}
                className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 mb-4 ${getButtonThemeClass(themeForSwitchButton)}`}
                aria-pressed={showBack}
            >
                <RefreshCw className="h-4 w-4" />
                <span>Switch to {userToSwitch}</span>
            </Button>
            <div className="app-flip-shell w-full h-[calc(100%-4rem)]">
                <div className={`app-flip-card ${showBack ? 'is-back' : ''}`}>
                    <div className="app-face front" style={{ pointerEvents: showBack ? 'none' : 'auto' }}>
                       <TaskCard userId={currentUserData.profile.uid} userProfile={currentUserData.profile} userState={currentUserData.state} />
                    </div>
                    <div className="app-face back" style={{ pointerEvents: showBack ? 'auto' : 'none' }}>
                        <TaskCard userId={partnerData.profile.uid} userProfile={partnerData.profile} userState={partnerData.state} />
                    </div>
                </div>
            </div>
        </div>
    );
};


const GroupView = ({ groupId, currentUserId }: { groupId: string; currentUserId: string }) => {
    const firestore = useFirestore();
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [userStates, setUserStates] = useState<Record<string, UserState | null>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !groupId) return;
    
        setIsLoading(true);
        const groupRef = doc(firestore, 'groups', groupId);
    
        const unsubGroup = onSnapshot(groupRef, async (groupSnap) => {
            if (!groupSnap.exists()) {
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
            const usersSnap = await getDocs(usersQuery);
            const fetchedMembers = usersSnap.docs.map(d => d.data() as UserProfile);

            fetchedMembers.sort((a, b) => {
                if (a.uid === currentUserId) return -1;
                if (b.uid === currentUserId) return 1;
                return a.displayName.localeCompare(b.displayName);
            });
            setMembers(fetchedMembers);

            const unsubscribers = fetchedMembers.map(member => {
                const taskListRef = doc(firestore, 'task_lists', member.uid);
                return onSnapshot(taskListRef, (taskSnap) => {
                    setUserStates(prev => ({
                        ...prev,
                        [member.uid]: taskSnap.exists() ? taskSnap.data() as UserState : null
                    }));
                });
            });

             if(fetchedMembers.length > 0) {
                setIsLoading(false);
            }
    
            return () => {
                unsubscribers.forEach(unsub => unsub());
            };
        });
    
        return () => unsubGroup();
    }, [firestore, groupId, currentUserId]);


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
    
    if (members.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <p>This group has no members.</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full space-y-8 overflow-y-auto pb-8 snap-y snap-mandatory">
            {members.map(member => {
                const userState = userStates[member.uid];
                return (
                    <div key={member.uid} className="h-full w-full max-w-4xl mx-auto flex-shrink-0 snap-center px-4 flex items-center">
                        {userState ? (
                            <TaskCard 
                                userState={userState}
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
                );
            })}
        </div>
    );
};


export default function Home() {
  const { user, profile, isLoading: isUserLoading, refetch } = useUser();
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
    return <LoadingScreen />;
  }
  
  const partnerId = profile.pairedWith;
  const groupId = profile.groupId;

  const renderContent = () => {
    // Priority 1: Group View
    if (groupId) {
      return <GroupView groupId={groupId} currentUserId={user.uid} />;
    }
    // Priority 2: Paired View (only if not in a group)
    if (partnerId) {
      return <PairedView currentUserId={user.uid} partnerId={partnerId} />;
    }
    // Priority 3: Solo View
    return (
      <div className="h-full w-full max-w-4xl mx-auto flex items-center px-4">
        <SoloView userId={user.uid} profile={profile} />
      </div>
    );
  };

  return (
    <main className="h-screen w-full flex flex-col items-center bg-[#e3eeff] relative overflow-hidden py-8">
      <ActionButtons />
      <div className="w-full h-full flex-grow">
        {renderContent()}
      </div>
    </main>
  );
}
