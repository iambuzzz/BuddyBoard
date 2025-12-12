"use client";

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { History, Plus, Timer } from 'lucide-react';

type CelebrationOverlayProps = {
  completed: number;
  total: number;
  totalTimeSpent: number; // in seconds
  onNewList: () => void;
  onRestorePrevious: () => void;
  canRestore: boolean;
  theme: 'riya' | 'naitik' | 'ambuj' | 'default'; // Added default
};

const formatTotalTime = (totalSeconds: number) => {
  if (totalSeconds < 1) return '0 seconds';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

  return parts.join(', ');
};

export function CelebrationOverlay({ completed, total, totalTimeSpent, onNewList, onRestorePrevious, canRestore, theme }: CelebrationOverlayProps) {
  
  const buttonClass = theme === 'riya' ? 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-400' 
    : theme === 'naitik' ? 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-400'
    : 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400';

  const restoreButtonClass = theme === 'riya' ? 'text-purple-600 border-purple-300 hover:bg-purple-50' 
    : theme === 'naitik' ? 'text-cyan-600 border-cyan-300 hover:bg-cyan-50'
    : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50';


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        className="flex flex-col items-center gap-6 w-full max-w-xs"
      >
        <div>
            <h3 className="text-4xl font-bold text-emerald-600">List Finished!</h3>
            <p className="text-lg text-slate-600 mt-2">
              You completed {completed} of {total} tasks.
            </p>
        </div>
        {totalTimeSpent > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-slate-700">
              <Timer className="h-5 w-5" />
              <span className="font-semibold">Your Total Working Time</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{formatTotalTime(totalTimeSpent)}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button
              onClick={onNewList}
              className={`w-full px-6 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${buttonClass}`}
            >
              <Plus className="w-4 h-4 mr-2"/>
              Start New List
            </Button>
            {canRestore && (
              <Button
                variant="outline"
                onClick={onRestorePrevious}
                className={`w-full px-6 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${restoreButtonClass}`}
              >
                <History className="w-4 h-4 mr-2"/>
                Previous List
              </Button>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}
