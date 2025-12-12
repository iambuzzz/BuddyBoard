
"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, LogOut, Settings } from 'lucide-react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import type { UserState, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { useGroupData } from '@/hooks/use-group-data';

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
    const { userState, isLoading } = useGroupData(null, userId);

    if (isLoading || !userState[userId]) {
        return (
             <div className="h-full w-full flex items-center justify-center">
               <div className="flex flex-col items-center gap-4 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Loading your tasks...</p>
               </div>
             </div>
        );
    }

    return <TaskCard userState={userState[userId]} userProfile={profile} userId={userId} />;
};

const GroupView = ({ groupId, currentUserId }: { groupId: string; currentUserId: string }) => {
    const { groupMembers, userState, isLoading } = useGroupData(groupId, currentUserId);

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
            {groupMembers.map(member => (
                <div key={member.uid} className="h-full w-full max-w-md mx-auto flex-shrink-0 snap-start">
                    {userState[member.uid] ? (
                        <TaskCard 
                            userState={userState[member.uid]}
                            userProfile={member}
                            userId={member.uid}
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-2xl">
                            <p className="text-slate-500">Loading {member.displayName}'s tasks...</p>
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
