
"use client";

import { Trophy } from 'lucide-react';
import type { CardTheme } from '@/lib/types';

type ScoreBadgeProps = {
  dailyCompleted: number;
  dailyTotal: number;
  theme: CardTheme;
};

export function ScoreBadge({
  dailyCompleted,
  dailyTotal,
  theme
}: ScoreBadgeProps) {
  
  const displayText = `${dailyCompleted}/${dailyTotal}`;

  const themeClass = 
    theme === 'periwinkle' ? 'bg-[--theme-periwinkle-secondary] text-[--theme-periwinkle-text] border-[--theme-periwinkle-primary]' : 
    theme === 'cyan' ? 'bg-[--theme-cyan-secondary] text-[--theme-cyan-text] border-[--theme-cyan-primary]' :
    'bg-[--theme-emerald-secondary] text-[--theme-emerald-text] border-[--theme-emerald-primary]';


  return (
    <div className="flex justify-center items-center">
      <div
        className={`flex items-center justify-center gap-2 h-12 px-3 rounded-xl font-semibold text-sm sm:text-base border ${themeClass}`}
      >
          <Trophy className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{displayText}</span>
      </div>
    </div>
  );
}
