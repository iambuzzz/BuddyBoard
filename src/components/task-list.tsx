
"use client";

import { useState, useEffect } from 'react';
import type { Task, CardTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TaskItem } from './task-item';
import { History } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';


type TaskListProps = {
  tasks: Task[];
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onUpdateTime: (id: string, newTimeSeconds: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  theme: CardTheme;
  onRestore: () => void;
  canRestore: boolean;
  isCurrentUserCard: boolean;
};

export function TaskList({ tasks, isLocked, onToggle, onUpdate, onDelete, onToggleTimer, onUpdateTime, onReorder, theme, onRestore, canRestore, isCurrentUserCard }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  if (localTasks.length === 0) {
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    // Optimistic UI update to prevent drag-drop flicker
    const newTasks = Array.from(localTasks);
    const [removed] = newTasks.splice(result.source.index, 1);
    newTasks.splice(result.destination.index, 0, removed);
    setLocalTasks(newTasks);

    if (onReorder) {
      onReorder(result.source.index, result.destination.index);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="task-list-droppable" isDropDisabled={isLocked || !isCurrentUserCard}>
        {(provided) => (
          <ul
            className="space-y-2"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {localTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                index={index}
                task={task}
                isLocked={isLocked}
                onToggle={onToggle}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleTimer={onToggleTimer}
                onUpdateTime={onUpdateTime}
                theme={theme}
                isCurrentUserCard={isCurrentUserCard}
              />
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
