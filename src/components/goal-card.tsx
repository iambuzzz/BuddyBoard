
'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Target, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Goal } from '@/lib/types';
import { format } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
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

  const cardVariants = {
    initial: {
        background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)))',
        borderColor: 'hsl(var(--border))'
    },
    achieved: {
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
        borderColor: 'hsl(var(--primary) / 0.5)'
    },
  };

  return (
    <motion.div
        initial="initial"
        animate={isAchieved ? 'achieved' : 'initial'}
        variants={cardVariants}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="rounded-xl border shadow-sm h-full"
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
                                className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary"
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
                    {isAchieved && goal.achievedDate && <p className="text-primary font-medium">Achieved: {format((goal.achievedDate as any).toDate ? (goal.achievedDate as any).toDate() : new Date(goal.achievedDate), 'MMM d, yyyy')}</p>}
                </div>
                {!isAchieved && (
                    <Button onClick={handleAchieve} disabled={isUpdating} size="sm" className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 hover:border-slate-300">
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Achieved
                    </Button>
                )}
            </CardFooter>
        </Card>
    </motion.div>
  );
}
