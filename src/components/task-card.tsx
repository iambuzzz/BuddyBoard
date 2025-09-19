"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Lock, Check } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import type { User, UserState } from '@/lib/types';
import { useTaskStore } from '@/hooks/use-task-store';

import { TaskList } from './task-list';
import { ScoreBadge } from './score-badge';
import { CelebrationOverlay } from './celebration-overlay';

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
    handleActionButton,
    startNewList,
    restorePreviousList,
  } = useTaskStore();

  const userData = state[user];
  const userName = user.charAt(0).toUpperCase() + user.slice(1);
  const themeClass = `theme-${user}`;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('task-input') as HTMLInputElement;
    const text = input.value.trim();
    if (text) {
      addTask(user, text);
      input.value = '';
    }
  };

  const getActionButtonText = () => {
    if (userData.isFinished) return 'Start New List';
    if (userData.isLocked) return 'Finish List';
    return 'Lock-In Tasks';
  };
  
  const getActionButtonIcon = () => {
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
  const actionBtnStyle = user === 'riya' ? 'bg-[--riya-primary] hover:bg-violet-500' 
    : user === 'naitik' ? 'bg-[--naitik-primary] hover:bg-cyan-500' 
    : 'bg-[--ambuj-primary] hover:bg-emerald-500';
  const ringStyle = user === 'riya' ? 'focus-visible:ring-[--riya-primary]' 
    : user === 'naitik' ? 'focus-visible:ring-[--naitik-primary]' 
    : 'focus-visible:ring-[--ambuj-primary]';
  const titleColor = user === 'riya' ? 'text-[--riya-text]' 
    : user === 'naitik' ? 'text-[--naitik-text]' 
    : 'text-[--ambuj-text]';


  return (
    <Card className={`relative flex flex-col w-full h-full shadow-2xl bg-white/60 backdrop-blur-lg p-6 ${themeClass} ${cardBorderStyle} ${glowClass}`}>
      <div className="flex justify-between items-center pb-4 mb-4 border-b flex-shrink-0">
        <h2 className={`text-xl sm:text-2xl font-bold pr-2 ${titleColor}`}>{userName}'s List</h2>
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
          disabled={userData.isLocked || userData.isFinished}
        />
        <Button
          type="submit"
          className={`text-white font-bold p-3 rounded-lg shadow-md transition transform hover:scale-105 ${addBtnStyle}`}
          disabled={userData.isLocked || userData.isFinished}
          aria-label="Add task"
        >
          <Plus />
        </Button>
      </form>

      <ScrollArea className="flex-grow min-h-0 pr-2 task-list-container" style={{ scrollbarGutter: 'stable', touchAction: 'pan-y' }}>
        <TaskList
          tasks={userData.tasks}
          isLocked={userData.isLocked || userData.isFinished}
          onToggle={(taskId) => toggleTask(user, taskId)}
          onUpdate={(taskId, newText) => updateTask(user, taskId, newText)}
          onDelete={(taskId) => deleteTask(user, taskId)}
          theme={user}
          onRestore={() => restorePreviousList(user)}
          canRestore={!!userData.previousTasks && userData.previousTasks.length > 0}
        />
      </ScrollArea>
      
      <div className="flex gap-2 mt-6 flex-shrink-0">
         <Button
            onClick={() => handleActionButton(user)}
            className={`w-full font-semibold transition py-3 text-base h-auto ${actionBtnStyle} ${ringStyle}`}
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
            onNewList={() => startNewList(user)}
            onRestorePrevious={() => restorePreviousList(user)}
            canRestore={!!userData.previousTasks && userData.previousTasks.length > 0}
            theme={user}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
