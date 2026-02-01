
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
  Brush,
} from 'recharts';
import { format, subDays, startOfDay, parseISO, startOfYear, subMonths } from 'date-fns';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, BarChart2, LineChartIcon } from 'lucide-react';
import { UserProfile, UserState, DailyStat, CardTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ViewRange = '7D' | '1M' | '3M' | 'YTD' | 'ALL';


const formatYAxis = (value: number) => {
    if (value === 0) return '0m';
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    if (hours > 0) {
        return `${hours}h`;
    }
    return `${minutes}m`;
};

const formatTooltip = (value: number) => {
    const hours = Math.floor(value);
    const minutes = Math.floor((value - hours) * 60);
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (parts.length === 0) return '0 minutes';
    return parts.join(' ');
};


export default function StatsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [viewRange, setViewRange] = useState<ViewRange>('1M');

  useEffect(() => {
    if (!firestore || !userId) return;

    const userDocRef = doc(firestore, 'users', userId);
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
        }
    });
    
    const taskListRef = doc(firestore, 'task_lists', userId);
    const unsubTasks = onSnapshot(taskListRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserState(docSnap.data() as UserState);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching task list:", error);
        setIsLoading(false);
    });

    return () => {
        unsubProfile();
        unsubTasks();
    };
  }, [firestore, userId]);

  const allTimeStats = useMemo(() => {
    if (!userState?.historical_stats) return [];
    
    const sorted = [...userState.historical_stats].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    if (sorted.length === 0) return [];

    const filledStats: DailyStat[] = [];
    let currentDate = parseISO(sorted[0].date);
    const lastDate = new Date(); // Go up to today
    
    let statIndex = 0;

    while(currentDate <= lastDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        if(statIndex < sorted.length && sorted[statIndex].date === dateKey) {
            filledStats.push(sorted[statIndex]);
            statIndex++;
        } else {
            filledStats.push({ date: dateKey, hours: 0 });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledStats;

  }, [userState?.historical_stats]);

  const { filteredData, brushDomain } = useMemo(() => {
    const now = new Date();
    if (!allTimeStats.length) {
      return { filteredData: [], brushDomain: undefined };
    }

    let data;
    switch(viewRange) {
        case '7D':
            data = allTimeStats.filter(stat => parseISO(stat.date) >= startOfDay(subDays(now, 6)));
            break;
        case '1M':
            data = allTimeStats.filter(stat => parseISO(stat.date) >= startOfDay(subDays(now, 29)));
            break;
        case '3M':
            data = allTimeStats.filter(stat => parseISO(stat.date) >= startOfDay(subMonths(now, 3)));
            break;
        case 'YTD':
            data = allTimeStats.filter(stat => parseISO(stat.date) >= startOfYear(now));
            break;
        case 'ALL':
        default:
            data = allTimeStats;
            break;
    }
    
    let domain: [number, number] | undefined = undefined;
    if (data.length > 30) {
      domain = [data.length - 30, data.length - 1];
    }
    return { filteredData: data, brushDomain: domain };

  }, [allTimeStats, viewRange]);

  const themeStyle = useMemo(() => {
    if (!userProfile?.cardTheme) return {};

    switch (userProfile.cardTheme) {
      case 'periwinkle':
        // Defaults are already periwinkle-ish in globals.css
        return {};
      case 'cyan':
        return {
          '--primary': '187 85% 53%',
          '--accent': '187 85% 93%',
        } as React.CSSProperties;
      case 'emerald':
        return {
          '--primary': '158 64% 52%',
          '--accent': '158 64% 93%',
        } as React.CSSProperties;
      default:
        return {};
    }
  }, [userProfile?.cardTheme]);


  const renderChart = () => {
    if (filteredData.length === 0) {
        return <div className="flex items-center justify-center h-[400px] text-slate-500">No study data recorded for this period.</div>
    }

    const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : Line;

    const formattedData = filteredData.map(d => ({...d, date: format(parseISO(d.date), 'MMM d')}));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent 
            data={formattedData} 
            margin={{ top: 5, right: 20, left: -10, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={50} interval="preserveStartEnd"/>
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 12 }} 
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatYAxis}
            domain={[0, 'dataMax']}
            />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
             formatter={(value: number) => [formatTooltip(value), 'Study Time']}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
          <DataComponent dataKey="hours" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" name="Study Hours" />
          {filteredData.length > 30 && (
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="hsl(var(--primary))"
              startIndex={brushDomain ? brushDomain[0] : undefined}
              endIndex={brushDomain ? brushDomain[1] : undefined}
              y={330}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]"><Loader2 className="h-12 w-12 animate-spin text-slate-500" /></div>;
  }
  
  const viewRangeButtons: {label: string, value: ViewRange}[] = [
    { label: "7D", value: "7D" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "YTD", value: "YTD" },
    { label: "All", value: "ALL" },
  ]
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#e3eeff] p-4 pb-12" style={themeStyle}>
      <div className="w-full max-w-4xl">
         <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-3xl">
                        {userProfile ? `${userProfile.displayName}'s Stats` : 'User Stats'}
                    </CardTitle>
                    <CardDescription>Study time analysis.</CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                    <ToggleGroup 
                        type="single" 
                        defaultValue="bar" 
                        aria-label="Chart Type"
                        onValueChange={(value: 'bar' | 'line') => value && setChartType(value)}
                        className='bg-white'
                    >
                        <ToggleGroupItem value="bar" aria-label="Bar chart">
                            <BarChart2 className="h-5 w-5" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="line" aria-label="Line chart">
                            <LineChartIcon className="h-5 w-5" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                 </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center mb-4">
                    <ToggleGroup 
                        type="single" 
                        defaultValue={viewRange}
                        aria-label="View Range"
                        onValueChange={(value: ViewRange) => value && setViewRange(value)}
                        className='bg-white'
                    >
                        {viewRangeButtons.map(item => (
                            <ToggleGroupItem key={item.value} value={item.value} aria-label={item.label} className="px-3">
                                {item.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
                {renderChart()}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
