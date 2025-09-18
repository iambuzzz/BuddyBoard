"use client";

import type { Task } from '@/lib/types';
import { TaskItem } from './task-item';

type TaskListProps = {
  tasks: Task[];
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  theme: 'riya' | 'naitik';
};

export function TaskList({ tasks, isLocked, onToggle, onUpdate, onDelete, theme }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-slate-400 p-8">
        Add a task to begin!
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
          theme={theme}
        />
      ))}
    </ul>
  );
}
