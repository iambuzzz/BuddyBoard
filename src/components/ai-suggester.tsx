"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, Lightbulb } from 'lucide-react';
import type { Task } from '@/lib/types';
import { suggestNextTask, SuggestNextTaskOutput } from '@/ai/flows/suggest-next-task';
import { useToast } from '@/hooks/use-toast';

type AISuggesterProps = {
  tasks: Task[];
  theme: 'riya' | 'ambuj';
};

export function AISuggester({ tasks, theme }: AISuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestNextTaskOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestion = async () => {
    setIsLoading(true);
    setSuggestion(null);

    if (tasks.length === 0) {
      toast({
        title: 'No tasks to prioritize',
        description: 'Please add some tasks to your list first.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const formattedTasks = tasks.map((task) => ({
        task: task.text,
        effort: 5, // Default value
        importance: 8, // Default value
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
      }));
      const result = await suggestNextTask({ tasks: formattedTasks });
      setSuggestion(result);
    } catch (error) {
      console.error('AI suggestion failed:', error);
      toast({
        title: 'Suggestion Failed',
        description: 'Could not get a suggestion from the AI.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = theme === 'riya' ? 'bg-[--riya-secondary] text-[--riya-text]' : 'bg-[--ambuj-secondary] text-[--ambuj-text]';
  const ringStyle = theme === 'riya' ? 'focus-visible:ring-[--riya-primary]' : 'focus-visible:ring-[--ambuj-primary]';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`font-semibold hover:opacity-90 transition ${buttonStyle} ${ringStyle}`}>
          <Wand2 className="mr-2 h-4 w-4" />
          AI Suggestion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Task Suggester</DialogTitle>
          <DialogDescription>
            Let AI help you decide what to work on next.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {suggestion ? (
            <Alert className={theme === 'riya' ? 'border-purple-200' : 'border-cyan-200'}>
              <Lightbulb className={`h-4 w-4 ${theme === 'riya' ? 'text-[--riya-text]' : 'text-[--ambuj-text]'}`} />
              <AlertTitle className={`font-bold ${theme === 'riya' ? 'text-[--riya-text]' : 'text-[--ambuj-text]'}`}>
                Focus on: {suggestion.nextTask}
              </AlertTitle>
              <AlertDescription>
                <strong>Reasoning:</strong> {suggestion.reasoning}
              </AlertDescription>
            </Alert>
          ) : (
             <div className="text-center text-muted-foreground">
              Click the button below to get a task suggestion.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSuggestion} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Thinking...' : 'Suggest Next Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
