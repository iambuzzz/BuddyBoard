
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Lock, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { User } from '@/lib/types';
import { useTaskStore } from '@/hooks/use-task-store';

import { TaskList } from './task-list';
import { ScoreBadge } from './score-badge';
import { CelebrationOverlay } from './celebration-overlay';
import { StreakBadge } from './streak-badge';

type TaskCardProps = {
  user: User;
};

export function TaskCard({ user }: TaskCardProps) {
  const {
    state,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    toggleTimer,
    handleActionButton,
    startNewList,
    restorePreviousList,
  } = useTaskStore();

  const [showLockWarning, setShowLockWarning] = useState(false);
  const [taskToAdd, setTaskToAdd] = useState('');
  const [undoState, setUndoState] = useState<{
    active: boolean;
    countdown: number;
  }>({ active: false, countdown: 5 });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const triggerUndo = () => {
    if (undoState.active) {
      handleCancelUndo();
      return;
    }

    if (!state[user].isLocked && state[user].tasks.length === 0) {
      handleActionButton(user); // Directly call to show the toast
      return;
    }

    setUndoState({ active: true, countdown: 5 });

    timerRef.current = setInterval(() => {
      setUndoState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(timerRef.current!);
          handleActionButton(user);
          return { active: false, countdown: 5 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const handleCancelUndo = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setUndoState({ active: false, countdown: 5 });
  };


  const userData = state[user];
  const userName = user.charAt(0).toUpperCase() + user.slice(1);
  const themeClass = `theme-${user}`;

  const handleConfirmAddTask = () => {
    if (taskToAdd) {
      addTask(user, taskToAdd);
      setTaskToAdd('');
    }
    setShowLockWarning(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('task-input') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    if (userData.isLocked) {
      setTaskToAdd(text);
      setShowLockWarning(true);
      input.value = '';
    } else {
      addTask(user, text);
      input.value = '';
    }
  };

  const getActionButtonText = () => {
    if (undoState.active) {
      return `Undo (${undoState.countdown})`;
    }
    if (userData.isFinished) return 'Start New List';
    if (userData.isLocked) return 'Finish List';
    return 'Lock-In Tasks';
  };
  
  const getActionButtonIcon = () => {
    if (undoState.active) {
      return <RotateCcw className="w-4 h-4 mr-2 animate-spin" />;
    }
    if (userData.isFinished) return <Plus className="w-4 h-4 mr-2" />;
    if (userData.isLocked) return <Check className="w-4 h-4 mr-2" />;
    return <Lock className="w-4 h-4 mr-2" />;
  }

  const cardBorderStyle = `border-2 ${
    user === 'riya' ? 'border-[--riya-primary]' 
    : user === 'naitik' ? 'border-[--naitik-primary]' 
    : 'border-[--ambuj-primary]'
  }`;
  const glowClass = userData.isLocked ? 
    (user === 'riya' ? 'card-glow-riya' 
    : user === 'naitik' ? 'card-glow-naitik' 
    : 'card-glow-ambuj') : '';


  const addBtnStyle = user === 'riya' ? 'bg-[--riya-primary] hover:bg-violet-500' 
    : user === 'naitik' ? 'bg-[--naitik-primary] hover:bg-cyan-500' 
    : 'bg-[--ambuj-primary] hover:bg-emerald-500';

  const actionBtnStyle = undoState.active && user === 'riya' ? 'bg-violet-400 hover:bg-violet-500'
    : undoState.active && user === 'naitik' ? 'bg-cyan-400 hover:bg-cyan-500'
    : undoState.active && user === 'ambuj' ? 'bg-emerald-400 hover:bg-emerald-500'
    : user === 'riya' ? 'bg-[--riya-primary] hover:bg-violet-500' 
    : user === 'naitik' ? 'bg-[--naitik-primary] hover:bg-cyan-500' 
    : 'bg-[--ambuj-primary] hover:bg-emerald-500';


  const ringStyle = user === 'riya' ? 'focus-visible:ring-[--riya-primary]' 
    : user === 'naitik' ? 'focus-visible:ring-[--naitik-primary]' 
    : 'focus-visible:ring-[--ambuj-primary]';
  const titleColor = user === 'riya' ? 'text-[--riya-text]' 
    : user === 'naitik' ? 'text-[--naitik-text]' 
    : 'text-[--ambuj-text]';
    
  const confirmButtonStyle = user === 'riya' ? 'bg-violet-600 hover:bg-violet-700'
    : user === 'naitik' ? 'bg-cyan-600 hover:bg-cyan-700'
    : 'bg-emerald-600 hover:bg-emerald-700';


  return (
    <Card className={`relative flex flex-col w-full h-full shadow-2xl bg-card pl-6 pb-6 pr-6 pt-3 ${themeClass} ${cardBorderStyle} ${glowClass}`}>
      <div className="flex justify-between items-center pb-4 mb-4 border-b flex-shrink-0 pt-2">
        <div className="flex items-center gap-1 pr-2">
          <h2 className={`text-xl sm:text-2xl font-bold ${titleColor}`}>{userName}</h2>
          <StreakBadge
            currentStreak={userData.currentStreak}
            maxStreak={userData.maxStreak}
            theme={user}
          />
        </div>
        <ScoreBadge
          dailyCompleted={userData.tasks.filter(t => t.isCompleted).length}
          dailyTotal={userData.tasks.length}
          lifetimeCompleted={userData.totalCompleted}
          lifetimeTotal={userData.totalAssigned}
          isLocked={userData.isLocked || userData.isFinished}
          theme={user}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 flex-shrink-0">
        <Input
          type="text"
          name="task-input"
          placeholder="Add Task.."
          className={`bg-white/80 border-slate-300 transition focus:border-transparent ${ringStyle}`}
          disabled={userData.isFinished}
        />
        <Button
          type="submit"
          className={`text-white font-bold p-3 rounded-lg shadow-md transition transform hover:scale-105 ${addBtnStyle}`}
          disabled={userData.isFinished}
          aria-label="Add task"
        >
          <Plus />
        </Button>
      </form>

      <div className="flex-grow min-h-0">
        <ScrollArea className="h-full task-list-container" style={{ scrollbarGutter: 'stable', touchAction: 'pan-y' }}>
          <TaskList
            tasks={userData.tasks}
            isLocked={userData.isLocked || userData.isFinished}
            onToggle={(taskId) => toggleTask(user, taskId)}
            onToggleTimer={(taskId) => toggleTimer(user, taskId)}
            onUpdate={(taskId, newText) => updateTask(user, taskId, newText)}
            onDelete={(taskId) => deleteTask(user, taskId)}
            theme={user}
            onRestore={() => restorePreviousList(user)}
            canRestore={!!userData.previousTasks && userData.previousTasks.length > 0}
          />
        </ScrollArea>
      </div>
      
      <div className="flex flex-col gap-2 mt-6 flex-shrink-0">
         <Button
            onClick={undoState.active ? handleCancelUndo : triggerUndo}
            className={`w-full font-semibold transition py-3 text-base h-auto text-white ${actionBtnStyle} ${ringStyle}`}
          >
            {getActionButtonIcon()}
            {getActionButtonText()}
          </Button>
      </div>

      <AnimatePresence>
        {userData.isFinished && (
          <CelebrationOverlay
            completed={userData.tasks.filter(t => t.isCompleted).length}
            total={userData.tasks.length}
            totalTimeSpent={userData.tasks.reduce((acc, task) => acc + task.timeSpent, 0)}
            onNewList={() => startNewList(user)}
            onRestorePrevious={() => restorePreviousList(user)}
            canRestore={!!userData.previousTasks && userData.previousTasks.length > 0}
            theme={user}
          />
        )}
      </AnimatePresence>

      <AlertDialog open={showLockWarning} onOpenChange={setShowLockWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center">
                <AlertTriangle className="text-amber-500 h-8 w-8 mb-2" />
            </div>
            <AlertDialogTitle>
              Add to a Locked List?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are adding a task to a list that is already locked. This new task will also be locked immediately and cannot be edited or deleted. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full border-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddTask} className={`${confirmButtonStyle} w-full`}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}

  