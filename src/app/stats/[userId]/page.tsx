
import { adminFirestore } from '@/firebase/admin';
import type { UserProfile, UserState } from '@/lib/types';
import { StatsContainer } from '@/components/stats-container';
import { notFound } from 'next/navigation';

// Revalidate this page every 60 seconds to keep it fresh
export const revalidate = 60;

async function getStatsData(userId: string): Promise<{ userProfile: UserProfile | null; userState: UserState | null }> {
    try {
        // Fetch user profile and task list in parallel for speed
        const userDocPromise = adminFirestore().collection('users').doc(userId).get();
        const taskListDocPromise = adminFirestore().collection('task_lists').doc(userId).get();

        const [userDoc, taskListDoc] = await Promise.all([userDocPromise, taskListDocPromise]);
        
        const userProfile = userDoc.exists ? userDoc.data() as UserProfile : null;
        const userState = taskListDoc.exists ? taskListDoc.data() as UserState : null;

        return { userProfile, userState };
    } catch (error) {
        console.error("Error fetching stats data on server:", error);
        return { userProfile: null, userState: null };
    }
}


export default async function StatsPage({ params }: { params: { userId: string } }) {
    const { userId } = params;
    const { userProfile, userState } = await getStatsData(userId);

    // If user or their data doesn't exist, show a 404 page
    if (!userProfile || !userState) {
        notFound();
    }
    
    // Render the client component with the pre-fetched initial data
    return <StatsContainer initialProfile={userProfile} initialState={userState} userId={userId} />;
}
