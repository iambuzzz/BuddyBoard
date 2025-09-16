"use client";

import { useState, useRef, useEffect } from 'react';
import { Circle, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { Task } from '@/lib/types';

type TaskItemProps = {
  task: Task;
  isLocked: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  theme: 'riya' | 'ambuj';
};

export function TaskItem({ task, isLocked, onToggle, onUpdate, onDelete, theme }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const editBtnHoverClass = theme === 'riya' ? 'hover:text-[--riya-text]' : 'hover:text-[--ambuj-text]';

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

  return (
    <li
      className={`task-item flex items-center p-3 rounded-lg bg-slate-50 transition-colors ${
        task.isCompleted ? 'completed' : 'hover:bg-slate-100'
      }`}
    >
      <div
        className={`mr-3 ${isLocked ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => isLocked && onToggle(task.id)}
      >
        {task.isCompleted ? (
          <CheckCircle2 className="text-emerald-500" />
        ) : (
          <Circle className="text-slate-400" />
        )}
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-grow bg-white border border-slate-300 rounded px-2 py-1 text-base"
        />
      ) : (
        <>
          <span className="task-text flex-grow overflow-hidden text-ellipsis mr-2">
            {task.text}
          </span>
          {!isLocked && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ml-auto text-slate-400 ${editBtnHoverClass}`}
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
        </>
      )}
    </li>
  );
}
