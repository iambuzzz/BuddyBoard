"use client";

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { TaskFlipper } from '@/components/task-flipper';
import { useTaskStore } from '@/hooks/use-task-store';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { ArrowUp, LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';

const LogoutButton = () => {
  const auth = getAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
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
  const { user, isLoading, listName } = useUser();
  const router = useRouter();
  const { state } = useTaskStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const scrollToTop = () => {
    const topSection = document.getElementById('top-section');
    if (topSection) {
      topSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]">
        <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="relative">
      <LogoutButton />
      <section id="top-section" className="snap-section h-screen flex flex-col justify-center pt-4 pb-6 pl-5 pr-5" style={{ backgroundColor: '#e3eeff' }}>
        <div className="h-full w-full max-w-4xl mx-auto">
          <TaskFlipper />
        </div>
      </section>
      <section id="ambuj" className="snap-section h-screen flex items-center justify-center pt-4 pb-6 pl-5 pr-5" style={{ backgroundColor: '#e3eeff' }}>
        <div className="h-full w-full max-w-4xl flex flex-col">
           <div className="flex justify-center items-center mb-4">
             <Button
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 bg-[--ambuj-primary] hover:bg-emerald-700 text-white"
              >
                <ArrowUp className="h-4 w-4" />
                <span>Go to Top</span>
              </Button>
           </div>
           <div className="flex-grow min-h-0">
             <TaskCard user="ambuj" />
           </div>
        </div>
      </section>
    </div>
  );
}
