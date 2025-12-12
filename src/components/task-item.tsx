"use client";

import { useState, useRef, useEffect } from 'react';
import { Circle, CheckCircle2, Edit, Trash2, Play, Pause, Timer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Task } from '@/lib/types';

type TaskItemProps = {
  task: Task;
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  theme: 'riya' | 'naitik' | 'ambuj' | 'default';
  isCurrentUserCard: boolean;
};

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const TaskTimer = ({ task, onToggleTimer, theme, isLocked, isCurrentUserCard }: { task: Task; onToggleTimer: () => void; theme: 'riya' | 'naitik' | 'ambuj' | 'default', isLocked: boolean, isCurrentUserCard: boolean }) => {
  const [displayTime, setDisplayTime] = useState(task.timeSpent);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (task.timerState === 'running') {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - (task.timerStartedAt || now)) / 1000;
        setDisplayTime(task.timeSpent + elapsed);
      }, 1000);
    } else {
      setDisplayTime(task.timeSpent);
    }
    return () => clearInterval(interval);
  }, [task.timerState, task.timeSpent, task.timerStartedAt]);

  const timerColor = task.timerState === 'running' ? (
    theme === 'riya' ? 'text-violet-500' :
    theme === 'naitik' ? 'text-cyan-500' :
    'text-emerald-500'
  ) : 'text-slate-400';

  const timerButtonHover = 
    theme === 'riya' ? 'hover:text-violet-600' :
    theme === 'naitik' ? 'hover:text-cyan-600' :
    'hover:text-emerald-600';

  if (task.isCompleted) {
    if (task.timeSpent > 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium sm:mr-2">
          <Timer className="h-4 w-4" />
          <span>{formatTime(task.timeSpent)}</span>
          <div className="flex items-center justify-center h-8 w-8">
            <Check className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
      );
    }
    return (
       <div className="flex items-center justify-center h-8 w-8 sm:mr-2">
          <Check className="h-4 w-4 text-emerald-500" />
       </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-sm sm:mr-2", timerColor)}>
       <Timer className="h-4 w-4" />
       <span>{formatTime(displayTime)}</span>
       {isLocked && isCurrentUserCard && (
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${timerColor} ${timerButtonHover}`} onClick={onToggleTimer}>
          {task.timerState === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
       )}
    </div>
  );
};


export function TaskItem({ task, isLocked, onToggle, onUpdate, onDelete, onToggleTimer, theme, isCurrentUserCard }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const editBtnHoverClass = theme === 'riya' ? 'hover:text-[--riya-text]' 
    : theme === 'naitik' ? 'hover:text-[--naitik-text]'
    : 'hover:text-[--ambuj-text]';

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newText = text.trim();
    if (newText === '') {
      onDelete(task.id);
    } else if (newText !== task.text) {
      onUpdate(task.id, newText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setText(task.text);
      setIsEditing(false);
    }
  };

  const canToggle = isLocked && isCurrentUserCard;

  return (
    <li
      className={`task-item flex items-center p-2.5 rounded-lg bg-slate-50 transition-colors ${
        task.isCompleted ? 'completed' : 'hover:bg-slate-100'
      }`}
    >
      <div
        className={`mr-3 flex-shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => canToggle && onToggle(task.id)}
      >
        {task.isCompleted ? (
          <CheckCircle2 className="text-emerald-500" />
        ) : (
          <Circle className="text-slate-400" />
        )}
      </div>

      <div className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-white border border-slate-300 rounded px-2 py-1 text-base min-w-0"
          />
        ) : (
          <>
            <span className="task-text break-all py-1 sm:self-center">{task.text}</span>
            <div className="flex items-center justify-end sm:justify-start flex-shrink-0">
              <TaskTimer task={task} onToggleTimer={() => onToggleTimer(task.id)} theme={theme} isLocked={isLocked} isCurrentUserCard={isCurrentUserCard}/>
              {!isLocked && isCurrentUserCard && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 text-slate-400 ${editBtnHoverClass}`}
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
