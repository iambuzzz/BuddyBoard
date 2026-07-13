
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Lock, Check, AlertTriangle, RotateCcw, History, ChevronDown, Hammer, Dumbbell, Coffee } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { isSameDay, startOfToday, format } from 'date-fns';
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

import type { UserState, Task, PreviousTask, UserProfile, CardTheme, DailyStat, TaskCategory } from '@/lib/types';
import { useFirestore, useUser as useAuthUser } from '@/firebase'; // Renamed to avoid conflict
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { TaskList } from './task-list';
import { ScoreBadge } from './score-badge';
import { CelebrationOverlay } from './celebration-overlay';
import { StreakBadge } from './streak-badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PreviousListViewer } from './previous-list-viewer';

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

const CATEGORY_OPTIONS: { value: TaskCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'deep-work', label: 'Work', icon: <Hammer className="w-4 h-4" />, color: 'text-violet-500 dark:text-violet-400' },
  { value: 'self-growth', label: 'Self Growth', icon: <Dumbbell className="w-4 h-4" />, color: 'text-teal-500 dark:text-teal-400' },
  { value: 'life-break', label: 'Life / Break', icon: <Coffee className="w-4 h-4" />, color: 'text-amber-500 dark:text-amber-400' },
];

// Compute time spent on a task, including running timer
const computeTaskTime = (task: Task): number => {
  let time = task.timeSpent;
  if (task.timerState === 'running' && task.timerStartedAt) {
    time += (Date.now() - task.timerStartedAt) / 1000;
  }
  return time;
};

// Generate a unique ID that works in non-secure contexts (HTTP dev server on mobile)
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
};

export function TaskCard({ userState, userProfile, userId }: TaskCardProps) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser(); // Current authenticated user
  const { toast } = useToast();

  const [taskToAdd, setTaskToAdd] = useState('');
  const [taskCategoryToAdd, setTaskCategoryToAdd] = useState<TaskCategory>('deep-work');
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [undoState, setUndoState] = useState<{ active: boolean; countdown: number }>({ active: false, countdown: 5 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPreviousList, setShowPreviousList] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingTaskText, setPendingTaskText] = useState('');
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  const userName = userProfile?.displayName || 'My';
  const isCurrentUserCard = authUser?.uid === userId;

  const cardTheme = userProfile?.cardTheme ?? 'periwinkle';
  const themeClass = getThemeClass(cardTheme);

  // Close category picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setShowCategoryPicker(false);
      }
    };
    if (showCategoryPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryPicker]);

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


  const addTask = (text: string, category: TaskCategory = 'deep-work') => {
    const newTask: Task = {
      id: generateId(),
      text,
      category,
      isCompleted: false,
      createdAt: Date.now(),
      timeSpent: 0,
      timerState: 'stopped',
      timerStartedAt: null,
    };
    const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
    updateFirestore({ tasks: newTasks });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const newTasks = userState.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    updateFirestore({ tasks: newTasks });
  };

  const deleteTask = (taskId: string) => {
    const newTasks = userState.tasks.filter(t => t.id !== taskId);
    updateFirestore({ tasks: newTasks });
  };

  const updateTaskTime = (taskId: string, newTimeSeconds: number) => {
    const newTasks = userState.tasks.map(t =>
      t.id === taskId ? { ...t, timeSpent: newTimeSeconds } : t
    );
    updateFirestore({ tasks: newTasks });
  };

  const reorderTasks = (startIndex: number, endIndex: number) => {
    const result = Array.from(userState.tasks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    updateFirestore({ tasks: result });
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

        if (t.timerState === 'running') {
          const elapsed = (now - (t.timerStartedAt || now)) / 1000;
          finalTimeSpent += elapsed;
        }

        if (isCompleting) {
          timerState = 'stopped';
        }

        return { ...t, isCompleted: isCompleting, timeSpent: finalTimeSpent, timerState, completedAt: isCompleting ? now : null, timerStartedAt: isCompleting ? null : t.timerStartedAt };
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

    if (userState.isFinished) { // Action: Start New List
      newUserData = { tasks: [], isLocked: false, isFinished: false, lockedAt: null };
    } else if (userState.isLocked) { // Action: Finish List
      const completedCount = userState.tasks.filter(t => t.isCompleted).length;
      const totalTasks = userState.tasks.length;
      const allTasksCompleted = totalTasks > 0 && completedCount === totalTasks;
      let newCurrentStreak = userState.currentStreak;
      if (allTasksCompleted) newCurrentStreak++; else newCurrentStreak = 0;

      // Categorized time calculation
      const deepWorkTime = userState.tasks
        .filter(t => (t.category || 'deep-work') === 'deep-work')
        .reduce((acc, t) => acc + computeTaskTime(t), 0);

      const selfGrowthTime = userState.tasks
        .filter(t => t.category === 'self-growth')
        .reduce((acc, t) => acc + computeTaskTime(t), 0);

      const lifeBreakTime = userState.tasks
        .filter(t => t.category === 'life-break')
        .reduce((acc, t) => acc + computeTaskTime(t), 0);

      const listDate = format(new Date(userState.lockedAt || now), 'yyyy-MM-dd');
      const newStat: DailyStat = {
        date: listDate,
        hours: deepWorkTime / 3600,
        selfGrowthHours: selfGrowthTime / 3600,
        lifeBreakHours: lifeBreakTime / 3600,
      };

      const existingStats = userState.historical_stats || [];
      const dateStatIndex = existingStats.findIndex(s => s.date === listDate);

      let updatedStats;
      if (dateStatIndex > -1) {
        updatedStats = [...existingStats];
        updatedStats[dateStatIndex] = newStat;
      } else {
        updatedStats = [...existingStats, newStat];
      }

      newUserData = {
        isFinished: true,
        totalCompleted: (userState.totalCompleted ?? 0) + completedCount,
        totalAssigned: (userState.totalAssigned ?? 0) + totalTasks,
        previousTasks: userState.tasks.map(t => ({ text: t.text, category: t.category || 'deep-work' })),
        currentStreak: newCurrentStreak,
        maxStreak: Math.max(userState.maxStreak, newCurrentStreak),
        lastLockedAt: userState.lockedAt,
        historical_stats: updatedStats
      };
    } else { // Action: Lock-In List

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
    if (!isCurrentUserCard) return;
    updateFirestore({ tasks: [], isLocked: false, isFinished: false, lockedAt: null });
  };

  const restorePreviousList = () => {
    if (!isCurrentUserCard) return;
    if (!userState.previousTasks || userState.previousTasks.length === 0) {
      toast({ title: 'No Previous List', description: 'There is no previous list to restore.', variant: 'destructive' });
      return;
    }
    const restoredTasks: Task[] = userState.previousTasks.map((task: PreviousTask) => ({
      id: generateId(),
      text: task.text,
      category: task.category || 'deep-work',
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
      addTask(taskToAdd, taskCategoryToAdd);
      setTaskToAdd('');
      setTaskCategoryToAdd('deep-work');
    }
    setShowLockWarning(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCurrentUserCard) return;
    const text = taskInputRef.current?.value.trim() || '';
    if (!text) return;

    if (userState.isLocked && !userState.isFinished) {
      setTaskToAdd(text);
      setTaskCategoryToAdd('deep-work');
      setShowLockWarning(true);
    } else {
      addTask(text, 'deep-work');
    }

    if (taskInputRef.current) taskInputRef.current.value = '';
  };

  const handleCategorySelect = (category: TaskCategory) => {
    if (pendingTaskText) {
      if (userState.isLocked && !userState.isFinished) {
        setTaskToAdd(pendingTaskText);
        setTaskCategoryToAdd(category);
        setShowLockWarning(true);
      } else {
        addTask(pendingTaskText, category);
      }
      if (taskInputRef.current) taskInputRef.current.value = '';
      setPendingTaskText('');
    } else {
      toast({ title: 'No task text', description: 'Type a task first, then pick a category.', variant: 'destructive' });
    }

    setShowCategoryPicker(false);
  };

  const getActionButtonText = () => {
    if (undoState.active) return `Undo (${undoState.countdown})`;
    if (userState.isFinished) return 'Start New List';
    if (userState.isLocked) return 'Finish List';
    return 'Lock-In Tasks';
  };

  const getActionButtonIcon = () => {
    if (undoState.active) return <RotateCcw className="w-4 h-4 mr-2 animate-spin [animation-direction:reverse]" />;
    if (userState.isFinished) return <Plus className="w-4 h-4 mr-2" />;
    if (userState.isLocked) return <Check className="w-4 h-4 mr-2" />;
    return <Lock className="w-4 h-4 mr-2" />;
  };

  const cardBorderStyle =
    cardTheme === 'periwinkle' ? 'border-2 border-[--theme-periwinkle-primary]' :
      cardTheme === 'cyan' ? 'border-2 border-[--theme-cyan-primary]' :
        'border-2 border-[--theme-emerald-primary]';

  let glowClass = '';
  if (userState.isLocked && !userState.isFinished) {
    if (cardTheme === 'periwinkle') {
      glowClass = 'card-glow-periwinkle';
    } else if (cardTheme === 'cyan') {
      glowClass = 'card-glow-cyan';
    } else if (cardTheme === 'emerald') {
      glowClass = 'card-glow-emerald';
    }
  }

  const addBtnStyle =
    cardTheme === 'periwinkle' ? 'bg-[--theme-periwinkle-primary] hover:bg-purple-500' :
      cardTheme === 'cyan' ? 'bg-[--theme-cyan-primary] hover:bg-cyan-500' :
        'bg-[--theme-emerald-primary] hover:bg-emerald-500';

  const getActionBtnStyle = () => {
    const baseStyle =
      cardTheme === 'periwinkle' ? 'bg-[--theme-periwinkle-primary] hover:bg-purple-500 text-white dark:bg-[--theme-periwinkle-secondary] dark:hover:bg-[--theme-periwinkle-secondary] dark:hover:opacity-80' :
        cardTheme === 'cyan' ? 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white dark:bg-[--theme-cyan-secondary] dark:hover:bg-[--theme-cyan-secondary] dark:hover:opacity-80' :
          'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white dark:bg-[--theme-emerald-secondary] dark:hover:bg-[--theme-emerald-secondary] dark:hover:opacity-80';

    if (undoState.active) {
      return `${baseStyle} animate-pulse`;
    }
    return baseStyle;
  };

  const actionBtnStyle = getActionBtnStyle();

  const ringStyle =
    cardTheme === 'periwinkle' ? 'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-violet-500 dark:focus-visible:ring-violet-500' :
      cardTheme === 'cyan' ? 'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-500' :
        'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-500';

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

  // Compute categorized times for celebration overlay
  const deepWorkTimeSpent = userState.tasks
    .filter(t => (t.category || 'deep-work') === 'deep-work')
    .reduce((acc, t) => acc + (t.timeSpent || 0), 0);
  const selfGrowthTimeSpent = userState.tasks
    .filter(t => t.category === 'self-growth')
    .reduce((acc, t) => acc + (t.timeSpent || 0), 0);
  const lifeBreakTimeSpent = userState.tasks
    .filter(t => t.category === 'life-break')
    .reduce((acc, t) => acc + (t.timeSpent || 0), 0);

  return (
    <>
      <PreviousListViewer
        isOpen={showPreviousList}
        onOpenChange={setShowPreviousList}
        previousTasks={userState.previousTasks || []}
        userName={userName}
      />
      <Card className={`relative flex flex-col w-full h-full shadow-2xl bg-card pt-4 px-6 pb-6 rounded-2xl ${themeClass} ${cardBorderStyle} ${glowClass}`}>
        <AnimatePresence>
          {userState.isFinished && (
            <CelebrationOverlay
              completed={userState.tasks.filter(t => t.isCompleted).length}
              total={userState.tasks.length}
              totalTimeSpent={deepWorkTimeSpent}
              selfGrowthTime={selfGrowthTimeSpent}
              lifeBreakTime={lifeBreakTimeSpent}
              onNewList={startNewList}
              onRestorePrevious={restorePreviousList}
              canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
              theme={effectiveTheme}
              isCurrentUserCard={isCurrentUserCard}
            />
          )}
        </AnimatePresence>
        <header className="flex justify-between items-center gap-2 pb-4 mb-4 border-b">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className={`h-9 w-9 border flex-shrink-0 ${avatarBorderStyle}`}>
              <AvatarImage src={userProfile?.photoURL || undefined} alt={userName} />
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <h2 className={`text-xl sm:text-2xl font-bold truncate ${titleColor}`}>{userName}</h2>
              <div className="h-7 w-12 flex-shrink-0">
                <StreakBadge
                  currentStreak={userState.currentStreak}
                  maxStreak={userState.maxStreak}
                  theme={effectiveTheme}
                />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ScoreBadge
              dailyCompleted={userState.tasks.filter(t => t.isCompleted).length}
              dailyTotal={userState.tasks.length}
              theme={effectiveTheme}
            />
          </div>
        </header>

        <div className="flex gap-1.5 sm:gap-2 mb-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 flex-1 min-w-0">
            <Input
              ref={taskInputRef}
              type="text"
              name="task-input"
              autoComplete="off"
              placeholder={isCurrentUserCard ? "Add a task..." : `This is ${userName}'s list`}
              className={`bg-white/80 dark:bg-white/[0.04] border-slate-300 dark:border-white/10 transition focus:border-transparent ${ringStyle}`}
              disabled={userState.isFinished || !isCurrentUserCard}
            />
            <Button
              type="submit"
              className={`text-white font-bold p-2 sm:p-3 rounded-lg shadow-md transition transform hover:scale-105 ${addBtnStyle}`}
              disabled={userState.isFinished || !isCurrentUserCard}
              aria-label="Add work task"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </form>
          <button
            type="button"
            className={`text-white font-bold p-2 sm:p-3 rounded-lg shadow-md transition transform hover:scale-105 inline-flex items-center justify-center ${addBtnStyle} disabled:pointer-events-none disabled:opacity-50`}
            disabled={userState.isFinished || !isCurrentUserCard}
            aria-label="Choose task category"
            onClick={() => {
              const text = taskInputRef.current?.value.trim() || '';
              if (!text) {
                toast({ title: 'No task text', description: 'Type a task first, then pick a category.', variant: 'destructive' });
                return;
              }
              setPendingTaskText(text);
              setShowCategoryPicker(true);
            }}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Full-screen category picker overlay */}
        {showCategoryPicker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
            onClick={() => setShowCategoryPicker(false)}
          >
            <div
              className="category-picker flex flex-col gap-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-2xl p-6 mx-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-center text-slate-700 dark:text-slate-200 mb-2">What type of task?</h3>
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="category-picker-btn flex items-center gap-4 px-5 py-4 rounded-2xl text-left bg-slate-50 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all"
                  onClick={() => handleCategorySelect(opt.value)}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${opt.value === 'deep-work' ? 'bg-violet-100 dark:bg-violet-500/15' : opt.value === 'self-growth' ? 'bg-teal-100 dark:bg-teal-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
                    <span className={opt.color}>{opt.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{opt.label}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {opt.value === 'deep-work' ? 'Study, Office, Coding, etc.' : opt.value === 'self-growth' ? 'Gym, learning, growth' : 'Chores, breaks, reels'}
                    </span>
                  </div>
                </button>
              ))}
              <button
                type="button"
                className="mt-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-2"
                onClick={() => setShowCategoryPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-2">
            <TaskList
              tasks={userState.tasks}
              isLocked={userState.isLocked || userState.isFinished}
              onToggle={toggleTask}
              onToggleTimer={toggleTimer}
              onUpdateTime={updateTaskTime}
              onReorder={reorderTasks}
              onUpdate={updateTask}
              onDelete={deleteTask}
              theme={effectiveTheme}
              onRestore={restorePreviousList}
              canRestore={!!userState.previousTasks && userState.previousTasks.length > 0}
              isCurrentUserCard={isCurrentUserCard}
            />
          </ScrollArea>
        </div>

        <div className="flex items-center gap-2 mt-6 flex-shrink-0">
          <Button
            onClick={isCurrentUserCard ? (undoState.active ? handleCancelUndo : triggerUndo) : undefined}
            className={`w-full font-semibold transition py-3 text-base h-auto ${actionBtnStyle} ${ringStyle}`}
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
              <AlertDialogCancel className="w-full border-slate-300 dark:border-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAddTask} className={`${confirmButtonStyle} w-full`}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </>
  );
}


