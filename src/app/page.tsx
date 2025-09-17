"use client";

import { TaskFlipper } from '@/components/task-flipper';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-slate-500" />
        <p className="mt-4 text-slate-500">Connecting...</p>
      </div>
    );
  }

  if (user) {
    console.log('Firebase User ID:', user.uid);
  }

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <main className="flex-grow flex flex-col min-h-0">
        <TaskFlipper />
      </main>
    </div>
  );
}
