
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  ReferenceLine,
} from 'recharts';
import { format, subDays, startOfDay, parseISO, startOfYear, subMonths } from 'date-fns';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart2, LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { UserProfile, UserState, DailyStat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ViewRange = '7D' | '1M' | '3M' | 'YTD' | 'ALL';

interface StatsContainerProps {
    initialProfile?: UserProfile;
    initialState?: UserState;
    userId: string;
}

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

const formatAverageLabel = (value: number) => {
    if (value === 0) return 'Avg 0m';
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    const parts = [];
    if (hours > 0) parts.push(`${hours}hrs`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return `Avg ${parts.join(' ')}`;
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


export function StatsContainer({ initialProfile, initialState, userId }: StatsContainerProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile || null);
  const [userState, setUserState] = useState<UserState | null>(initialState || null);
  const [isLoading, setIsLoading] = useState(!initialProfile || !initialState);
  
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [viewRange, setViewRange] = useState<ViewRange>('7D');
  const [sliderRange, setSliderRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  useEffect(() => {
    if (!firestore || !userId) return;

    if (!initialProfile || !initialState) {
        setIsLoading(true);
    }

    const unsubProfile = onSnapshot(doc(firestore, 'users', userId), (docSnap) => {
        setUserProfile(docSnap.exists() ? docSnap.data() as UserProfile : null);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
    });
    
    const unsubTasks = onSnapshot(doc(firestore, 'task_lists', userId), (docSnap) => {
      setUserState(docSnap.exists() ? docSnap.data() as UserState : null);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching task list:", error);
        setUserState(null);
        setIsLoading(false);
    });

    return () => {
        unsubProfile();
        unsubTasks();
    };
  }, [firestore, userId, initialProfile, initialState]);
  
  useEffect(() => {
    setSliderRange(null);
  }, [viewRange]);

  const allTimeStats = useMemo(() => {
    if (!userState?.historical_stats) return [];
    
    const sorted = [...userState.historical_stats].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    if (sorted.length === 0) return [];

    const filledStats: DailyStat[] = [];
    let currentDate = parseISO(sorted[0].date);
    const lastDate = new Date();
    
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

  const { filteredData, yAxisMax, viewRangeAvg } = useMemo(() => {
    const now = new Date();
    if (!allTimeStats.length) {
      return { filteredData: [], yAxisMax: 1, viewRangeAvg: 0 };
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
    
    const totalHours = data.reduce((sum, stat) => sum + stat.hours, 0);
    const avg = data.length > 0 ? totalHours / data.length : 0;
    
    const calculatedMax = data.length > 0 ? Math.max(...data.map(d => d.hours)) : 0;
    const yAxisDomainMax = Math.ceil(Math.max(calculatedMax, avg, 1));

    return { filteredData: data, yAxisMax: yAxisDomainMax, viewRangeAvg: avg };

  }, [allTimeStats, viewRange]);

  const formattedData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      label: format(parseISO(d.date), 'MMM d'),
      isoDate: d.date,
    }));
  }, [filteredData]);

  const sliderAvg = useMemo(() => {
    if (!sliderRange) return null;

    const start = parseISO(sliderRange.startDate);
    const end = parseISO(sliderRange.endDate);

    const rangeData = filteredData.filter(d => {
        const date = parseISO(d.date);
        return date >= start && date <= end;
    });

    const total = rangeData.reduce((s, d) => s + d.hours, 0);
    return rangeData.length ? total / rangeData.length : null;
  }, [sliderRange, filteredData]);

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

  if (isLoading) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]">
            <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
        </div>
    );
  }

  if (!userProfile || !userState) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e3eeff] p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>User Not Found</CardTitle>
                    <CardDescription>The requested user does not exist or has no data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.back()} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const renderChart = () => {
    if (filteredData.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-slate-500">
          No study data recorded for this period.
        </div>
      );
    }

    const avgToShow = sliderAvg ?? viewRangeAvg;

    const referenceLine = (
      <ReferenceLine
        y={avgToShow}
        isFront
        strokeWidth={2}
        className="glowing-line"
        label={({ viewBox }) => {
            if (!viewBox || avgToShow <= 0) return null;
            const { y } = viewBox;
            return (
                <text
                    x={viewBox.x}
                    y={y}
                    dy={-6}
                    fill="#047857"
                    fontSize={12}
                    fontWeight="bold"
                    textAnchor="start"
                    style={{ filter: 'none' }}
                >
                    {formatAverageLabel(avgToShow)}
                </text>
            );
        }}
      />
    );


    const chart = (chartType === 'line') ? 
    (
        <AreaChart
            data={formattedData}
            margin={{ top: 30, right: 10, left: -30, bottom: 5 }}
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
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={50}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
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
            {avgToShow > 0 && referenceLine}
            <Brush
              dataKey="label"
              height={30}
              stroke="hsl(var(--primary))"
              travellerWidth={15}
              onChange={(r) => {
                if (r?.startIndex != null && r?.endIndex != null) {
                  const start = formattedData[r.startIndex]?.isoDate;
                  const end = formattedData[r.endIndex]?.isoDate;
                  if (start && end) {
                    setSliderRange({ startDate: start, endDate: end });
                  }
                }
              }}
            />
        </AreaChart>
    ) : (
        <BarChart
          data={formattedData}
          margin={{ top: 30, right: 10, left: -30, bottom: 5 }}
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
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={50}
            interval="preserveStartEnd"
            padding={{ left: 10, right: 10 }}
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
          {avgToShow > 0 && referenceLine}
          <Brush
              dataKey="label"
              height={30}
              stroke="hsl(var(--primary))"
              travellerWidth={15}
              onChange={(r) => {
                if (r?.startIndex != null && r?.endIndex != null) {
                    const start = formattedData[r.startIndex]?.isoDate;
                    const end = formattedData[r.endIndex]?.isoDate;
                    if (start && end) {
                        setSliderRange({ startDate: start, endDate: end });
                    }
                }
              }}
            />
        </BarChart>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            {chart}
        </ResponsiveContainer>
    );
};
  
  const viewRangeButtons: {label: string, value: ViewRange}[] = [
    { label: "7D", value: "7D" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "YTD", value: "YTD" },
    { label: "All", value: "ALL" },
  ]
  
  return (
    <div className="flex h-screen w-full flex-col bg-[#e3eeff] p-2 sm:p-4" style={themeStyle}>
        <div className="mx-auto flex w-full max-w-6xl flex-grow flex-col">
            <div className="flex flex-grow flex-col py-2">
                <Card className="flex w-full flex-grow flex-col">
                    <CardHeader className="pl-2 pr-4 pt-4 pb-2 sm:pr-6 sm:pt-6">
                        <div className="flex w-full items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 flex-shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                                <span className="sr-only">Back</span>
                            </Button>
                            <div className='flex-grow'>
                                <CardTitle className="text-2xl sm:text-3xl">
                                    {userProfile ? `${userProfile.displayName}'s Stats` : 'User Stats'}
                                </CardTitle>
                                <CardDescription>Study time analysis.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-grow flex-col p-4 sm:p-6">
                        <div className="mb-2 flex flex-col items-center gap-2">
                             <ToggleGroup 
                                type="single" 
                                defaultValue={chartType}
                                aria-label="Chart Type"
                                onValueChange={(value: 'bar' | 'line') => value && setChartType(value)}
                                className='rounded-md border bg-background'
                            >
                                <ToggleGroupItem value="bar" aria-label="Bar chart">
                                    <BarChart2 className="h-5 w-5" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="line" aria-label="Line chart">
                                    <LineChartIcon className="h-5 w-5" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <ToggleGroup 
                                type="single" 
                                defaultValue={viewRange}
                                aria-label="View Range"
                                onValueChange={(value: ViewRange) => value && setViewRange(value)}
                                className='flex-wrap justify-center rounded-md border bg-background'
                            >
                                {viewRangeButtons.map(item => (
                                    <ToggleGroupItem key={item.value} value={item.value} aria-label={item.label} className="px-2 text-xs sm:px-3 sm:text-sm">
                                        {item.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                        <div className="min-h-0 flex-grow">
                            {renderChart()}
                        </div>
                        <div className="flex w-full items-center justify-center gap-6 pt-2">
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
