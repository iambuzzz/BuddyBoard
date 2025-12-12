"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

import type { UserState, Task, PreviousTask } from '@/lib/types';
import { useFirestore, useUser as useAuthUser } from '@/firebase'; // Renamed to avoid conflict
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { TaskList } from './task-list';
import { ScoreBadge } from './score-badge';
import { CelebrationOverlay } from './celebration-overlay';
import { StreakBadge } from './streak-badge';

type TaskCardProps = {
  userState: UserState;
  userId: string;
};

// Helper function to get theme classes
const getThemeClass = (theme: string | undefined) => {
  switch (theme) {
    case 'riya':
      return 'theme-riya';
    case 'naitik':
      return 'theme-naitik';
    case 'ambuj':
      return 'theme-ambuj';
    default:
      return 'theme-ambuj'; // Default theme
  }
};


export function TaskCard({ userState, userId }: TaskCardProps) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser(); // Current authenticated user
  const { toast } = useToast();

  const [taskToAdd, setTaskToAdd] = useState('');
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [undoState, setUndoState] = useState<{ active: boolean; countdown: number }>({ active: false, countdown: 5 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive user display info from auth if possible, fallback to a default
  const userName = authUser?.displayName || 'My';
  const isCurrentUserCard = authUser?.uid === userId;
  
  // Use a default theme, will be customized later
  const cardTheme = 'default'; 
  const themeClass = getThemeClass(cardTheme);
  
  const updateFirestore = useCallback(async (updatePayload: Partial<UserState>) => {
    if (!firestore || !userId) return;
    const docRef = doc(firestore, 'task_lists', userId);
    try {
      await updateDoc(docRef, updatePayload);
    } catch (error) {
      console.error("Failed to update state to Firestore", error);
      toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  }, [firestore, userId, toast]);

  const addTask = (text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      isCompleted: false,
      createdAt: Date.now(),
      timeSpent: 0,
      timerState: 'stopped',
      timerStartedAt: null,
    };
    const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
    updateFirestore({ tasks: newTasks });
  };
  
  const updateTask = (taskId: string, newText: string) => {
    const newTasks = userState.tasks.map(t => t.id === taskId ? { ...t, text: newText } : t);
    updateFirestore({ tasks: newTasks });
  };
  
  const deleteTask = (taskId: string) => {
    const newTasks = userState.tasks.filter(t => t.id !== taskId);
    updateFirestore({ tasks: newTasks });
  };
  
  const toggleTimer = (taskId: string) => {
      const now = Date.now();
      const newTasks = userState.tasks.map(task => {
        if (task.id === taskId) {
          if (task.timerState === 'running') {
            const elapsed = (now - (task.timerStartedAt || now)) / 1000;
            return { ...task, timerState: 'paused' as 'paused', timeSpent: task.timeSpent + elapsed, timerStartedAt: null };
          } else {
            return { ...task, timerState: 'running' as 'running', timerStartedAt: now };
          }
        }
        return task;
      });
      updateFirestore({ tasks: newTasks });
  };

  const toggleTask = (taskId: string) => {
    if (!userState.isLocked) return;
    const now = Date.now();
    const newTasks = userState.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleting = !t.isCompleted;
        let finalTimeSpent = t.timeSpent;
        let timerState: 'stopped' | 'running' | 'paused' = t.timerState;
        if (isCompleting && t.timerState === 'running') {
          const elapsed = (now - (t.timerStartedAt || now)) / 1000;
          finalTimeSpent += elapsed;
        }
        if (isCompleting) timerState = 'stopped';
        return { ...t, isCompleted: isCompleting, timeSpent: finalTimeSpent, timerState, timerStartedAt: isCompleting ? null : t.timerStartedAt };
      }
      return t;
    });
    updateFirestore({ tasks: newTasks });
  };
  
  const handleActionButton = () => {
    if (!isCurrentUserCard) return;
    const now = Date.now();

    if (!userState.isLocked && userState.tasks.length === 0) {
      toast({ title: 'List is empty', description: 'Add at least one task to lock in your list.', variant: 'destructive' });
      return;
    }

    let newUserData: Partial<UserState>;

    if (userState.isFinished) {
      newUserData = { tasks: [], isLocked: false, isFinished: false, lockedAt: null };
    } else if (userState.isLocked) {
      const completedCount = userState.tasks.filter(t => t.isCompleted).length;
      const totalTasks = userState.tasks.length;
      const allTasksCompleted = totalTasks > 0 && completedCount === totalTasks;
      let newCurrentStreak = userState.currentStreak;
      if (allTasksCompleted) newCurrentStreak++; else newCurrentStreak = 0;
      newUserData = {
        isFinished: true,
        totalCompleted: (userState.totalCompleted ?? 0) + completedCount,
        totalAssigned: (userState.totalAssigned ?? 0) + totalTasks,
        previousTasks: userState.tasks.map(t => ({ text: t.text })),
        currentStreak: newCurrentStreak,
        maxStreak: Math.max(userState.maxStreak, newCurrentStreak),
        lastLockedAt: userState.lockedAt,
      };
    } else {
      let currentStreak = userState.currentStreak;
      if (userState.lastLockedAt) {
        const timeSinceLastLock = now - userState.lastLockedAt;
        const brokeStreak = timeSinceLastLock > 48 * 60 * 60 * 1000;
        if (brokeStreak) currentStreak = 0;
      }
      newUserData = { isLocked: true, lockedAt: now, currentStreak: currentStreak };
    }
    updateFirestore(newUserData);
  };
  
  const startNewList = () => {
    updateFirestore({ tasks: [], isLocked: false, isFinished: false, lockedAt: null });
  };

  const restorePreviousList = () => {
    if (!userState.previousTasks || userState.previousTasks.length === 0) {
      toast({ title: 'No Previous List', description: 'There is no previous list to restore.', variant: 'destructive' });
      return;
    }
    const restoredTasks: Task[] = userState.previousTasks.map((task: PreviousTask) => ({
      id: crypto.randomUUID(),
      text: task.text,
      isCompleted: false,
      createdAt: Date.now(),
      timeSpent: 0,
      timerState: 'stopped',
      timerStartedAt: null,
    }));
    updateFirestore({ tasks: restoredTasks, isLocked: false, isFinished: false, lockedAt: null });
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const triggerUndo = () => {
    if (undoState.active) { handleCancelUndo(); return; }
    if (!userState.isLocked && userState.tasks.length === 0) { handleActionButton(); return; }
    setUndoState({ active: true, countdown: 5 });
    timerRef.current = setInterval(() => {
      setUndoState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(timerRef.current!);
          handleActionButton();
          return { active: false, countdown: 5 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const handleCancelUndo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setUndoState({ active: false, countdown: 5 });
  };

  const handleConfirmAddTask = () => {
    if (taskToAdd) {
      addTask(taskToAdd);
      setTaskToAdd('');
    }
    setShowLockWarning(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCurrentUserCard) return;
    const text = (e.currentTarget.elements.namedItem('task-input') as HTMLInputElement).value.trim();
    if (!text) return;
    if (userState.isLocked) {
      setTaskToAdd(text);
      setShowLockWarning(true);
    } else {
      addTask(text);
    }
    (e.currentTarget.elements.namedItem('task-input') as HTMLInputElement).value = '';
  };
  
  const getActionButtonText = () => {
    if (undoState.active) return `Undo (${undoState.countdown})`;
    if (userState.isFinished) return 'Start New List';
    if (userState.isLocked) return 'Finish List';
    return 'Lock-In Tasks';
  };
  
  const getActionButtonIcon = () => {
    if (undoState.active) return <RotateCcw className="w-4 h-4 mr-2 animate-spin" />;
    if (userState.isFinished) return <Plus className="w-4 h-4 mr-2" />;
    if (userState.isLocked) return <Check className="w-4 h-4 mr-2" />;
    return <Lock className="w-4 h-4 mr-2" />;
  };

  // Generic theme styles for now
  const cardBorderStyle = 'border-2 border-[--ambuj-primary]';
  const glowClass = userState.isLocked ? 'card-glow-ambuj' : '';
  const addBtnStyle = 'bg-[--ambuj-primary] hover:bg-emerald-500';
  const actionBtnStyle = undoState.active ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-[--ambuj-primary] hover:bg-emerald-500';
  const ringStyle = 'focus-visible:ring-[--ambuj-primary]';
  const titleColor = 'text-[--ambuj-text]';
  const confirmButtonStyle = 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <Card className={`relative flex flex-col w-full h-full shadow-2xl bg-card pl-6 pb-6 pr-6 pt-3 ${themeClass} ${cardBorderStyle} ${glowClass}`}>
      <AnimatePresence>
        {userState.isFinished && (
          <CelebrationOverlay
            completed={userState.tasks.filter(t => t.isCompleted).length}
            total={userState.tasks.length}
            totalTimeSpent={userState.tasks.reduce((acc, task) => acc + (task.timeSpent || 0), 0)}
            onNewList={startNewList}
            onRestorePrevious={restorePreviousList}
            canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
            theme={'ambuj'} // Use default theme for now
          />
        )}
      </AnimatePresence>
      <div className="flex justify-between items-center pb-4 mb-4 border-b flex-shrink-0 pt-2">
        <div className="flex items-center gap-1 pr-2">
          <h2 className={`text-xl sm:text-2xl font-bold ${titleColor}`}>{userName}'s Tasks</h2>
          <StreakBadge
            currentStreak={userState.currentStreak}
            maxStreak={userState.maxStreak}
            theme={'ambuj'} // default
          />
        </div>
        <ScoreBadge
          dailyCompleted={userState.tasks.filter(t => t.isCompleted).length}
          dailyTotal={userState.tasks.length}
          lifetimeCompleted={userState.totalCompleted}
          lifetimeTotal={userState.totalAssigned}
          isLocked={userState.isLocked || userState.isFinished}
          theme={'ambuj'} // default
        />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 flex-shrink-0">
        <Input
          type="text"
          name="task-input"
          placeholder={isCurrentUserCard ? "Add Task.." : `This is ${userName}'s list`}
          className={`bg-white/80 border-slate-300 transition focus:border-transparent ${ringStyle}`}
          disabled={userState.isFinished || !isCurrentUserCard}
        />
        <Button
          type="submit"
          className={`text-white font-bold p-3 rounded-lg shadow-md transition transform hover:scale-105 ${addBtnStyle}`}
          disabled={userState.isFinished || !isCurrentUserCard}
          aria-label="Add task"
        >
          <Plus />
        </Button>
      </form>

      <div className="flex-grow min-h-0">
      <ScrollArea className="h-full task-list-container" style={{ scrollbarGutter: 'stable', touchAction: 'pan-y' }}>
          <TaskList
            tasks={userState.tasks}
            isLocked={userState.isLocked || userState.isFinished}
            onToggle={toggleTask}
            onToggleTimer={toggleTimer}
            onUpdate={updateTask}
            onDelete={deleteTask}
            theme={'ambuj'} // default
            onRestore={restorePreviousList}
            canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
            isCurrentUserCard={isCurrentUserCard}
          />
        </ScrollArea>
      </div>
      
      <div className="flex flex-col gap-2 mt-6 flex-shrink-0">
         <Button
            onClick={undoState.active ? handleCancelUndo : triggerUndo}
            className={`w-full font-semibold transition py-3 text-base h-auto text-white ${actionBtnStyle} ${ringStyle}`}
            disabled={!isCurrentUserCard}
          >
            {getActionButtonIcon()}
            {getActionButtonText()}
          </Button>
      </div>

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
