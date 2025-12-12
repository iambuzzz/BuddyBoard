
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import type { Group, UserProfile, UserState } from '@/lib/types';

export const useGroupData = (groupId: string | null, currentUserId: string) => {
  const firestore = useFirestore();
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [userState, setUserState] = useState<{ [key: string]: UserState }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Effect to fetch group and its members
  useEffect(() => {
    if (!firestore || !groupId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const groupRef = doc(firestore, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupRef, async (groupSnap) => {
      if (groupSnap.exists()) {
        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
        setGroup(groupData);

        const memberUids = Object.keys(groupData.members);
        if (memberUids.length > 0) {
          const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
          const unsubscribeUsers = onSnapshot(usersQuery, (usersSnap) => {
            const membersData = usersSnap.docs.map(d => d.data() as UserProfile);
            // Sort members to always show the current user first
            membersData.sort((a, b) => {
                if (a.uid === currentUserId) return -1;
                if (b.uid === currentUserId) return 1;
                return a.displayName.localeCompare(b.displayName);
            });
            setGroupMembers(membersData);
          });
          return () => unsubscribeUsers();
        } else {
          setGroupMembers([]);
          setIsLoading(false);
        }
      } else {
        setGroup(null);
        setGroupMembers([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribeGroup();
  }, [firestore, groupId, currentUserId]);

  // Effect to fetch task lists for all members (or just the solo user)
  useEffect(() => {
    if (!firestore) return;

    const uidsToFetch = groupId ? groupMembers.map(m => m.uid) : [currentUserId];

    if (uidsToFetch.length === 0) {
      if(groupId) {
        // Still loading if in a group context but members aren't populated yet.
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
      return;
    }

    const unsubscribers = uidsToFetch.map(uid => {
      const taskListRef = doc(firestore, 'task_lists', uid);
      return onSnapshot(taskListRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserState(prev => ({ ...prev, [uid]: docSnap.data() as UserState }));
        } else {
           // Handle case where task list doesn't exist for a user
           setUserState(prev => ({ ...prev, [uid]: { tasks: [], previousTasks: [], isLocked: false, isFinished: false, totalCompleted: 0, totalAssigned: 0, currentStreak: 0, maxStreak: 0, lockedAt: null, lastLockedAt: null } }));
        }
      });
    });

    // All necessary listeners are set up. Now we can check if we have data for everyone.
    const allDataLoaded = uidsToFetch.every(uid => userState.hasOwnProperty(uid));
    if (allDataLoaded) {
        setIsLoading(false);
    } else {
        // If some data is still missing, we keep it in a loading state.
        // The state will re-render as snapshots arrive, and this effect will be re-evaluated.
        // A more robust solution might wait for all initial snapshots.
        // For now, we set loading to true until we have at least something for everyone.
        const checkLoadingStatus = () => {
          const loadedUIDs = Object.keys(userState);
          const allUIDsPresent = uidsToFetch.every(uid => loadedUIDs.includes(uid));
          setIsLoading(!allUIDsPresent);
        }
        // Give a short moment for snapshots to arrive.
        const loadingTimer = setTimeout(checkLoadingStatus, 1000);
        return () => clearTimeout(loadingTimer);
    }


    return () => unsubscribers.forEach(unsub => unsub());
  // IMPORTANT: Do NOT add `userState` to the dependency array. It will cause an infinite loop.
  }, [firestore, groupMembers, groupId, currentUserId]);

  return { group, groupMembers, userState, isLoading };
};
