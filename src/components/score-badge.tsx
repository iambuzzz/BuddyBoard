"use client";

import { Trophy } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

type ScoreBadgeProps = {
  dailyCompleted: number;
  dailyTotal: number;
  lifetimeCompleted: number;
  lifetimeTotal: number;
  isLocked: boolean;
  theme: 'riya' | 'ambuj';
};

export function ScoreBadge({
  dailyCompleted,
  dailyTotal,
  lifetimeCompleted,
  lifetimeTotal,
  isLocked,
  theme
}: ScoreBadgeProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const frontText = `Total: ${lifetimeCompleted} / ${lifetimeTotal}`;
  const backText = `Today: ${dailyCompleted} / ${dailyTotal}`;

  const handleToggle = () => {
    if (isLocked) {
      setIsFlipped(!isFlipped);
    }
  };

  const themeClass = theme === 'riya' ? 'bg-[--riya-secondary] text-[--riya-text] border-[--riya-primary]' : 'bg-[--ambuj-secondary] text-[--ambuj-text] border-[--ambuj-primary]';

  return (
    <div className="score-badge-container w-44">
      <div
        className={`score-badge w-full h-full rounded-full font-semibold text-lg border cursor-pointer ${isLocked ? 'cursor-pointer' : 'cursor-default'} ${themeClass} ${isFlipped ? 'is-flipped' : ''}`}
        onClick={handleToggle}
        title={isLocked ? 'Click to toggle score' : ''}
      >
        <div className="score-face score-front">
          <Trophy className="w-5 h-5" />
          <span>{frontText}</span>
        </div>
        <div className="score-face score-back">
          <Trophy className="w-5 h-5" />
          <span>{backText}</span>
        </div>
      </div>
    </div>
  );
}
