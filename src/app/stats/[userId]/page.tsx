
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, BarChart2, LineChartIcon } from 'lucide-react';
import { UserProfile, UserState, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type DailyStat = {
  date: string; // "MMM d" e.g., "Jul 21"
  hours: number;
};

const processTasksForStats = (tasks: Task[]): DailyStat[] => {
  const thirtyDaysAgo = startOfDay(subDays(new Date(), 29));
  const dailyTotals: { [key: string]: number } = {};

  // Initialize last 30 days
  for (let i = 0; i < 30; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    dailyTotals[date] = 0;
  }

  tasks.forEach((task) => {
    if (task.isCompleted && task.completedAt) {
        const completionDate = new Date(task.completedAt);
        if (completionDate >= thirtyDaysAgo) {
            const dateKey = format(completionDate, 'yyyy-MM-dd');
            if(dailyTotals[dateKey] !== undefined) {
                 dailyTotals[dateKey] += (task.timeSpent || 0) / 3600; // Convert seconds to hours
            }
        }
    }
  });

  return Object.entries(dailyTotals)
    .map(([date, hours]) => ({
      date: format(new Date(date), 'MMM d'),
      hours: parseFloat(hours.toFixed(2)),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


export default function StatsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const firestore = useFirestore();
  const { user: authUser, profile: authProfile } = useUser();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    if (!firestore || !userId) return;

    const fetchProfile = async () => {
        const userDocRef = doc(firestore, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
        }
    };
    
    fetchProfile();
    
    const taskListRef = doc(firestore, 'task_lists', userId);
    const unsubscribe = onSnapshot(taskListRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserState(docSnap.data() as UserState);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching task list:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, userId]);

  const dailyStats = useMemo(() => {
    if (!userState) return [];
    return processTasksForStats(userState.tasks);
  }, [userState]);

  const hasData = dailyStats.some(stat => stat.hours > 0);

  const renderChart = () => {
    if (!hasData) {
        return <div className="flex items-center justify-center h-full text-slate-500">No study data recorded in the last 30 days.</div>
    }

    const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : Line;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={dailyStats} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
             formatter={(value: number) => [`${value.toFixed(2)} hours`, 'Study Time']}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
          <DataComponent dataKey="hours" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" name="Study Hours" />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]"><Loader2 className="h-12 w-12 animate-spin text-slate-500" /></div>;
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#e3eeff] p-4 pb-12">
      <div className="w-full max-w-4xl">
         <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-3xl">
                        {userProfile ? `${userProfile.displayName}'s Stats` : 'User Stats'}
                    </CardTitle>
                    <CardDescription>Study time over the last 30 days.</CardDescription>
                </div>
                 <ToggleGroup 
                    type="single" 
                    defaultValue="bar" 
                    aria-label="Chart Type"
                    onValueChange={(value: 'bar' | 'line') => value && setChartType(value)}
                >
                    <ToggleGroupItem value="bar" aria-label="Bar chart">
                        <BarChart2 className="h-5 w-5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="line" aria-label="Line chart">
                        <LineChartIcon className="h-5 w-5" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </CardHeader>
            <CardContent>
                {renderChart()}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
