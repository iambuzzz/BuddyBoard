"use client";

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTaskStore } from '@/hooks/use-task-store';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

const ConnectionStatus = () => {
  const { state } = useTaskStore();
  
  if (state.connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }
  
  if (state.connectionStatus === 'error') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-red-500">
        <WifiOff className="w-4 h-4" />
        <span>Connection Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
      <Wifi className="w-4 h-4" />
      <span>Connected</span>
    </div>
  );
};


export function TaskFlipper() {
  const { state, switchUser } = useTaskStore();
  
  const buttonThemeClass = state.showBack 
    ? 'bg-[--riya-primary] hover:bg-violet-500 text-white' 
    : 'bg-[--ambuj-primary] hover:bg-cyan-500 text-white';


  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="w-36">
          <ConnectionStatus />
        </div>
        <Button
          onClick={switchUser}
          className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 ${buttonThemeClass}`}
          aria-pressed={state.showBack}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Switch to {state.showBack ? 'Riya' : 'Ambuj'}</span>
        </Button>
         <div className="w-36" />
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
