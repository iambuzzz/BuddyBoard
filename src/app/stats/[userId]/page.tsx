'use client';

import { StatsContainer } from '@/components/stats-container';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StatsPage() {
    const params = useParams();
    const userId = params.userId as string;

    if (!userId) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[var(--app-bg)]">
                <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
            </div>
        );
    }

    // We no longer pre-fetch data, so we only pass the userId.
    // The StatsContainer component will handle its own data fetching.
    return <StatsContainer userId={userId} />;
}
