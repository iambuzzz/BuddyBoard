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
  const [width, setWidth] = useState(150);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const frontText = `Total: ${lifetimeCompleted} / ${lifetimeTotal}`;
  const backText = `Today: ${dailyCompleted} / ${dailyTotal}`;

  useEffect(() => {
    const frontWidth = frontRef.current?.offsetWidth || 0;
    const backWidth = backRef.current?.offsetWidth || 0;
    setWidth(Math.max(frontWidth, backWidth, 120) + 40);
  }, [frontText, backText]);

  const handleToggle = () => {
    if (isLocked) {
      setIsFlipped(!isFlipped);
    }
  };

  const themeClass = theme === 'riya' ? 'bg-[--riya-secondary] text-[--riya-text] border-[--riya-primary]' : 'bg-[--ambuj-secondary] text-[--ambuj-text] border-[--ambuj-primary]';

  return (
    <div className="score-badge-container" style={{width: `${width}px`}}>
      <div
        className={`score-badge w-full h-full rounded-full font-semibold text-lg border cursor-pointer ${isLocked ? 'cursor-pointer' : 'cursor-default'} ${themeClass} ${isFlipped ? 'is-flipped' : ''}`}
        onClick={handleToggle}
        title={isLocked ? 'Click to toggle score' : ''}
      >
        <div className="score-face score-front" ref={frontRef}>
          <Trophy className="w-5 h-5" />
          <span>{frontText}</span>
        </div>
        <div className="score-face score-back" ref={backRef}>
          <Trophy className="w-5 h-5" />
          <span>{backText}</span>
        </div>
      </div>
    </div>
  );
}
