
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

import type { UserState, Task, PreviousTask, UserProfile, CardTheme } from '@/lib/types';
import { useFirestore, useUser as useAuthUser } from '@/firebase'; // Renamed to avoid conflict
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { TaskList } from './task-list';
import { ScoreBadge } from './score-badge';
import { CelebrationOverlay } from './celebration-overlay';
import { StreakBadge } from './streak-badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type TaskCardProps = {
  userState: UserState;
  userProfile: UserProfile | null;
  userId: string;
};

// Helper function to get theme classes
const getThemeClass = (theme: CardTheme | undefined) => {
  switch (theme) {
    case 'periwinkle':
      return 'theme-periwinkle';
    case 'cyan':
      return 'theme-cyan';
    case 'emerald':
      return 'theme-emerald';
    default:
      return 'theme-periwinkle'; // Default theme
  }
};

const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
};

export function TaskCard({ userState, userProfile, userId }: TaskCardProps) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser(); // Current authenticated user
  const { toast } = useToast();

  const [taskToAdd, setTaskToAdd] = useState('');
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [undoState, setUndoState] = useState<{ active: boolean; countdown: number }>({ active: false, countdown: 5 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const userName = userProfile?.displayName || 'My';
  const isCurrentUserCard = authUser?.uid === userId;
  
  const cardTheme = userProfile?.cardTheme as CardTheme || 'periwinkle';
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

  const cardBorderStyle =
    cardTheme === 'periwinkle' ? 'border-2 border-[--theme-periwinkle-primary]' :
    cardTheme === 'cyan' ? 'border-2 border-[--theme-cyan-primary]' :
    'border-2 border-[--theme-emerald-primary]';

  const glowClass =
    userState.isLocked ? (
      cardTheme === 'periwinkle' ? 'card-glow-periwinkle' :
      cardTheme === 'cyan' ? 'card-glow-cyan' :
      'card-glow-emerald'
    ) : '';

  const addBtnStyle =
    cardTheme === 'periwinkle' ? 'bg-[--theme-periwinkle-primary] hover:bg-purple-500' :
    cardTheme === 'cyan' ? 'bg-[--theme-cyan-primary] hover:bg-cyan-500' :
    'bg-[--theme-emerald-primary] hover:bg-emerald-500';

  const actionBtnStyle = undoState.active ? 'bg-emerald-400 hover:bg-emerald-500' :
    cardTheme === 'periwinkle' ? 'bg-[--theme-periwinkle-primary] hover:bg-purple-500' :
    cardTheme === 'cyan' ? 'bg-[--theme-cyan-primary] hover:bg-cyan-500' :
    'bg-[--theme-emerald-primary] hover:bg-emerald-500';

  const ringStyle =
    cardTheme === 'periwinkle' ? 'focus-visible:ring-[--theme-periwinkle-primary]' :
    cardTheme === 'cyan' ? 'focus-visible:ring-[--theme-cyan-primary]' :
    'focus-visible:ring-[--theme-emerald-primary]';
  
  const titleColor =
    cardTheme === 'periwinkle' ? 'text-[--theme-periwinkle-text]' :
    cardTheme === 'cyan' ? 'text-[--theme-cyan-text]' :
    'text-[--theme-emerald-text]';

  const confirmButtonStyle = 
    cardTheme === 'periwinkle' ? 'bg-purple-600 hover:bg-purple-700' :
    cardTheme === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-700' :
    'bg-emerald-600 hover:bg-emerald-700';
    
  const effectiveTheme = cardTheme;

  const avatarBorderStyle =
    cardTheme === 'periwinkle' ? 'border-[--theme-periwinkle-text]' :
    cardTheme === 'cyan' ? 'border-[--theme-cyan-text]' :
    'border-[--theme-emerald-text]';


  return (
    <Card className={`relative flex flex-col w-full h-full shadow-2xl bg-card pt-4 px-6 pb-6 ${themeClass} ${cardBorderStyle} ${glowClass}`}>
      <AnimatePresence>
        {userState.isFinished && (
          <CelebrationOverlay
            completed={userState.tasks.filter(t => t.isCompleted).length}
            total={userState.tasks.length}
            totalTimeSpent={userState.tasks.reduce((acc, task) => acc + (task.timeSpent || 0), 0)}
            onNewList={startNewList}
            onRestorePrevious={restorePreviousList}
            canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
            theme={effectiveTheme}
          />
        )}
      </AnimatePresence>
      <header className="flex justify-between items-center pb-4 mb-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className={`h-8 w-8 border ${avatarBorderStyle}`}>
            <AvatarImage src={userProfile?.photoURL} alt={userName} />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1">
            <h2 className={`text-xl sm:text-2xl font-bold ${titleColor}`}>{userName}</h2>
            <div className="h-7 w-12">
                <StreakBadge
                    currentStreak={userState.currentStreak}
                    maxStreak={userState.maxStreak}
                    theme={effectiveTheme}
                />
            </div>
          </div>
        </div>
        <div className="score-badge-container">
          <ScoreBadge
            dailyCompleted={userState.tasks.filter(t => t.isCompleted).length}
            dailyTotal={userState.tasks.length}
            lifetimeCompleted={userState.totalCompleted}
            lifetimeTotal={userState.totalAssigned}
            isLocked={userState.isLocked || userState.isFinished}
            theme={effectiveTheme}
          />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 flex-shrink-0">
        <Input
          type="text"
          name="task-input"
          placeholder={isCurrentUserCard ? "Add a task..." : `This is ${userName}'s list`}
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
      <ScrollArea className="h-full task-list-container -mr-2 pr-2" style={{ scrollbarGutter: 'stable', touchAction: 'pan-y' }}>
          <TaskList
            tasks={userState.tasks}
            isLocked={userState.isLocked || userState.isFinished}
            onToggle={toggleTask}
            onToggleTimer={toggleTimer}
            onUpdate={updateTask}
            onDelete={deleteTask}
            theme={effectiveTheme}
            onRestore={restorePreviousList}
            canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
            isCurrentUserCard={isCurrentUserCard}
          />
        </ScrollArea>
      </div>
      
      <div className="flex flex-col gap-2 mt-6 flex-shrink-0">
         <Button
            onClick={isCurrentUserCard ? (undoState.active ? handleCancelUndo : triggerUndo) : undefined}
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
