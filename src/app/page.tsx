
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
    <div className="flex items-center gap-2 z-50">
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

type PairedCardProps = {
  user1: { profile: UserProfile; state: UserState };
  user2: { profile: UserProfile; state: UserState };
  isCurrentUserThePrimary: boolean;
};

const PairedTaskCard = ({ user1, user2, isCurrentUserThePrimary }: PairedCardProps) => {
    const [showBack, setShowBack] = useState(!isCurrentUserThePrimary);
    const primaryUser = isCurrentUserThePrimary ? user1 : user2;
    const secondaryUser = isCurrentUserThePrimary ? user2 : user1;

    const visibleUser = showBack ? secondaryUser : primaryUser;
    const hiddenUser = showBack ? primaryUser : secondaryUser;

    const getButtonThemeClass = (theme: string) => {
        switch(theme) {
            case 'riya': return 'bg-[--riya-primary] hover:bg-violet-500 text-white';
            case 'naitik': return 'bg-[--naitik-primary] hover:bg-cyan-500 text-white';
            case 'ambuj': return 'bg-[--ambuj-primary] hover:bg-emerald-500 text-white';
            default: return 'bg-[--riya-primary] hover:bg-violet-500 text-white';
        }
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                 <div className="w-40"></div>
                 <Button
                    onClick={() => setShowBack(p => !p)}
                    className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 ${getButtonThemeClass(visibleUser.profile.cardTheme)}`}
                    aria-pressed={showBack}
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Switch to {hiddenUser.profile.displayName}</span>
                </Button>
                <div className="w-40 flex justify-end">
                    <ActionButtons />
                </div>
            </div>
            <div className="app-flip-shell flex-grow">
                <div className={`app-flip-card ${showBack ? 'is-back' : ''}`}>
                    <div className="app-face front" style={{ pointerEvents: showBack ? 'none' : 'auto' }}>
                       <TaskCard userId={primaryUser.profile.uid} userProfile={primaryUser.profile} userState={primaryUser.state} />
                    </div>
                    <div className="app-face back" style={{ pointerEvents: showBack ? 'auto' : 'none' }}>
                        <TaskCard userId={secondaryUser.profile.uid} userProfile={secondaryUser.profile} userState={secondaryUser.state} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const PairedView = ({ currentUserId, partnerId }: { currentUserId: string, partnerId: string }) => {
    const firestore = useFirestore();
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
    
    return (
        <div className="h-full w-full flex items-center justify-center p-4">
            <div className="w-full max-w-4xl h-full">
                <PairedTaskCard
                    user1={currentUserData}
                    user2={partnerData}
                    isCurrentUserThePrimary={true}
                />
            </div>
        </div>
    );
};


type GroupDisplayItem = UserProfile | [UserProfile, UserProfile];

const GroupView = ({ groupId, currentUserId }: { groupId: string; currentUserId: string }) => {
    const firestore = useFirestore();
    const [displayItems, setDisplayItems] = useState<GroupDisplayItem[]>([]);
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
                setDisplayItems([]);
                setUserStates({});
                setIsLoading(false);
                return;
            }
    
            const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
            const usersSnap = await getDocs(usersQuery);
            const members = usersSnap.docs.map(d => d.data() as UserProfile);

            const processed = new Set<string>();
            const items: GroupDisplayItem[] = [];
            const memberMap = new Map(members.map(m => [m.uid, m]));

            for (const member of members) {
                if (processed.has(member.uid)) continue;

                if (member.pairedWith && memberMap.has(member.pairedWith) && memberMap.get(member.pairedWith)!.pairedWith === member.uid) {
                    const partner = memberMap.get(member.pairedWith)!;
                    items.push([member, partner]);
                    processed.add(member.uid);
                    processed.add(partner.uid);
                } else {
                    items.push(member);
                    processed.add(member.uid);
                }
            }

            items.sort((a, b) => {
                const aIsCurrentUser = Array.isArray(a) ? a.some(m => m.uid === currentUserId) : a.uid === currentUserId;
                const bIsCurrentUser = Array.isArray(b) ? b.some(m => m.uid === currentUserId) : b.uid === currentUserId;
                if (aIsCurrentUser) return -1;
                if (bIsCurrentUser) return 1;

                const nameA = Array.isArray(a) ? a[0].displayName : a.displayName;
                const nameB = Array.isArray(b) ? b[0].displayName : b.displayName;
                return nameA.localeCompare(nameB);
            });
            
            setDisplayItems(items);

            const unsubscribers = members.map(member => {
                const taskListRef = doc(firestore, 'task_lists', member.uid);
                return onSnapshot(taskListRef, (taskSnap) => {
                    setUserStates(prev => ({
                        ...prev,
                        [member.uid]: taskSnap.exists() ? taskSnap.data() as UserState : null
                    }));
                });
            });

             if(members.length > 0) {
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
    
    if (displayItems.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <p>This group has no members.</p>
            </div>
        )
    }

    return (
        <div className="h-screen w-full snap-y snap-mandatory overflow-y-auto">
            {displayItems.map((item, index) => {
                const isPair = Array.isArray(item);
                const key = isPair ? item[0].uid : item.uid;

                return (
                    <div key={key} className="h-screen w-full snap-start flex items-center justify-center p-4">
                        <div className="w-full max-w-4xl h-full">
                            {isPair ? (
                                (() => {
                                    const [user1, user2] = item;
                                    const state1 = userStates[user1.uid];
                                    const state2 = userStates[user2.uid];
                                    const isCurrentUserInPair = user1.uid === currentUserId || user2.uid === currentUserId;
                                    const isCurrentUserPrimary = isCurrentUserInPair && user1.uid === currentUserId;

                                    if (!state1 || !state2) {
                                        return (
                                            <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-2xl">
                                                <div className="flex flex-col items-center gap-4 text-slate-500">
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                    <p>Loading {user1.displayName} & {user2.displayName}'s tasks...</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <PairedTaskCard
                                            user1={{ profile: user1, state: state1 }}
                                            user2={{ profile: user2, state: state2 }}
                                            isCurrentUserThePrimary={isCurrentUserPrimary}
                                        />
                                    );
                                })()
                            ) : (
                                (() => {
                                    const member = item as UserProfile;
                                    const userState = userStates[member.uid];
                                    return (
                                        <div className="h-full w-full">
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
                                })()
                            )}
                        </div>
                    </div>
                );
            })}
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
    return <LoadingScreen />;
  }
  
  const partnerId = profile.pairedWith;
  const groupId = profile.groupId;
  const isSoloView = !partnerId && !groupId;

  const renderContent = () => {
    if (groupId) {
      return <GroupView groupId={groupId} currentUserId={user.uid} />;
    }
    if (partnerId) {
      return <PairedView currentUserId={user.uid} partnerId={partnerId} />;
    }
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-full relative">
            <div className="absolute top-0 right-0 z-10">
                <ActionButtons />
            </div>
            <SoloView userId={user.uid} profile={profile} />
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen w-full flex flex-col items-center bg-[#e3eeff] relative overflow-hidden">
      <div className="w-full h-full flex-grow">
        {renderContent()}
      </div>
    </main>
  );
}
