"use client";

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTaskStore } from '@/hooks/use-task-store';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { TaskCard } from './task-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, PanInfo } from 'framer-motion';

const ConnectionStatus = () => {
  const { state } = useTaskStore();

  if (state.connectionStatus === 'connecting') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center justify-center text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connecting...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state.connectionStatus === 'error') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center justify-center text-sm text-red-500">
              <WifiOff className="w-5 h-5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connection Error</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center text-sm text-emerald-600">
            <Wifi className="w-5 h-5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connected</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function TaskFlipper() {
  const { state, switchUser } = useTaskStore();
  
  const buttonThemeClass = state.showBack
    ? 'bg-[--naitik-primary] hover:bg-cyan-500 text-white' 
    : 'bg-[--riya-primary] hover:bg-violet-500 text-white';

  const userToSwitch = state.showBack ? 'Riya' : 'Naitik';

  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      // Swiped right
      if (state.showBack) switchUser();
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left
      if (!state.showBack) switchUser();
    }
  };


  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="w-36 flex justify-start pl-2">
          <ConnectionStatus />
        </div>
        <Button
          onClick={switchUser}
          className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 ${buttonThemeClass}`}
          aria-pressed={state.showBack}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Switch to {userToSwitch}</span>
        </Button>
         <div className="w-36" />
      </div>

      <motion.div 
        className="app-flip-shell flex-grow max-w-4xl mx-auto w-full select-none"
        drag="x"
        onDragEnd={onDragEnd}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        style={{ cursor: 'grab' }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <div className={`app-flip-card ${state.showBack ? 'is-back' : ''}`}>
          <div className="app-face front">
            <TaskCard user="riya" />
          </div>
          <div className="app-face back">
            <TaskCard user="naitik" />
          </div>
        </div>
      </motion.div>
    </>
  );
}
