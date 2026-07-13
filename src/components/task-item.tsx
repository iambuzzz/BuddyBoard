"use client";

import { useState, useRef, useEffect } from 'react';
import { Circle, CheckCircle2, Edit, Trash2, Play, Pause, Timer, Check, Dumbbell, Coffee, Hammer, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeEditPicker } from './time-edit-picker';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

import type { Task, CardTheme, TaskCategory } from '@/lib/types';

type TaskItemProps = {
  task: Task;
  index: number;
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onUpdateTime: (id: string, newTimeSeconds: number) => void;
  theme: CardTheme;
  isCurrentUserCard: boolean;
};

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getCategoryIcon = (category: TaskCategory | undefined) => {
  switch (category) {
    case 'self-growth':
      return <Dumbbell className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />;
    case 'life-break':
      return <Coffee className="h-3.5 w-3.5 text-red-500 dark:text-red-400 flex-shrink-0" />;
    case 'deep-work':
    default:
      return <Hammer className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />;
  }
};



const TaskTimer = ({ task, onToggleTimer, onUpdateTime, theme, isLocked, isCurrentUserCard }: { task: Task; onToggleTimer: () => void; onUpdateTime: (newTimeSeconds: number) => void; theme: CardTheme, isLocked: boolean, isCurrentUserCard: boolean }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const canEditTime = isCurrentUserCard && isLocked && task.timerState !== 'running';

  if (task.isCompleted) {
    return (
      <>
        {showTimePicker && (
          <TimeEditPicker
            currentTimeSeconds={task.timeSpent}
            onSave={(newTime) => { onUpdateTime(newTime); setShowTimePicker(false); }}
            onCancel={() => setShowTimePicker(false)}
            theme={theme}
            taskName={task.text}
          />
        )}
        <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium sm:mr-2">
          <Timer
            className={cn("h-4 w-4", canEditTime ? 'cursor-pointer' : '')}
            onClick={() => canEditTime && setShowTimePicker(true)}
          />
          <span
            className={canEditTime ? 'cursor-pointer hover:underline decoration-dotted underline-offset-2' : ''}
            onClick={() => canEditTime && setShowTimePicker(true)}
          >{formatTime(task.timeSpent)}</span>
          <div className="flex items-center justify-center h-8 w-8">
            <Check className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
      </>
    );
  }

  const timerButtonCommon = "transition-all duration-200";
  const timerColor = task.timerState === 'running' ? (
    theme === 'periwinkle' ? `text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 hover:text-violet-600` :
      theme === 'cyan' ? `text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-600` :
        `text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-600`
  ) : (
    theme === 'periwinkle' ? `text-slate-400 dark:text-slate-500 hover:text-violet-600 hover:bg-violet-500/10` :
      theme === 'cyan' ? `text-slate-400 dark:text-slate-500 hover:text-cyan-600 hover:bg-cyan-500/10` :
        `text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-500/10`
  );

  return (
    <>
      {showTimePicker && (
        <TimeEditPicker
          currentTimeSeconds={task.timeSpent}
          onSave={(newTime) => { onUpdateTime(newTime); setShowTimePicker(false); }}
          onCancel={() => setShowTimePicker(false)}
          theme={theme}
          taskName={task.text}
        />
      )}
      <div className={cn("flex items-center gap-1 text-sm sm:mr-2", task.timerState === 'running' ? (
        theme === 'periwinkle' ? 'text-violet-500' : theme === 'cyan' ? 'text-cyan-500' : 'text-emerald-500'
      ) : 'text-slate-400 dark:text-slate-500')}>
        <Timer
          className={cn("h-4 w-4", canEditTime ? 'cursor-pointer' : '')}
          onClick={() => canEditTime && setShowTimePicker(true)}
        />
        <span
          className={canEditTime ? 'cursor-pointer hover:underline decoration-dotted underline-offset-2' : ''}
          onClick={() => canEditTime && setShowTimePicker(true)}
        >{formatTime(displayTime)}</span>
        {isLocked && isCurrentUserCard && (
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${timerColor} ${timerButtonCommon}`} onClick={onToggleTimer}>
            {task.timerState === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </>
  );
};


export function TaskItem({ task, index, isLocked, onToggle, onUpdate, onDelete, onToggleTimer, onUpdateTime, theme, isCurrentUserCard }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [editCategory, setEditCategory] = useState<TaskCategory>(task.category || 'deep-work');
  const inputRef = useRef<HTMLInputElement>(null);

  const category: TaskCategory = task.category || 'deep-work';
  const categoryIcon = getCategoryIcon(category);

  const editBtnHoverClass = theme === 'periwinkle' ? 'hover:text-[--theme-periwinkle-text] hover:bg-violet-500/10'
    : theme === 'cyan' ? 'hover:text-[--theme-cyan-text] hover:bg-cyan-500/10'
      : 'hover:text-[--theme-emerald-text] hover:bg-emerald-500/10';

  const cancelBtnHoverClass = theme === 'periwinkle' ? 'hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-500/20 dark:hover:text-purple-400'
    : theme === 'cyan' ? 'hover:bg-cyan-100 hover:text-cyan-700 dark:hover:bg-cyan-500/20 dark:hover:text-cyan-400'
      : 'hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400';

  const deleteBtnHoverClass = 'hover:text-destructive hover:bg-destructive/10';

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setText(task.text);
    setEditCategory(task.category || 'deep-work');
    setIsEditing(true);
  };

  const handleSave = () => {
    const newText = text.trim();
    if (newText === '') {
      onDelete(task.id);
    } else if (newText !== task.text || editCategory !== task.category) {
      onUpdate(task.id, { text: newText, category: editCategory });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const canToggle = isLocked && isCurrentUserCard;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isLocked || !isCurrentUserCard}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`task-item flex items-center p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] transition-colors ${task.isCompleted ? 'completed' : 'hover:bg-slate-100 dark:hover:bg-white/[0.08]'
            } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[--theme-primary]/30 opacity-100 !bg-white dark:!bg-slate-800 z-50' : ''}`}
        >
          <div
            className={`mr-3 flex-shrink-0 ${canToggle ? 'cursor-pointer' : (!isLocked && isCurrentUserCard ? 'cursor-grab active:cursor-grabbing' : 'cursor-default')}`}
            onClick={() => canToggle && onToggle(task.id)}
            {...(!isLocked && isCurrentUserCard ? provided.dragHandleProps : {})}
          >
            {!isLocked && isCurrentUserCard ? (
              <GripVertical className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
            ) : task.isCompleted ? (
              <CheckCircle2 className="text-emerald-500" />
            ) : (
              <Circle className="text-slate-400 dark:text-slate-500" />
            )}
          </div>

          <div className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between min-w-0">
            {isEditing ? (
              <div className="flex flex-col gap-1.5 w-full min-w-0 py-0.5 ">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded px-2 py-1.5 text-base sm:text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[--theme-primary]"
                />
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-0.5 shrink-0 bg-slate-200/50 dark:bg-black/20 p-0.5 rounded-md">
                    <button type="button" onClick={() => setEditCategory('deep-work')} className={cn("p-1 rounded transition-all", editCategory === 'deep-work' ? "bg-emerald-100 dark:bg-emerald-500/20 ring-1 ring-emerald-500/50 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-800/50 opacity-70 hover:opacity-100")}><Hammer className="h-3.5 w-3.5 text-emerald-500" /></button>
                    <button type="button" onClick={() => setEditCategory('self-growth')} className={cn("p-1 rounded transition-all", editCategory === 'self-growth' ? "bg-blue-100 dark:bg-blue-500/20 ring-1 ring-blue-500/50 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-800/50 opacity-70 hover:opacity-100")}><Dumbbell className="h-3.5 w-3.5 text-blue-500" /></button>
                    <button type="button" onClick={() => setEditCategory('life-break')} className={cn("p-1 rounded transition-all", editCategory === 'life-break' ? "bg-red-100 dark:bg-red-500/20 ring-1 ring-red-500/50 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-800/50 opacity-70 hover:opacity-100")}><Coffee className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className={`h-7 px-1.5 text-xs text-slate-500 transition-colors ${cancelBtnHoverClass}`}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} className={cn("h-7 px-2 text-xs transition-colors", theme === 'periwinkle' ? "bg-[--theme-periwinkle-primary] hover:bg-purple-500 text-white dark:bg-[--theme-periwinkle-secondary] dark:hover:bg-[--theme-periwinkle-secondary] dark:hover:opacity-80" : theme === 'cyan' ? "bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white dark:bg-[--theme-cyan-secondary] dark:hover:bg-[--theme-cyan-secondary] dark:hover:opacity-80" : "bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white dark:bg-[--theme-emerald-secondary] dark:hover:bg-[--theme-emerald-secondary] dark:hover:opacity-80")}>Save</Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={cn("group flex items-center gap-1.5 py-1 sm:self-center min-w-0", isCurrentUserCard ? 'cursor-pointer' : '')}
                  onClick={() => isCurrentUserCard && startEditing()}
                >
                  {categoryIcon}
                  <span className={cn("task-text break-all transition-colors", isCurrentUserCard ? "group-hover:text-slate-600 dark:group-hover:text-slate-300" : "")}>{task.text}</span>
                  {isCurrentUserCard && (
                    <Edit className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity shrink-0 ml-1" />
                  )}
                </div>
                <div className="flex items-center justify-end sm:justify-start flex-shrink-0">
                  <TaskTimer task={task} onToggleTimer={() => onToggleTimer(task.id)} onUpdateTime={(newTime) => onUpdateTime(task.id, newTime)} theme={theme} isLocked={isLocked} isCurrentUserCard={isCurrentUserCard} />
                  {!isLocked && isCurrentUserCard && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 text-slate-400 dark:text-slate-500 ${deleteBtnHoverClass}`}
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </li>
      )}
    </Draggable>
  );
}
