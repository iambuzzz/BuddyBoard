
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { format, subDays, startOfDay, parseISO, startOfYear, subMonths } from 'date-fns';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { UserProfile, UserState, DailyStat, CardTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ViewRange = '7D' | '1M' | '3M' | 'YTD' | 'ALL';


const formatYAxis = (value: number) => {
    if (value === 0) return '0m';
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    if (hours > 0 && hours === value) {
        return `${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h`;
    }
    return `${minutes}m`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const hours = Math.floor(value);
      const minutes = Math.floor((value - hours) * 60);
      const parts = [];
      if (hours > 0) parts.push(`${hours} hrs`);
      if (minutes > 0) parts.push(`${minutes} min`);
      if (parts.length === 0) return '0 min';
      const formattedValue = parts.join(' ');
      
      return (
        <div className="bg-background border border-border shadow-lg rounded-lg p-2 px-3 text-sm">
          <p className="font-bold mb-1">{label}</p>
          <p className='font-semibold text-foreground'>{formattedValue}</p>
        </div>
      );
    }
    return null;
  };


export default function StatsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [viewRange, setViewRange] = useState<ViewRange>('7D');

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

  const { filteredData, brushDomain, yAxisMax } = useMemo(() => {
    const now = new Date();
    if (!allTimeStats.length) {
      return { filteredData: [], brushDomain: undefined, yAxisMax: 1 };
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
    
    const calculatedMax = data.length > 0 ? Math.max(...data.map(d => d.hours)) : 0;
    const yAxisDomainMax = Math.ceil(Math.max(calculatedMax, 1)); 

    return { filteredData: data, brushDomain: domain, yAxisMax: yAxisDomainMax };

  }, [allTimeStats, viewRange]);

  const yAxisTicks = useMemo(() => {
    if (yAxisMax < 1) return [0, 1];
    return Array.from({ length: yAxisMax + 1 }, (_, i) => i);
  }, [yAxisMax]);

  const themeStyle = useMemo(() => {
    const defaultStyles = {
        '--primary': '256 92% 76%',
        '--accent': '256 92% 96%',
    };

    if (!userProfile?.cardTheme) return defaultStyles as React.CSSProperties;

    switch (userProfile.cardTheme) {
        case 'periwinkle':
            return {
                '--primary': '256 92% 76%',
                '--accent': '256 92% 96%',
            } as React.CSSProperties;
        case 'cyan':
            return {
                '--primary': '187 85% 53%',
                '--accent': '187 85% 96%',
            } as React.CSSProperties;
        case 'emerald':
            return {
                '--primary': '158 64% 52%',
                '--accent': '158 64% 96%',
            } as React.CSSProperties;
        default:
            return defaultStyles as React.CSSProperties;
    }
  }, [userProfile?.cardTheme]);

  const renderChart = () => {
    if (filteredData.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-slate-500">
          No study data recorded for this period.
        </div>
      );
    }

    const formattedData = filteredData.map((d) => ({
      ...d,
      date: format(parseISO(d.date), 'MMM d'),
    }));

    const chart = (chartType === 'line') ? 
    (
        <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
        >
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={50}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxis}
              domain={[0, yAxisMax]}
              ticks={yAxisTicks}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'hsl(var(--primary))' }}
              content={<CustomTooltip />}
            />
            <Area
              type="monotone"
              dataKey="hours"
              name="Study Hours"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorHours)"
            />
            {filteredData.length > 30 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="hsl(var(--primary))"
                startIndex={brushDomain ? brushDomain[0] : undefined}
                endIndex={brushDomain ? brushDomain[1] : undefined}
              />
            )}
        </AreaChart>
    ) : (
        <BarChart
          data={formattedData}
          margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
        >
            <defs>
              <linearGradient id="colorHoursBar" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={50}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxis}
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: 'hsl(var(--accent))' }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey="hours"
            fill="url(#colorHoursBar)"
            name="Study Hours"
            radius={[4, 4, 0, 0]}
          />
          {filteredData.length > 30 && (
            <Brush
              dataKey="date"
              height={30}
              stroke="hsl(var(--primary))"
              startIndex={brushDomain ? brushDomain[0] : undefined}
              endIndex={brushDomain ? brushDomain[1] : undefined}
            />
          )}
        </BarChart>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            {chart}
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
    <div className="h-screen w-full flex flex-col bg-[#e3eeff] p-2 sm:p-4" style={themeStyle}>
        <div className="w-full max-w-6xl mx-auto flex flex-col flex-grow">
            <div className='flex-shrink-0'>
                <Button variant="ghost" onClick={() => router.back()} className="">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>
            <div className="py-2 flex flex-col flex-grow">
                <Card className="w-full flex flex-col flex-grow">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6 pb-0">
                        <div>
                            <CardTitle className="text-2xl sm:text-3xl">
                                {userProfile ? `${userProfile.displayName}'s Stats` : 'User Stats'}
                            </CardTitle>
                            <CardDescription>Study time analysis.</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <ToggleGroup 
                                type="single" 
                                defaultValue={chartType}
                                aria-label="Chart Type"
                                onValueChange={(value: 'bar' | 'line') => value && setChartType(value)}
                                className='bg-background border rounded-md'
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
                    <CardContent className="p-4 sm:p-6 pt-4 flex flex-col flex-grow">
                        <div className="flex justify-center mb-2">
                            <ToggleGroup 
                                type="single" 
                                defaultValue={viewRange}
                                aria-label="View Range"
                                onValueChange={(value: ViewRange) => value && setViewRange(value)}
                                className='bg-background border rounded-md'
                            >
                                {viewRangeButtons.map(item => (
                                    <ToggleGroupItem key={item.value} value={item.value} aria-label={item.label} className="px-3">
                                        {item.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                        <div className="flex-grow min-h-0">
                            {renderChart()}
                        </div>
                        <div className="flex w-full items-center justify-center pt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span
                                    className="h-3 w-3 rounded-sm"
                                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                                />
                                <span>Study Hours</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}
