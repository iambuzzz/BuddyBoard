

"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, LogOut, Settings, RefreshCw, ArrowUp, Users, AreaChart } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import type { UserState, UserProfile, Group, CardTheme } from '@/lib/types';
import Link from 'next/link';
import { collection, doc, onSnapshot, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GroupMembersSheet } from '@/components/group-members-sheet';


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
            cardTheme: 'periwinkle',
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


const SoloView = ({ userId, profile, isFirstCardInGroup = true }: { userId: string; profile: UserProfile, isFirstCardInGroup?: boolean }) => {
    const firestore = useFirestore();
    const [userState, setUserState] = useState<UserState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };
    
    const handleGoToTop = () => {
        const listEl = document.querySelector('.snap-y');
        if (listEl) {
            listEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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

    return (
        <div className="flex flex-col h-full">
             <div className="flex justify-between items-center mb-4">
                 <div className="w-40 flex justify-start">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Settings">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>
                 </div>
                 <div className="w-40 flex justify-end">
                    {isFirstCardInGroup ? (
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:bg-slate-100" aria-label="Logout">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    ) : (
                         <Button variant="ghost" size="icon" onClick={handleGoToTop} className="text-slate-600 hover:bg-slate-100" aria-label="Go to Top">
                            <ArrowUp className="h-5 w-5" />
                        </Button>
                    )}
                 </div>
            </div>
            <div className="flex-grow h-full">
                <TaskCard userState={userState} userProfile={profile} userId={userId} />
            </div>
        </div>
    );
};

type PairedCardProps = {
  user1: { profile: UserProfile; state: UserState };
  user2: { profile: UserProfile; state: UserState };
  isCurrentUserThePrimary: boolean;
  isFirstCardInGroup?: boolean;
};

const PairedTaskCard = ({ user1, user2, isCurrentUserThePrimary, isFirstCardInGroup = true }: PairedCardProps) => {
    const [showBack, setShowBack] = useState(!isCurrentUserThePrimary);
    const primaryUser = isCurrentUserThePrimary ? user1 : user2;
    const secondaryUser = isCurrentUserThePrimary ? user2 : user1;
    const auth = useAuth();
    const router = useRouter();


    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };
    
    const handleGoToTop = () => {
        const listEl = document.querySelector('.snap-y');
        if (listEl) {
            listEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const visibleUser = showBack ? secondaryUser : primaryUser;

    const getButtonThemeClass = (theme: CardTheme) => {
        switch(theme) {
            case 'periwinkle': return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
            case 'cyan': return 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white';
            case 'emerald': return 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white';
            default: return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
        }
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                 <div className="w-40 flex justify-start">
                     <Link href="/settings">
                        <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Settings">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>
                 </div>
                 <Button
                    onClick={() => router.push(`/stats/${visibleUser.profile.uid}`)}
                    className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 ${getButtonThemeClass(visibleUser.profile.cardTheme)}`}
                >
                    <AreaChart className="h-4 w-4" />
                    <span>Stats</span>
                </Button>
                <div className="w-40 flex justify-end items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowBack(p => !p)} className="text-slate-600 hover:bg-slate-100" aria-label="Switch User">
                        <RefreshCw className="h-5 w-5" />
                    </Button>
                    {isFirstCardInGroup ? (
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:bg-slate-100" aria-label="Logout">
                            <LogOut className="h-5 w-5" />
                        </Button>
                     ) : (
                         <Button variant="ghost" size="icon" onClick={handleGoToTop} className="text-slate-600 hover:bg-slate-100" aria-label="Go to Top">
                            <ArrowUp className="h-5 w-5" />
                        </Button>
                    )}
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
    const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
    const [userStates, setUserStates] = useState<Record<string, UserState | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setSheetOpen] = useState(false);
    
    const [flippedStates, setFlippedStates] = useState<Record<string, boolean>>({});

    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };
    
    const handleGoToTop = () => {
        const listEl = document.querySelector('.snap-y');
        if (listEl) {
            listEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSelectMember = (uid: string) => {
        setSheetOpen(false);

        let scrollId = uid;
        let shouldBeFlipped = false;
        
        const pair = displayItems.find(item => Array.isArray(item) && (item[0].uid === uid || item[1].uid === uid));
        
        if (pair && Array.isArray(pair)) {
            scrollId = pair[0].uid; // The scroll ID is always the first user in the pair
            if (pair[1].uid === uid) {
                shouldBeFlipped = true;
            }
        }
        
        const element = document.querySelector(`[data-scroll-id="${scrollId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Update the flipped state for this specific card
            setFlippedStates(prev => ({ ...prev, [scrollId]: shouldBeFlipped }));
        }
    };

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
                setGroupMembers([]);
                setIsLoading(false);
                return;
            }
    
            const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
            const usersSnap = await getDocs(usersQuery);
            const members = usersSnap.docs.map(d => d.data() as UserProfile);
            setGroupMembers(members);

            const processed = new Set<string>();
            const items: GroupDisplayItem[] = [];
            const memberMap = new Map(members.map(m => [m.uid, m]));
            const newFlippedStates: Record<string, boolean> = {};

            // Prioritize current user's pairs
            const currentUserProfile = memberMap.get(currentUserId);
            if (currentUserProfile && currentUserProfile.pairedWith && memberMap.has(currentUserProfile.pairedWith) && !processed.has(currentUserId)) {
                const partner = memberMap.get(currentUserProfile.pairedWith)!;
                 if (partner.pairedWith === currentUserId) { // Ensure the pairing is mutual
                    items.push([currentUserProfile, partner]);
                    processed.add(currentUserId);
                    processed.add(partner.uid);
                    newFlippedStates[currentUserProfile.uid] = false; // Current user is primary, not flipped
                }
            }

            for (const member of members) {
                if (processed.has(member.uid)) continue;

                if (member.pairedWith && memberMap.has(member.pairedWith) && memberMap.get(member.pairedWith)!.pairedWith === member.uid) {
                    const partner = memberMap.get(member.pairedWith)!;
                    items.push([member, partner]);
                    processed.add(member.uid);
                    processed.add(partner.uid);
                    newFlippedStates[member.uid] = false; // Default to not flipped
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
            setFlippedStates(newFlippedStates);

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

    const renderTopBarButtons = (isFirstCard: boolean) => {
        return (
            <div className="flex justify-between items-center mb-4">
                <div className="w-40 flex justify-start items-center gap-2">
                     <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Group Members" onClick={() => setSheetOpen(true)}>
                        <Users className="h-5 w-5" />
                    </Button>
                    <Link href="/settings">
                       <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Settings">
                           <Settings className="h-5 w-5" />
                       </Button>
                   </Link>
                </div>

               <div className="w-40 flex justify-end">
                   {isFirstCard ? (
                       <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:bg-slate-100" aria-label="Logout">
                           <LogOut className="h-5 w-5" />
                       </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={handleGoToTop} className="text-slate-600 hover:bg-slate-100" aria-label="Go to Top">
                           <ArrowUp className="h-5 w-5" />
                       </Button>
                   )}
                </div>
           </div>
        )
    }

    return (
        <>
        <GroupMembersSheet 
            isOpen={isSheetOpen}
            onOpenChange={setSheetOpen}
            members={groupMembers}
            onSelectMember={handleSelectMember}
            currentUserId={currentUserId}
        />
        <div className="h-screen w-full snap-y snap-mandatory overflow-y-auto">
            {displayItems.map((item, index) => {
                const isPair = Array.isArray(item);
                const scrollId = isPair ? item[0].uid : item.uid;
                const isFirstCard = index === 0;

                return (
                    <div key={scrollId} data-scroll-id={scrollId} className="h-screen w-full snap-center flex items-center justify-center p-4">
                        <div className="w-full max-w-4xl h-full flex flex-col">
                            {isPair ? (
                                (() => {
                                    const [user1, user2] = item;
                                    const isCurrentUserInThisPair = user1.uid === currentUserId || user2.uid === currentUserId;
                                    
                                    const primaryUser = (isFirstCard && isCurrentUserInThisPair) 
                                        ? (user1.uid === currentUserId ? user1 : user2) 
                                        : user1;
                                    const secondaryUser = primaryUser.uid === user1.uid ? user2 : user1;
                                    
                                    const primaryState = userStates[primaryUser.uid];
                                    const secondaryState = userStates[secondaryUser.uid];
                                    
                                    if (!primaryState || !secondaryState) {
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
                                        <PairedTaskWrapper 
                                            user1={{ profile: primaryUser, state: primaryState }}
                                            user2={{ profile: secondaryUser, state: secondaryState }}
                                            showBack={flippedStates[scrollId]}
                                            setShowBack={(value) => setFlippedStates(prev => ({...prev, [scrollId]: value}))}
                                            isFirstCardInGroup={isFirstCard}
                                            onOpenGroupSheet={() => setSheetOpen(true)}
                                        />
                                    );
                                })()
                            ) : (
                                (() => {
                                    const member = item as UserProfile;
                                    const userState = userStates[member.uid];
                                    return (
                                        <div className="h-full w-full flex flex-col">
                                            {renderTopBarButtons(isFirstCard)}
                                            <div className="flex-grow min-h-0">
                                            {userState ? (
                                                <TaskCard 
                                                    userId={member.uid}
                                                    userProfile={member}
                                                    userState={userState}
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
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
        </>
    );
};


type PairedTaskWrapperProps = {
  user1: { profile: UserProfile; state: UserState };
  user2: { profile: UserProfile; state: UserState };
  showBack: boolean;
  setShowBack: (value: boolean) => void;
  isFirstCardInGroup: boolean;
  onOpenGroupSheet: () => void;
};


const PairedTaskWrapper = ({ user1, user2, showBack, setShowBack, isFirstCardInGroup, onOpenGroupSheet }: PairedTaskWrapperProps) => {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => { if (auth) { await signOut(auth); router.push('/login'); } };
    const handleGoToTop = () => { const listEl = document.querySelector('.snap-y'); if (listEl) { listEl.scrollTo({ top: 0, behavior: 'smooth' }); } };
    
    const visibleUser = showBack ? user2 : user1;

    const getButtonThemeClass = (theme: CardTheme) => {
        switch(theme) {
            case 'periwinkle': return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
            case 'cyan': return 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white';
            case 'emerald': return 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white';
            default: return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                 <div className="w-40 flex justify-start items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Group Members" onClick={onOpenGroupSheet}>
                        <Users className="h-5 w-5" />
                    </Button>
                    <Link href="/settings">
                       <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" aria-label="Settings">
                           <Settings className="h-5 w-5" />
                       </Button>
                   </Link>
                </div>
                <Button
                    onClick={() => router.push(`/stats/${visibleUser.profile.uid}`)}
                    className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 ${getButtonThemeClass(visibleUser.profile.cardTheme)}`}
                >
                    <AreaChart className="h-4 w-4" />
                    <span>Stats</span>
                </Button>
               <div className="w-40 flex justify-end items-center gap-2">
                   <Button variant="ghost" size="icon" onClick={() => setShowBack(!showBack)} className="text-slate-600 hover:bg-slate-100" aria-label="Switch User">
                        <RefreshCw className="h-5 w-5" />
                    </Button>
                   {isFirstCardInGroup ? (
                       <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:bg-slate-100" aria-label="Logout">
                           <LogOut className="h-5 w-5" />
                       </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={handleGoToTop} className="text-slate-600 hover:bg-slate-100" aria-label="Go to Top">
                           <ArrowUp className="h-5 w-5" />
                       </Button>
                   )}
                </div>
           </div>

            <div className="app-flip-shell flex-grow">
                <div className={`app-flip-card ${showBack ? 'is-back' : ''}`}>
                    <div className="app-face front" style={{ pointerEvents: showBack ? 'none' : 'auto' }}>
                       <TaskCard userId={user1.profile.uid} userProfile={user1.profile} userState={user1.state} />
                    </div>
                    <div className="app-face back" style={{ pointerEvents: showBack ? 'auto' : 'none' }}>
                        <TaskCard userId={user2.profile.uid} userProfile={user2.profile} userState={user2.state} />
                    </div>
                </div>
            </div>
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

  const renderContent = () => {
    if (groupId) {
      return <GroupView groupId={groupId} currentUserId={user.uid} />;
    }
    if (partnerId) {
      return <PairedView currentUserId={user.uid} partnerId={partnerId} />;
    }
    // Solo View
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-full relative">
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

    