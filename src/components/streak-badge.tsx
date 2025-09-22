"use client";

import { Flame } from 'lucide-react';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type StreakBadgeProps = {
  currentStreak: number;
  maxStreak: number;
  theme: User;
};

export function StreakBadge({ currentStreak, maxStreak, theme }: StreakBadgeProps) {
  const hasCurrentStreak = currentStreak > 0;
  const displayValue = hasCurrentStreak ? currentStreak : maxStreak;
  const tooltipText = hasCurrentStreak
    ? `You're on a ${currentStreak}-day streak!`
    : `Your longest streak was ${maxStreak} days.`;

  if (displayValue === 0) {
    return null;
  }
  
  const themeClasses = {
    riya: {
      text: 'text-orange-500',
      glow: 'shadow-[0_0_12px_2px_rgba(249,115,22,0.5)]',
      fadedText: 'text-slate-400',
      fadedGlow: 'shadow-[0_0_12px_2px_rgba(148,163,184,0.3)]',
    },
    naitik: {
      text: 'text-orange-500',
      glow: 'shadow-[0_0_12px_2px_rgba(249,115,22,0.5)]',
      fadedText: 'text-slate-400',
      fadedGlow: 'shadow-[0_0_12px_2px_rgba(148,163,184,0.3)]',
    },
    ambuj: {
      text: 'text-orange-500',
      glow: 'shadow-[0_0_12px_2px_rgba(249,115,22,0.5)]',
      fadedText: 'text-slate-400',
      fadedGlow: 'shadow-[0_0_12px_2px_rgba(148,163,184,0.3)]',
    },
  };
  
  const currentTheme = themeClasses[theme];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 p-1 rounded-full transition-all duration-300',
              hasCurrentStreak
                ? `${currentTheme.text} ${currentTheme.glow}`
                : currentTheme.fadedText
            )}
          >
            <Flame
              className="h-5 w-5"
              fill={hasCurrentStreak ? 'currentColor' : 'none'}
            />
            <span className="text-sm font-bold">{displayValue}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
