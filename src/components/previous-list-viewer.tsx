
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { PreviousTask } from '@/lib/types';

interface PreviousListViewerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  previousTasks: PreviousTask[];
  userName?: string;
}

export function PreviousListViewer({
  isOpen,
  onOpenChange,
  previousTasks,
  userName = 'My',
}: PreviousListViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{userName}'s Previous List</DialogTitle>
          <DialogDescription>
            This is a read-only view of the last completed list.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 pr-4">
          <ul className="space-y-2 py-2">
            {previousTasks.map((task, index) => (
              <li
                key={index}
                className="text-sm p-3 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {task.text}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DialogClose asChild>
          <Button variant="outline" className="mt-4 w-full">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
