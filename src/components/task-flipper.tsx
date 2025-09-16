"use client";

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTaskStore } from '@/hooks/use-task-store';
import { TaskCard } from './task-card';
import { Loader2 } from 'lucide-react';

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
  
  const buttonThemeClass = state.showBack 
    ? 'bg-[--riya-primary] hover:bg-violet-500 text-white'
    : 'bg-[--ambuj-primary] hover:bg-cyan-500 text-white' ;


  return (
    <>
      <div className="flex justify-center mb-4">
        <Button
          onClick={switchUser}
          className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none ${buttonThemeClass}`}
          aria-pressed={state.showBack}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Switch to {state.showBack ? 'Riya' : 'Ambuj'}</span>
        </Button>
      </div>

      <div className="app-flip-shell flex-grow max-w-4xl mx-auto w-full">
        <div className={`app-flip-card ${state.showBack ? 'is-back' : ''}`}>
          <div className="app-face front">
            <TaskCard user="riya" />
          </div>
          <div className="app-face back" style={{ transform: 'rotateY(180deg)' }}>
            <TaskCard user="ambuj" />
          </div>
        </div>
      </div>
    </>
  );
}
