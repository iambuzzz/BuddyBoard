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
type CategoryFilter = 'deep-work' | 'self-growth' | 'life-break';

interface StatsContainerProps {
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

const CATEGORY_FILTER_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: '🔨 Work', value: 'deep-work' },
  { label: '💪 Self Growth', value: 'self-growth' },
  { label: '☕ Life-Break', value: 'life-break' },
];

const getCategoryLabel = (filter: CategoryFilter) => {
  switch (filter) {
    case 'deep-work': return 'Work Hours';
    case 'self-growth': return 'Self Growth Hours';
    case 'life-break': return 'Break Hours';
  }
};

const CustomTooltip = ({ active, payload, label, categoryLabel }: any) => {
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
        {categoryLabel && <p className='text-xs text-muted-foreground mt-0.5'>{categoryLabel}</p>}
      </div>
    );
  }
  return null;
};


export function StatsContainer({ userId }: StatsContainerProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isStateLoading, setIsStateLoading] = useState(true);

  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [viewRange, setViewRange] = useState<ViewRange>('7D');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('deep-work');
  const [sliderRange, setSliderRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  useEffect(() => {
    if (!firestore || !userId) {
      setIsProfileLoading(false);
      setIsStateLoading(false);
      return;
    }

    const unsubProfile = onSnapshot(doc(firestore, 'users', userId), (docSnap) => {
      setUserProfile(docSnap.exists() ? docSnap.data() as UserProfile : null);
      setIsProfileLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
      setIsProfileLoading(false);
    });

    const unsubTasks = onSnapshot(doc(firestore, 'task_lists', userId), (docSnap) => {
      setUserState(docSnap.exists() ? docSnap.data() as UserState : null);
      setIsStateLoading(false);
    }, (error) => {
      console.error("Error fetching task list:", error);
      setUserState(null);
      setIsStateLoading(false);
    });

    return () => {
      unsubProfile();
      unsubTasks();
    };
  }, [firestore, userId]);

  useEffect(() => {
    setSliderRange(null);
  }, [viewRange, categoryFilter]);

  // Extract the hours value based on current category filter
  const getHoursForFilter = (stat: DailyStat, filter: CategoryFilter): number => {
    switch (filter) {
      case 'deep-work':
        return stat.hours || 0;
      case 'self-growth':
        return stat.selfGrowthHours || 0;
      case 'life-break':
        return stat.lifeBreakHours || 0;
    }
  };

  const allTimeStats = useMemo(() => {
    const historicalStats = userState?.historical_stats || [];
    if (historicalStats.length === 0) return [];

    const sortedStats = [...historicalStats].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const statsMap = new Map(sortedStats.map(stat => [stat.date, stat]));

    const firstDate = parseISO(sortedStats[0].date);
    const yesterday = startOfDay(subDays(new Date(), 1));
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const filledStats: DailyStat[] = [];

    // Only process past dates if the user's history starts before today.
    if (firstDate <= yesterday) {
      let currentDate = new Date(firstDate);
      while (currentDate <= yesterday) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        const existingStat = statsMap.get(dateKey);
        filledStats.push(existingStat || {
          date: dateKey,
          hours: 0,
          selfGrowthHours: 0,
          lifeBreakHours: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Always add today's stat if it exists in the map (i.e., list was finished today).
    if (statsMap.has(todayStr)) {
      filledStats.push(statsMap.get(todayStr)!);
    }

    return filledStats;
  }, [userState?.historical_stats]);

  const { filteredData, yAxisMax, viewRangeAvg } = useMemo(() => {
    const now = new Date();
    if (!allTimeStats.length) {
      return { filteredData: [], yAxisMax: 1, viewRangeAvg: 0 };
    }

    let data;
    switch (viewRange) {
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

    // Map data to use filtered category hours
    const mappedData = data.map(stat => ({
      ...stat,
      displayHours: getHoursForFilter(stat, categoryFilter),
    }));

    const totalHours = mappedData.reduce((sum, stat) => sum + stat.displayHours, 0);
    const avg = mappedData.length > 0 ? totalHours / mappedData.length : 0;

    const calculatedMax = mappedData.length > 0 ? Math.max(...mappedData.map(d => d.displayHours)) : 0;
    const yAxisDomainMax = Math.ceil(Math.max(calculatedMax, avg, 1));

    return { filteredData: mappedData, yAxisMax: yAxisDomainMax, viewRangeAvg: avg };

  }, [allTimeStats, viewRange, categoryFilter]);

  const formattedData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      hours: d.displayHours,
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

    const total = rangeData.reduce((s, d) => s + d.displayHours, 0);
    return rangeData.length ? total / rangeData.length : null;
  }, [sliderRange, filteredData]);

  const yAxisTicks = useMemo(() => {
    if (yAxisMax < 1) return [0, 1];
    return Array.from({ length: yAxisMax + 1 }, (_, i) => i);
  }, [yAxisMax]);

  const themeStyle = useMemo(() => {
    if (!userProfile?.cardTheme) {
      return { '--primary': 'var(--theme-periwinkle-primary)', '--accent': 'var(--theme-periwinkle-secondary)' } as React.CSSProperties;
    }

    switch (userProfile.cardTheme) {
      case 'periwinkle':
        return { '--primary': 'var(--theme-periwinkle-primary)', '--accent': 'var(--theme-periwinkle-secondary)' } as React.CSSProperties;
      case 'cyan':
        return { '--primary': 'var(--theme-cyan-primary)', '--accent': 'var(--theme-cyan-secondary)' } as React.CSSProperties;
      case 'emerald':
        return { '--primary': 'var(--theme-emerald-primary)', '--accent': 'var(--theme-emerald-secondary)' } as React.CSSProperties;
      default:
        return { '--primary': 'var(--theme-periwinkle-primary)', '--accent': 'var(--theme-periwinkle-secondary)' } as React.CSSProperties;
    }
  }, [userProfile?.cardTheme]);

  const isLoading = isProfileLoading || isStateLoading;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--app-bg)]">
        <Loader2 className="h-12 w-12 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    );
  }

  if (!userProfile || !userState) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--app-bg)] p-4">
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
        stroke="#047857"
        className="glowing-line"
        label={({ viewBox }) => {
          if (!viewBox || avgToShow <= 0) return <g />;
          const { y } = viewBox;
          return (
            <text
              x={viewBox.x + 4}
              y={y}
              dy={-6}
              fill="#34d399"
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

    const categoryLabel = getCategoryLabel(categoryFilter);

    const chart = (chartType === 'line') ?
      (
        <AreaChart
          data={formattedData}
          margin={{ top: 30, right: 20, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--primary)"
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor="var(--primary)"
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
            cursor={{ stroke: 'var(--primary)', strokeWidth: 2, opacity: 0.5 }}
            content={<CustomTooltip categoryLabel={categoryLabel} />}
          />
          <Area
            type="monotone"
            dataKey="hours"
            name={categoryLabel}
            stroke="var(--primary)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorHours)"
          />
          {avgToShow > 0 && referenceLine}
          <Brush
            dataKey="label"
            height={30}
            stroke="var(--primary)"
            travellerWidth={15}
            fill="transparent"
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
          margin={{ top: 30, right: 20, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorHoursBar" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--primary)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--primary)"
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
            cursor={{ fill: 'var(--primary)', opacity: 0.15 }}
            content={<CustomTooltip categoryLabel={categoryLabel} />}
          />
          <Bar
            dataKey="hours"
            fill="url(#colorHoursBar)"
            name={categoryLabel}
            radius={[4, 4, 0, 0]}
          />
          {avgToShow > 0 && referenceLine}
          <Brush
            dataKey="label"
            height={30}
            stroke="var(--primary)"
            travellerWidth={15}
            fill="transparent"
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

  const viewRangeButtons: { label: string, value: ViewRange }[] = [
    { label: "7D", value: "7D" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "YTD", value: "YTD" },
    { label: "All", value: "ALL" },
  ]

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--app-bg)] p-2 sm:p-4" style={themeStyle}>
      <div className="mx-auto flex w-full max-w-6xl flex-grow flex-col">
        <div className="flex flex-grow flex-col py-2">
          <Card className="flex w-full flex-grow flex-col">
            <CardHeader className="p-4 pt-6 pb-0 pl-2 sm:p-6 sm:pl-4 sm:pb-0">
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
              <div className="mb-0 flex flex-col items-center gap-2">
                <ToggleGroup
                  type="single"
                  defaultValue={chartType}
                  aria-label="Chart Type"
                  onValueChange={(value: 'bar' | 'line') => value && setChartType(value)}
                  className='rounded-md border bg-background dark:bg-white/[0.04] dark:border-white/[0.06]'
                >
                  <ToggleGroupItem value="bar" aria-label="Bar chart">
                    <BarChart2 className="h-5 w-5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line chart">
                    <LineChartIcon className="h-5 w-5" />
                  </ToggleGroupItem>
                </ToggleGroup>
                {/* Category Filter */}
                <ToggleGroup
                  type="single"
                  defaultValue={categoryFilter}
                  aria-label="Category Filter"
                  onValueChange={(value: CategoryFilter) => value && setCategoryFilter(value)}
                  className='flex-wrap justify-center rounded-md border bg-background dark:bg-white/[0.04] dark:border-white/[0.06]'
                >
                  {CATEGORY_FILTER_OPTIONS.map(item => (
                    <ToggleGroupItem key={item.value} value={item.value} aria-label={item.label} className="h-9 px-2 text-xs sm:px-3 sm:text-sm">
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {/* View Range */}
                <ToggleGroup
                  type="single"
                  defaultValue={viewRange}
                  aria-label="View Range"
                  onValueChange={(value: ViewRange) => value && setViewRange(value)}
                  className='flex-wrap justify-center rounded-md border bg-background dark:bg-white/[0.04] dark:border-white/[0.06]'
                >
                  {viewRangeButtons.map(item => (
                    <ToggleGroupItem key={item.value} value={item.value} aria-label={item.label} className="h-9 px-2 text-xs sm:px-3 sm:text-sm">
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
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  <span>{getCategoryLabel(categoryFilter)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
