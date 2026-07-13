'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, PartyPopper, Loader2, RotateCcw, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EditGoalDialog } from '@/components/edit-goal-dialog';
import { cn } from '@/lib/utils';
import type { Goal, CardTheme } from '@/lib/types';
import { format } from 'date-fns';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GoalCardProps {
  goal: Goal;
  theme: CardTheme;
}

export function GoalCard({ goal, theme }: GoalCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAchieved, setIsAchieved] = useState(goal.status === 'achieved');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const confirmAchieve = async () => {
    if (!user || !firestore || isAchieved) return;

    setIsUpdating(true);
    const goalRef = doc(firestore, `user_goals/${user.uid}/goals/${goal.id}`);
    try {
      await updateDoc(goalRef, {
        status: 'achieved',
        achievedDate: serverTimestamp(),
      });
      setIsAchieved(true);
    } catch (error) {
      console.error("Error achieving goal:", error);
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
    }
  };

  const handleUnachieve = async () => {
    if (!user || !firestore || !isAchieved || isUpdating) return;

    setIsUpdating(true);
    const goalRef = doc(firestore, `user_goals/${user.uid}/goals/${goal.id}`);
    try {
      await updateDoc(goalRef, {
        status: 'active',
        achievedDate: null,
      });
      setIsAchieved(false);
    } catch (error) {
      console.error("Error un-achieving goal:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  const handleDeleteGoal = async () => {
    if (!user || !firestore) return;

    setIsUpdating(true);
    const goalRef = doc(firestore, `user_goals/${user.uid}/goals/${goal.id}`);
    try {
      await deleteDoc(goalRef);
    } catch (error) {
      console.error("Error deleting goal:", error);
      setIsUpdating(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditGoal = async (updatedFields: Partial<Goal>) => {
    if (!user || !firestore) return;

    const goalRef = doc(firestore, `user_goals/${user.uid}/goals/${goal.id}`);
    try {
      await updateDoc(goalRef, {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const themeStyles = {
    periwinkle: {
      card: 'bg-gradient-to-br from-violet-100 to-fuchsia-100 border-violet-300 shadow-lg shadow-violet-500/20 dark:from-violet-500/10 dark:to-fuchsia-500/10 dark:border-violet-500/30 dark:shadow-violet-500/10',
      iconBg: 'bg-violet-200 dark:bg-violet-500/20',
      iconText: 'text-violet-600 dark:text-violet-300',
    },
    cyan: {
      card: 'bg-gradient-to-br from-cyan-100 to-sky-100 border-cyan-300 shadow-lg shadow-cyan-500/20 dark:from-cyan-500/10 dark:to-sky-500/10 dark:border-cyan-500/30 dark:shadow-cyan-500/10',
      iconBg: 'bg-cyan-200 dark:bg-cyan-500/20',
      iconText: 'text-cyan-600 dark:text-cyan-300',
    },
    emerald: {
      card: 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-300 shadow-lg shadow-emerald-500/20 dark:from-emerald-500/10 dark:to-green-500/10 dark:border-emerald-500/30 dark:shadow-emerald-500/10',
      iconBg: 'bg-emerald-200 dark:bg-emerald-500/20',
      iconText: 'text-emerald-600 dark:text-emerald-300',
    }
  };

  const achievedThemeStyles = {
    periwinkle: {
      card: 'bg-gradient-to-br from-violet-200 to-fuchsia-200 border-violet-400 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:border-violet-400/50',
      glow: 'card-glow-periwinkle',
      iconBg: 'bg-violet-300 dark:bg-violet-500/30',
      iconText: 'text-violet-700 dark:text-violet-200',
      achievedText: 'text-violet-900 font-bold dark:text-violet-300',
    },
    cyan: {
      card: 'bg-gradient-to-br from-cyan-200 to-sky-200 border-cyan-400 dark:from-cyan-500/20 dark:to-sky-500/20 dark:border-cyan-400/50',
      glow: 'card-glow-cyan',
      iconBg: 'bg-cyan-300 dark:bg-cyan-500/30',
      iconText: 'text-cyan-700 dark:text-cyan-200',
      achievedText: 'text-cyan-900 font-bold dark:text-cyan-300',
    },
    emerald: {
      card: 'bg-gradient-to-br from-emerald-200 to-green-200 border-emerald-400 dark:from-emerald-500/20 dark:to-green-500/20 dark:border-emerald-400/50',
      glow: 'card-glow-emerald',
      iconBg: 'bg-emerald-300 dark:bg-emerald-500/30',
      iconText: 'text-emerald-700 dark:text-emerald-200',
      achievedText: 'text-emerald-900 font-bold dark:text-emerald-300',
    }
  };

  const currentThemeStyle = themeStyles[theme] || themeStyles.periwinkle;
  const currentAchievedStyle = achievedThemeStyles[theme] || achievedThemeStyles.periwinkle;

  const getEditBtnClass = (theme: CardTheme) => {
    switch (theme) {
        case 'cyan': return 'hover:bg-cyan-100 hover:text-cyan-700 dark:hover:bg-cyan-500/20 dark:hover:text-cyan-400';
        case 'emerald': return 'hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400';
        default: return 'hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-purple-500/20 dark:hover:text-purple-400';
    }
  };

  return (
    <>
      <EditGoalDialog
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEditGoal={handleEditGoal}
        goal={goal}
        theme={theme}
      />
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Achieved?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this goal as achieved? This can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAchieve} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the goal "{goal.title}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} disabled={isUpdating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          "rounded-xl border shadow-sm h-full transition-all duration-800 ease-in-out",
          isAchieved ? `${currentAchievedStyle.card} ${currentAchievedStyle.glow}` : currentThemeStyle.card
        )}
      >
        <Card className="bg-transparent border-0 shadow-none h-full flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-white/90 pr-2">{goal.title}</CardTitle>

              <div className="flex items-center flex-shrink-0 -mr-2">
                {!isAchieved && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEditDialog(true)}
                      disabled={isUpdating}
                      className={`h-8 w-8 text-slate-400 dark:text-white/40 transition-colors ${getEditBtnClass(theme)}`}
                      aria-label="Edit goal"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isUpdating}
                      className="h-8 w-8 text-slate-400 dark:text-white/40 hover:text-destructive"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <AnimatePresence>
                  {isAchieved && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            onClick={handleUnachieve}
                            disabled={isUpdating}
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 45 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className={cn(
                              "group relative flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                              currentAchievedStyle.iconBg,
                              currentAchievedStyle.iconText
                            )}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <PartyPopper className="h-5 w-5 transition-transform duration-300 group-hover:scale-0" />
                                <RotateCcw className="h-5 w-5 absolute transition-transform duration-300 scale-0 group-hover:scale-100" />
                              </>
                            )}
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to mark as active again</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {goal.description && <CardDescription className="pt-2">{goal.description}</CardDescription>}
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter className="flex justify-between items-end">
            <div className="text-xs text-slate-500 dark:text-white/40">
              <p>Set: {format(new Date(goal.startDate), 'MMM d, yyyy')}</p>
              {isAchieved && goal.achievedDate && <p className={cn(currentAchievedStyle.achievedText)}>Achieved: {format((goal.achievedDate as any).toDate ? (goal.achievedDate as any).toDate() : new Date(goal.achievedDate), 'MMM d, yyyy')}</p>}
            </div>

            {isAchieved && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isUpdating}
                className="h-8 w-8 text-slate-500 dark:text-white/40 hover:text-destructive"
                aria-label="Delete goal"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!isAchieved && (
              <Button onClick={() => setShowConfirmDialog(true)} disabled={isUpdating} size="sm" className="rounded-full bg-white/50 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200/50 dark:border-white/10 hover:border-slate-300 ml-2">
                {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Check className="h-4 w-4 mr-1" />
                Mark as Achieved
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
