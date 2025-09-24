"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, User, Task, UserState, PreviousTask } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const getInitialState = (): AppState => ({
  riya: {
    tasks: [],
    previousTasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
    currentStreak: 0,
    maxStreak: 0,
    lockedAt: null,
    lastLockedAt: null,
  },
  naitik: {
    tasks: [],
    previousTasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
    currentStreak: 0,
    maxStreak: 0,
    lockedAt: null,
    lastLockedAt: null,
  },
  ambuj: {
    tasks: [],
    previousTasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
    currentStreak: 0,
    maxStreak: 0,
    lockedAt: null,
    lastLockedAt: null,
  },
  showBack: false,
  connectionStatus: 'connecting',
  lastUpdater: null,
});

const APP_STATE_DOC_ID = 'riyalTodoState';
const APP_STATE_COLLECTION_ID = 'app';

// Helper to ensure user data has default values
const sanitizeUserData = (userData: Partial<UserState>): UserState => {
  return {
    tasks: userData.tasks ?? [],
    previousTasks: userData.previousTasks ?? [],
    isLocked: userData.isLocked ?? false,
    isFinished: userData.isFinished ?? false,
    totalCompleted: userData.totalCompleted ?? 0,
    totalAssigned: userData.totalAssigned ?? 0,
    currentStreak: userData.currentStreak ?? 0,
    maxStreak: userData.maxStreak ?? 0,
    lockedAt: userData.lockedAt ?? null,
    lastLockedAt: userData.lastLockedAt ?? null,
  };
};

export const useTaskStore = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<Omit<AppState, 'showBack' | 'connectionStatus'>>;
        
        const sanitizedData = {
          riya: sanitizeUserData(data.riya || {}),
          naitik: sanitizeUserData(data.naitik || {}),
          ambuj: sanitizeUserData(data.ambuj || {}),
          lastUpdater: data.lastUpdater || null,
        };

        setState(prevState => ({ ...prevState, ...sanitizedData, connectionStatus: 'connected' }));
      }
      // THE DANGEROUS 'ELSE' BLOCK THAT CAUSED DATA DELETION HAS BEEN REMOVED.
    }, (error) => {
      console.error("Error fetching data from Firestore:", error);
      toast({ title: 'Error', description: 'Could not connect to the database.', variant: 'destructive'});
      setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('setAppBadge' in navigator)) return;

    const lastUpdater = state.lastUpdater;
    const currentViewUser = state.showBack ? 'naitik' : 'riya';

    if (lastUpdater && lastUpdater !== currentViewUser) {
      navigator.setAppBadge(1).catch(error => console.error('Failed to set app badge:', error));
    } else {
      navigator.clearAppBadge().catch(error => console.error('Failed to clear app badge:', error));
    }
  }, [state.lastUpdater, state.showBack]);
  
  const updateFirestore = useCallback(async (newState: AppState) => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    try {
      // Create a new object for Firestore without the client-side state
      const { showBack, connectionStatus, ...stateToSync } = newState;

      await setDoc(docRef, stateToSync, { merge: true });
    } catch (error) {
      console.error("Failed to update state to Firestore", error);
      toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  }, [toast]);

  const switchUser = useCallback(() => {
    setState(prevState => ({ ...prevState, showBack: !prevState.showBack }));
  }, []);

  const addTask = useCallback((user: User, text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      isCompleted: false,
      createdAt: Date.now(),
    };
    const userState = state[user];
    const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: newTasks,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore]);

  const updateTask = useCallback((user: User, taskId: string, newText: string) => {
    const userState = state[user];
    const newTasks = userState.tasks.map(t =>
      t.id === taskId ? { ...t, text: newText } : t
    );
    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: newTasks,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore]);

  const deleteTask = useCallback((user: User, taskId: string) => {
    const userState = state[user];
    const newTasks = userState.tasks.filter(t => t.id !== taskId);
    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: newTasks,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore]);

  const toggleTask = useCallback((user: User, taskId: string) => {
    if (!state[user].isLocked) return;

    const userState = state[user];
    const newTasks = userState.tasks.map(t =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: newTasks,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore]);

  const startNewList = useCallback((user: User) => {
    const userState = state[user];
    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: [],
        isLocked: false,
        isFinished: false,
        lockedAt: null,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore]);

  const restorePreviousList = useCallback((user: User) => {
    const userState = state[user];
    if (!userState.previousTasks || userState.previousTasks.length === 0) {
      toast({
        title: 'No Previous List',
        description: 'There is no previous list to restore.',
        variant: 'destructive',
      });
      return;
    }
    const restoredTasks: Task[] = userState.previousTasks.map(task => ({
      id: crypto.randomUUID(),
      text: task.text,
      isCompleted: false,
      createdAt: Date.now(),
    }));

    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: restoredTasks,
        isLocked: false,
        isFinished: false,
        lockedAt: null,
      },
      lastUpdater: user,
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore, toast]);

  const handleActionButton = useCallback((user: User) => {
    const userData = state[user];
    const now = Date.now();

    if (!userData.isLocked && userData.tasks.length === 0) {
      toast({
        title: 'List is empty',
        description: 'Add at least one task to lock in your list.',
        variant: 'destructive',
      });
      return;
    }
  
    let newUserData;

    if (userData.isFinished) {
      // Action: Start New List
      newUserData = {
        ...userData,
        tasks: [],
        isLocked: false,
        isFinished: false,
        lockedAt: null,
      };
    } else if (userData.isLocked) {
      // Action: Finish List
      const completedCount = userData.tasks.filter(t => t.isCompleted).length;
      const totalTasks = userData.tasks.length;
      const allTasksCompleted = totalTasks > 0 && completedCount === totalTasks;
      
      const timeSinceLock = userData.lockedAt ? now - userData.lockedAt : Infinity;
      const within24Hours = timeSinceLock <= 24 * 60 * 60 * 1000;

      let newCurrentStreak = userData.currentStreak;

      if (allTasksCompleted && within24Hours) {
        newCurrentStreak++;
      } else {
        newCurrentStreak = 0;
      }
      
      const newMaxStreak = Math.max(userData.maxStreak, newCurrentStreak);

      newUserData = {
        ...userData,
        isFinished: true,
        totalCompleted: (userData.totalCompleted ?? 0) + completedCount,
        totalAssigned: (userData.totalAssigned ?? 0) + totalTasks,
        previousTasks: userData.tasks.map(t => ({ text: t.text })),
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        lastLockedAt: userData.lockedAt,
      };
    } else {
      // Action: Lock List
      let currentStreak = userData.currentStreak;
      if (userData.lastLockedAt) {
        const timeSinceLastLock = now - userData.lastLockedAt;
        const brokeStreak = timeSinceLastLock > 36 * 60 * 60 * 1000;
        if (brokeStreak) {
            currentStreak = 0;
        }
      }

      newUserData = {
        ...userData,
        isLocked: true,
        lockedAt: now,
        currentStreak: currentStreak
      };
    }
    const newState = { ...state, [user]: newUserData, lastUpdater: user };
    setState(newState);
    updateFirestore(newState);
  }, [state, toast, updateFirestore]);
  

  return {
    state,
    switchUser,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    handleActionButton,
    startNewList,
    restorePreviousList,
  };
};
