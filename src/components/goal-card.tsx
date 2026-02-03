'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Goal, CardTheme } from '@/lib/types';
import { format } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  theme: CardTheme;
}

export function GoalCard({ goal, theme }: GoalCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAchieved, setIsAchieved] = useState(goal.status === 'achieved');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAchieve = async () => {
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
    }
  };
  
  // Style for ACTIVE goals, based on the user's theme
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
  
  // Specific style for ACHIEVED goals (always green)
  const achievedStyle = {
    card: 'bg-gradient-to-br from-emerald-200 to-green-300 border-emerald-400 shadow-lg shadow-emerald-500/30',
    iconBg: 'bg-emerald-300',
    iconText: 'text-emerald-800',
    achievedText: 'text-emerald-900 font-bold'
  };

  const currentThemeStyle = themeStyles[theme] || themeStyles.periwinkle;

  return (
    <div
        className={cn(
            "rounded-xl border shadow-sm h-full transition-all duration-300 ease-in-out",
            isAchieved ? achievedStyle.card : currentThemeStyle.card
        )}
    >
        <Card className="bg-transparent border-0 shadow-none h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-slate-800">{goal.title}</CardTitle>
                    <AnimatePresence>
                        {isAchieved && (
                             <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 45 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                className={cn("flex items-center justify-center h-8 w-8 rounded-full", achievedStyle.iconBg, achievedStyle.iconText)}
                            >
                                <PartyPopper className="h-5 w-5" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {goal.description && <CardDescription className="pt-2">{goal.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-grow" />
            <CardFooter className="flex justify-between items-end">
                <div className="text-xs text-slate-500">
                    <p>Set: {format(new Date(goal.startDate), 'MMM d, yyyy')}</p>
                    {isAchieved && goal.achievedDate && <p className={cn(achievedStyle.achievedText)}>Achieved: {format((goal.achievedDate as any).toDate ? (goal.achievedDate as any).toDate() : new Date(goal.achievedDate), 'MMM d, yyyy')}</p>}
                </div>
                {!isAchieved && (
                    <Button onClick={handleAchieve} disabled={isUpdating} size="sm" className="rounded-full bg-white/50 text-slate-700 hover:bg-white/80 border border-slate-200/50 hover:border-slate-300">
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Achieved
                    </Button>
                )}
            </CardFooter>
        </Card>
    </div>
  );
}
