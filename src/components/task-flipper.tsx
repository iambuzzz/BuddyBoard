"use client";

import { Button } from '@/components/ui/button';
import { ChevronsRight, Loader2 } from 'lucide-react';
import { useTaskStore } from '@/hooks/use-task-store';
import { TaskCard } from './task-card';

export function TaskFlipper() {
  const { state, switchUser } = useTaskStore();

  if (state.status === 'loading') {
    return (
      <div className="text-center py-10 flex items-center justify-center gap-3 text-xl text-slate-500">
        <Loader2 className="animate-spin" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center mb-6">
        <Button
          onClick={switchUser}
          className="inline-flex items-center gap-2 rounded-full bg-slate-800 text-white text-sm px-4 py-2 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-pressed={state.showBack}
        >
          <span>{state.showBack ? 'Switch to Riya' : 'Switch to Ambuj'}</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="app-flip-shell max-w-4xl mx-auto" style={{ height: '72vh' }}>
        <div className={`app-flip-card ${state.showBack ? 'is-back' : ''}`}>
          <div className="app-face front">
            <TaskCard user="riya" />
          </div>
          <div className="app-face back">
            <TaskCard user="ambuj" />
          </div>
        </div>
      </div>
    </>
  );
}
