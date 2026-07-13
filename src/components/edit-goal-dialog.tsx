
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Goal, CardTheme } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface EditGoalDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEditGoal: (updatedGoal: Partial<Goal>) => Promise<void>;
  goal: Goal;
  theme: CardTheme;
}

export function EditGoalDialog({ isOpen, onOpenChange, onEditGoal, goal, theme }: EditGoalDialogProps) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || '');
  const [type, setType] = useState<Goal['type']>(goal.type);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setType(goal.type);
    }
  }, [goal, isOpen]);

  const getButtonThemeClass = (theme: CardTheme) => {
    switch(theme) {
        case 'periwinkle': return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
        case 'cyan': return 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white';
        case 'emerald': return 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white';
        default: return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
    }
  };

  const getFocusRingClass = (theme: CardTheme) => {
    switch(theme) {
        case 'cyan': return 'focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500';
        case 'emerald': return 'focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500';
        default: return 'focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-offset-0 focus-visible:border-violet-500';
    }
  };

  const getSelectItemClass = (theme: CardTheme) => {
    switch(theme) {
        case 'cyan': return 'focus:bg-cyan-100 focus:text-cyan-900 dark:focus:bg-cyan-900/30 dark:focus:text-cyan-100';
        case 'emerald': return 'focus:bg-emerald-100 focus:text-emerald-900 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-100';
        default: return 'focus:bg-violet-100 focus:text-violet-900 dark:focus:bg-violet-900/30 dark:focus:text-violet-100';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !type) return;
    setIsSaving(true);
    await onEditGoal({ title, description, type });
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>Update your goal details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Run a marathon"
              className={getFocusRingClass(theme)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details about your goal..."
              className={getFocusRingClass(theme)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Goal Type</Label>
            <Select onValueChange={(value: Goal['type']) => setType(value)} defaultValue={type}>
                <SelectTrigger id="type" className={getFocusRingClass(theme)}>
                    <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="short-term" className={getSelectItemClass(theme)}>Short Term</SelectItem>
                    <SelectItem value="long-term" className={getSelectItemClass(theme)}>Long Term</SelectItem>
                    <SelectItem value="bucket-list" className={getSelectItemClass(theme)}>Bucket List</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSaving} className={getButtonThemeClass(theme)}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
