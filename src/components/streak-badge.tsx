"use client";

import { Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CardTheme } from '@/lib/types';

type StreakBadgeProps = {
  currentStreak: number;
  maxStreak: number;
  theme: CardTheme;
};

export function StreakBadge({ currentStreak, maxStreak, theme }: StreakBadgeProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleToggle = () => setIsFlipped(!isFlipped);

  const themeClasses = {
    periwinkle: { currentText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]', maxText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
    cyan: { currentText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]', maxText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
    emerald: { currentText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]', maxText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
    default: { currentText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]', maxText: 'text-orange-500 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
  };

  const currentTheme = themeClasses[theme] || themeClasses.default;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="streak-badge-container h-7 w-12" onClick={handleToggle} title="Click to toggle streak">
            <div className={`streak-badge w-full h-full ${isFlipped ? 'is-flipped' : ''}`}>
              {/* Front Face: Current Streak */}
              <div className="streak-face streak-front">
                <div
                  className={cn(
                    'flex items-center gap-1 p-1 rounded-full transition-all duration-300',
                    currentStreak > 0 ? `${currentTheme.currentText}` : 'text-slate-400 dark:text-slate-500',
                  )}
                >
                  <Flame
                    className="h-5 w-5"
                    fill={currentStreak > 0 ? 'currentColor' : 'none'}
                  />
                  <span className="text-sm font-bold">{currentStreak}</span>
                </div>
              </div>
              {/* Back Face: Max Streak */}
              <div className="streak-face streak-back">
                <div
                  className={cn(
                    'flex items-center gap-1 p-1 rounded-full transition-all duration-300',
                    maxStreak > 0 ? currentTheme.maxText : 'text-slate-400 dark:text-slate-500',
                  )}
                >
                  <Star className="h-5 w-5" fill={maxStreak > 0 ? "currentColor" : "none"} />
                  <span className="text-sm font-bold">{maxStreak}</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFlipped ? `Longest streak: ${maxStreak} days` : `Current streak: ${currentStreak} days`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
