
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, User, Task, UserState } from '@/lib/types';
import { doc, onSnapshot, updateDoc, setDoc, FirestoreError } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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

const APP_STATE_DOC_ID = 'app';
const APP_STATE_COLLECTION_ID = 'riyalTodoState';

const sanitizeUserData = (userData: Partial<UserState>): UserState => {
  return {
    tasks: (userData.tasks ?? []).map(t => ({
      ...t,
      timeSpent: t.timeSpent ?? 0,
      timerState: t.timerState ?? 'stopped',
      timerStartedAt: t.timerStartedAt ?? null,
    })),
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
  const { user: authUser, listName } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!authUser || !firestore) return;

    const docRef = doc(firestore, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    
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
      } else {
        // If the document doesn't exist, create it.
        setDoc(docRef, getInitialState()).catch((serverError: FirestoreError) => {
          if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: getInitialState()
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        });
      }
    }, (serverError: FirestoreError) => {
      setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error("Error fetching data from Firestore:", serverError);
        toast({ title: 'Error', description: 'Could not connect to the database.', variant: 'destructive'});
      }
    });

    return () => unsubscribe();
  }, [authUser, firestore, toast]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('setAppBadge' in navigator) || !listName) return;

    const lastUpdater = state.lastUpdater;
    
    if (lastUpdater && lastUpdater !== listName) {
      navigator.setAppBadge(1).catch(error => console.error('Failed to set app badge:', error));
    } else {
      navigator.clearAppBadge().catch(error => console.error('Failed to clear app badge:', error));
    }
  }, [state.lastUpdater, listName]);
  
  const updateFirestore = useCallback(async (updatePayload: object) => {
    if (!listName) {
      toast({ title: 'Authentication Error', description: 'Cannot save changes. User not identified.', variant: 'destructive' });
      return;
    }
    if (!firestore) {
      toast({ title: 'Firestore Error', description: 'Database not available.', variant: 'destructive' });
      return;
    }
    
    const docRef = doc(firestore, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    
    const dataToUpdate = {
      ...updatePayload,
      lastUpdater: listName,
    };

    updateDoc(docRef, dataToUpdate)
      .catch((serverError: FirestoreError) => {
       if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error("Failed to update state to Firestore", serverError);
        toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
      }
    });
  }, [toast, listName, firestore]);

  const switchUser = useCallback(() => {
    setState(prevState => ({ ...prevState, showBack: !prevState.showBack }));
  }, []);

  const addTask = useCallback((user: User, text: string) => {
    if (user !== listName) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      isCompleted: false,
      createdAt: Date.now(),
      timeSpent: 0,
      timerState: 'stopped',
      timerStartedAt: null,
    };
    const userState = state[user];
    const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
    
    setState(prevState => ({
      ...prevState,
      [user]: { ...userState, tasks: newTasks },
    }));
    updateFirestore({ [`${user}.tasks`]: newTasks });
  }, [state, updateFirestore, listName]);

  const updateTask = useCallback((user: User, taskId: string, newText: string) => {
    if (user !== listName) return;
    const userState = state[user];
    const newTasks = userState.tasks.map(t =>
      t.id === taskId ? { ...t, text: newText } : t
    );
    
    setState(prevState => ({
      ...prevState,
      [user]: { ...userState, tasks: newTasks },
    }));
    updateFirestore({ [`${user}.tasks`]: newTasks });
  }, [state, updateFirestore, listName]);

  const deleteTask = useCallback((user: User, taskId: string) => {
    if (user !== listName) return;
    const userState = state[user];
    const newTasks = userState.tasks.filter(t => t.id !== taskId);
    
    setState(prevState => ({
      ...prevState,
      [user]: { ...userState, tasks: newTasks },
    }));
    updateFirestore({ [`${user}.tasks`]: newTasks });
  }, [state, updateFirestore, listName]);
  
  const toggleTimer = useCallback((user: User, taskId: string) => {
    if (user !== listName) return;
    const userState = state[user];
    const now = Date.now();
    let updatedTask: Task | undefined;

    const newTasks = userState.tasks.map(task => {
      if (task.id === taskId) {
        if (task.timerState === 'running') {
          const elapsed = (now - (task.timerStartedAt || now)) / 1000;
          updatedTask = {
            ...task,
            timerState: 'paused' as 'paused',
            timeSpent: task.timeSpent + elapsed,
            timerStartedAt: null,
          };
        } else {
          updatedTask = {
            ...task,
            timerState: 'running' as 'running',
            timerStartedAt: now,
          };
        }
        return updatedTask;
      }
      return task;
    });

    
    setState(prevState => ({
      ...prevState,
      [user]: { ...userState, tasks: newTasks },
    }));
    updateFirestore({ [`${user}.tasks`]: newTasks });
  }, [state, updateFirestore, listName]);

  const toggleTask = useCallback((user: User, taskId: string) => {
    if (user !== listName || !state[user].isLocked) return;
    
    const userState = state[user];
    const now = Date.now();
    
    const newTasks = userState.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleting = !t.isCompleted;
        let finalTimeSpent = t.timeSpent;
        let timerState: 'stopped' | 'running' | 'paused' = t.timerState;

        if (isCompleting && t.timerState === 'running') {
          const elapsed = (now - (t.timerStartedAt || now)) / 1000;
          finalTimeSpent += elapsed;
        }
        if (isCompleting) {
          timerState = 'stopped';
        }
        
        return {
          ...t,
          isCompleted: isCompleting,
          timeSpent: finalTimeSpent,
          timerState,
          timerStartedAt: isCompleting ? null : t.timerStartedAt,
        };
      }
      return t;
    });

    
    setState(prevState => ({
      ...prevState,
      [user]: { ...userState, tasks: newTasks },
    }));
    updateFirestore({ [`${user}.tasks`]: newTasks });
  }, [state, updateFirestore, listName]);

  const startNewList = useCallback((user: User) => {
    if (user !== listName) return;
    const userState = state[user];
    const newUserData = {
      ...userState,
      tasks: [],
      isLocked: false,
      isFinished: false,
      lockedAt: null,
    };
    
    setState(prevState => ({
      ...prevState,
      [user]: newUserData,
    }));
    updateFirestore({ [`${user}`]: newUserData });
  }, [state, updateFirestore, listName]);

  const restorePreviousList = useCallback((user: User) => {
    if (user !== listName) return;
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
      timeSpent: 0,
      timerState: 'stopped',
      timerStartedAt: null,
    }));

    const newUserData = {
      ...userState,
      tasks: restoredTasks,
      isLocked: false,
      isFinished: false,
      lockedAt: null,
    };
    
    setState(prevState => ({
      ...prevState,
      [user]: newUserData,
    }));
    updateFirestore({ [`${user}`]: newUserData });
  }, [state, updateFirestore, toast, listName]);

  const handleActionButton = useCallback((user: User) => {
    if (user !== listName) return;
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
  
    let newUserData: Partial<UserState>;

    if (userData.isFinished) {
      newUserData = {
        tasks: [],
        isLocked: false,
        isFinished: false,
        lockedAt: null,
      };
    } else if (userData.isLocked) {
      const completedCount = userData.tasks.filter(t => t.isCompleted).length;
      const totalTasks = userData.tasks.length;
      const allTasksCompleted = totalTasks > 0 && completedCount === totalTasks;
      
      let newCurrentStreak = userData.currentStreak;
      if (allTasksCompleted) {
        newCurrentStreak++;
      } else {
        newCurrentStreak = 0;
      }
      
      newUserData = {
        isFinished: true,
        totalCompleted: (userData.totalCompleted ?? 0) + completedCount,
        totalAssigned: (userData.totalAssigned ?? 0) + totalTasks,
        previousTasks: userData.tasks.map(t => ({ text: t.text })),
        currentStreak: newCurrentStreak,
        maxStreak: Math.max(userData.maxStreak, newCurrentStreak),
        lastLockedAt: userData.lockedAt,
      };
    } else {
      let currentStreak = userData.currentStreak;
      if (userData.lastLockedAt) {
        const timeSinceLastLock = now - userData.lastLockedAt;
        const brokeStreak = timeSinceLastLock > 48 * 60 * 60 * 1000;
        if (brokeStreak) {
            currentStreak = 0;
        }
      }
      newUserData = { isLocked: true, lockedAt: now, currentStreak: currentStreak };
    }
    
    const finalUserData = { ...userData, ...newUserData };
    
    setState(prevState => ({
      ...prevState,
      [user]: finalUserData,
    }));
    updateFirestore({ [`${user}`]: finalUserData });
  }, [state, toast, updateFirestore, listName]);
  

  return {
    state,
    switchUser,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    toggleTimer,
    handleActionButton,
    startNewList,
    restorePreviousList,
  };
};
