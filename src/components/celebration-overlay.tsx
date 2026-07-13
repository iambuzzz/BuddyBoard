
"use client";

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { History, Plus, Hammer, Dumbbell, Coffee } from 'lucide-react';
import type { CardTheme } from '@/lib/types';

type CelebrationOverlayProps = {
  completed: number;
  total: number;
  totalTimeSpent: number; // Deep Work time in seconds
  selfGrowthTime: number; // Self Growth time in seconds
  lifeBreakTime: number;  // Life-Break time in seconds
  onNewList: () => void;
  onRestorePrevious: () => void;
  canRestore: boolean;
  theme: CardTheme;
  isCurrentUserCard: boolean;
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

const formatShortTime = (totalSeconds: number) => {
  if (totalSeconds < 1) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
};

export function CelebrationOverlay({ completed, total, totalTimeSpent, selfGrowthTime, lifeBreakTime, onNewList, onRestorePrevious, canRestore, theme, isCurrentUserCard }: CelebrationOverlayProps) {

  const buttonClass = theme === 'periwinkle' ? 'bg-[--theme-periwinkle-primary] hover:bg-purple-600 focus:ring-purple-400'
    : theme === 'cyan' ? 'bg-[--theme-cyan-primary] hover:bg-cyan-600 focus:ring-cyan-400'
      : 'bg-[--theme-emerald-primary] hover:bg-emerald-600 focus:ring-emerald-400';

  const restoreButtonClass = theme === 'periwinkle' ? 'text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-500/40 hover:bg-purple-50 dark:hover:bg-purple-500/10'
    : theme === 'cyan' ? 'text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-cyan-500/10'
      : 'text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10';

  const hasAnyTime = totalTimeSpent > 0 || selfGrowthTime > 0 || lifeBreakTime > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center p-4 rounded-2xl bg-white/80 dark:bg-[#0a0e1a]/85 backdrop-blur-sm dark:backdrop-blur-xl"
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
        className="flex flex-col items-center gap-5 w-full max-w-xs"
      >
        <div>
          <h3 className="text-4xl font-bold text-emerald-600">List Finished!</h3>
          <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">
            You completed {completed} of {total} tasks.
          </p>
        </div>
        {hasAnyTime && (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Work Time */}
            {totalTimeSpent > 0 && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-700 dark:text-white">
                  <Hammer className="h-5 w-5" />
                  <span className="font-semibold">Work Time</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatTotalTime(totalTimeSpent)}</p>
              </div>
            )}
            {/* Self Growth */}
            {selfGrowthTime > 0 && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-700 dark:text-white">
                  <Dumbbell className="h-5 w-5" />
                  <span className="font-semibold">Self Growth</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatTotalTime(selfGrowthTime)}</p>
              </div>
            )}
            {/* Life / Break */}
            {lifeBreakTime > 0 && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-700 dark:text-white">
                  <Coffee className="h-5 w-5" />
                  <span className="font-semibold">Life / Break</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatTotalTime(lifeBreakTime)}</p>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {isCurrentUserCard && (
            <>
              <Button
                onClick={onNewList}
                className={`w-full px-6 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${buttonClass}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New List
              </Button>
              {canRestore && (
                <Button
                  variant="outline"
                  onClick={onRestorePrevious}
                  className={`w-full px-6 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${restoreButtonClass}`}
                >
                  <History className="w-4 h-4 mr-2" />
                  Previous List
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
