
'use client';

import { useState } from 'react';
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

interface AddGoalDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddGoal: (newGoal: Omit<Goal, 'id' | 'createdAt' | 'startDate' | 'status'>) => Promise<void>;
  theme: CardTheme;
}

export function AddGoalDialog({ isOpen, onOpenChange, onAddGoal, theme }: AddGoalDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Goal['type']>('short-term');
  const [isSaving, setIsSaving] = useState(false);

  const getButtonThemeClass = (theme: CardTheme) => {
    switch(theme) {
        case 'periwinkle': return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
        case 'cyan': return 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white';
        case 'emerald': return 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white';
        default: return 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !type) return;
    setIsSaving(true);
    await onAddGoal({ title, description, type });
    setIsSaving(false);
    onOpenChange(false);
    // Reset form
    setTitle('');
    setDescription('');
    setType('short-term');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Set a New Goal</DialogTitle>
          <DialogDescription>What new heights do you want to reach?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Run a marathon"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details about your goal..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Goal Type</Label>
            <Select onValueChange={(value: Goal['type']) => setType(value)} defaultValue={type}>
                <SelectTrigger id="type">
                    <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="short-term">Short Term</SelectItem>
                    <SelectItem value="long-term">Long Term</SelectItem>
                    <SelectItem value="bucket-list">Bucket List</SelectItem>
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
            Add Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
