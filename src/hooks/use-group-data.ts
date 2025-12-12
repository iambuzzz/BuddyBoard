
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
        setIsLoading(!groupId); // If in group mode but no members yet, keep loading
        return;
    }

    const unsubscribers = uidsToFetch.map(uid => {
      const taskListRef = doc(firestore, 'task_lists', uid);
      return onSnapshot(taskListRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserState(prev => ({ ...prev, [uid]: docSnap.data() as UserState }));
        }
      });
    });

    // Check if all required task lists have been loaded
    const allLoaded = uidsToFetch.every(uid => userState.hasOwnProperty(uid));
    if (allLoaded) {
      setIsLoading(false);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, groupMembers, groupId, currentUserId, userState]);

  return { group, groupMembers, userState, isLoading };
};
