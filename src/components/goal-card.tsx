'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, PartyPopper, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  
  const themeStyles = {
    periwinkle: {
        card: 'bg-gradient-to-br from-violet-100 to-fuchsia-100 border-violet-300 shadow-lg shadow-violet-500/20',
        iconBg: 'bg-violet-200',
        iconText: 'text-violet-600',
    },
    cyan: {
        card: 'bg-gradient-to-br from-cyan-100 to-sky-100 border-cyan-300 shadow-lg shadow-cyan-500/20',
        iconBg: 'bg-cyan-200',
        iconText: 'text-cyan-600',
    },
    emerald: {
        card: 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-300 shadow-lg shadow-emerald-500/20',
        iconBg: 'bg-emerald-200',
        iconText: 'text-emerald-600',
    }
  };
  
  const achievedThemeStyles = {
    periwinkle: {
        card: 'bg-gradient-to-br from-violet-200 to-fuchsia-200 border-violet-400',
        iconBg: 'bg-violet-300',
        iconText: 'text-violet-700',
        achievedText: 'text-violet-900 font-bold',
        
    },
    cyan: {
        card: 'bg-gradient-to-br from-cyan-200 to-sky-200 border-cyan-400',
        iconBg: 'bg-cyan-300',
        iconText: 'text-cyan-700',
        achievedText: 'text-cyan-900 font-bold',
        
    },
    emerald: {
        card: 'bg-gradient-to-br from-emerald-200 to-green-200 border-emerald-400',
        iconBg: 'bg-emerald-300',
        iconText: 'text-emerald-700',
        achievedText: 'text-emerald-900 font-bold',
        
    }
  };

  const currentThemeStyle = themeStyles[theme] || themeStyles.periwinkle;
  const currentAchievedStyle = achievedThemeStyles[theme] || achievedThemeStyles.periwinkle;

  return (
    <>
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

      <div
          className={cn(
              "rounded-xl border shadow-sm h-full transition-all duration-300 ease-in-out",
              isAchieved ? `${currentAchievedStyle.card}` : currentThemeStyle.card
          )}
      >
          <Card className="bg-transparent border-0 shadow-none h-full flex flex-col">
              <CardHeader>
                  <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold text-slate-800 pr-2">{goal.title}</CardTitle>
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
                  {goal.description && <CardDescription className="pt-2">{goal.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow" />
              <CardFooter className="flex justify-between items-end">
                  <div className="text-xs text-slate-500">
                      <p>Set: {format(new Date(goal.startDate), 'MMM d, yyyy')}</p>
                      {isAchieved && goal.achievedDate && <p className={cn(currentAchievedStyle.achievedText)}>Achieved: {format((goal.achievedDate as any).toDate ? (goal.achievedDate as any).toDate() : new Date(goal.achievedDate), 'MMM d, yyyy')}</p>}
                  </div>
                  {!isAchieved && (
                      <Button onClick={() => setShowConfirmDialog(true)} disabled={isUpdating} size="sm" className="rounded-full bg-white/50 text-slate-700 hover:bg-white/80 border border-slate-200/50 hover:border-slate-300 ml-2">
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
