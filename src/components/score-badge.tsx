"use client";

import { Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CardTheme } from '@/lib/types';

type ScoreBadgeProps = {
  dailyCompleted: number;
  dailyTotal: number;
  lifetimeCompleted: number;
  lifetimeTotal: number;
  isLocked: boolean;
  theme: CardTheme;
};

export function ScoreBadge({
  dailyCompleted,
  dailyTotal,
  lifetimeCompleted,
  lifetimeTotal,
  isLocked,
  theme
}: ScoreBadgeProps) {
  const [isFlipped, setIsFlipped] = useState(isLocked);

  useEffect(() => {
    setIsFlipped(isLocked);
  }, [isLocked]);

  const frontText = `${lifetimeCompleted}/${lifetimeTotal}`;
  const backText = `${+dailyCompleted}/${dailyTotal}`;

  const handleToggle = () => {
    if (isLocked) {
      setIsFlipped(!isFlipped);
    }
  };

  const themeClass = 
    theme === 'periwinkle' ? 'bg-[--theme-periwinkle-secondary] text-[--theme-periwinkle-text] border-[--theme-periwinkle-primary]' : 
    theme === 'cyan' ? 'bg-[--theme-cyan-secondary] text-[--theme-cyan-text] border-[--theme-cyan-primary]' :
    'bg-[--theme-emerald-secondary] text-[--theme-emerald-text] border-[--theme-emerald-primary]';


  return (
    <div className="score-badge-container w-20 sm:w-32 h-12 flex justify-center items-center">
      <div
        className={`score-badge w-full h-full rounded-xl font-semibold text-sm sm:text-base border ${isLocked ? 'cursor-pointer' : 'cursor-default'} ${themeClass} ${isFlipped ? 'is-flipped' : ''}`}
        onClick={handleToggle}
        title={isLocked ? 'Click to toggle score' : ' '}
      >
        <div className="score-face score-front">
          <Trophy className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{frontText}</span>
        </div>
        <div className="score-face score-back">
          <Trophy className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{backText}</span>
        </div>
      </div>
    </div>
  );
}
