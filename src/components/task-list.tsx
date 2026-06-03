
"use client";

import type { Task, CardTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TaskItem } from './task-item';
import { History } from 'lucide-react';


type TaskListProps = {
  tasks: Task[];
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  theme: CardTheme;
  onRestore: () => void;
  canRestore: boolean;
  isCurrentUserCard: boolean;
};

export function TaskList({ tasks, isLocked, onToggle, onUpdate, onDelete, onToggleTimer, theme, onRestore, canRestore, isCurrentUserCard }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-slate-400 dark:text-slate-500 pt-8 flex flex-col items-center justify-center gap-4">
        <span>Add a task to begin!</span>
        {canRestore && !isLocked && isCurrentUserCard && (
          <Button
            variant="outline"
            className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={onRestore}
          >
            <History className="w-4 h-4 mr-2" />
            Restore Previous List
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isLocked={isLocked}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleTimer={onToggleTimer}
          theme={theme}
          isCurrentUserCard={isCurrentUserCard}
        />
      ))}
    </ul>
  );
}
