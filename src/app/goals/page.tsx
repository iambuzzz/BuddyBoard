
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { Plus, Loader2, ArrowLeft, Goal as GoalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddGoalDialog } from '@/components/add-goal-dialog';
import { GoalCard } from '@/components/goal-card';
import type { Goal } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function GoalsPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }

        const goalsQuery = query(
            collection(firestore, 'user_goals', user.uid, 'goals'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
            const fetchedGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
            setGoals(fetchedGoals);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching goals:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore, isUserLoading]);

    const handleAddGoal = async (newGoal: Omit<Goal, 'id' | 'createdAt' | 'startDate' | 'status'>) => {
        if (!user || !firestore) return;
        
        await addDoc(collection(firestore, 'user_goals', user.uid, 'goals'), {
            ...newGoal,
            status: 'active',
            startDate: Date.now(),
            createdAt: serverTimestamp(),
        });
    };

    const shortTermGoals = goals.filter(g => g.type === 'short-term');
    const longTermGoals = goals.filter(g => g.type === 'long-term');
    const bucketListGoals = goals.filter(g => g.type === 'bucket-list');

    const renderGoalList = (goalList: Goal[], type: Goal['type']) => {
        if (isLoading) {
            return <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
        }
        if (goalList.length === 0) {
            return (
                <div className="text-center py-20 bg-slate-50/50 rounded-xl mt-8">
                    <h3 className="text-lg font-semibold text-slate-700">No {type.replace('-', ' ')} goals yet.</h3>
                    <p className="text-slate-500 mt-1">Ready to set your first one?</p>
                </div>
            );
        }
        return (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goalList.map(goal => <GoalCard key={goal.id} goal={goal} />)}
            </div>
        );
    };

    return (
        <>
            <AddGoalDialog
                isOpen={isDialogOpen}
                onOpenChange={setDialogOpen}
                onAddGoal={handleAddGoal}
            />
            <div className="min-h-screen w-full bg-[#e3eeff] p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="flex items-center justify-between mb-8">
                        <div className='flex items-center gap-2'>
                             <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-slate-600">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <GoalIcon className="h-8 w-8 text-primary" />
                                My Goals
                            </h1>
                        </div>
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full shadow-lg transition transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Set a New Goal
                        </Button>
                    </header>

                    <Tabs defaultValue="short-term" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-200/80 backdrop-blur-sm">
                            <TabsTrigger value="short-term">Short Term</TabsTrigger>
                            <TabsTrigger value="long-term">Long Term</TabsTrigger>
                            <TabsTrigger value="bucket-list">Bucket List</TabsTrigger>
                        </TabsList>
                        <TabsContent value="short-term">
                            {renderGoalList(shortTermGoals, 'short-term')}
                        </TabsContent>
                        <TabsContent value="long-term">
                            {renderGoalList(longTermGoals, 'long-term')}
                        </TabsContent>
                        <TabsContent value="bucket-list">
                            {renderGoalList(bucketListGoals, 'bucket-list')}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
}
