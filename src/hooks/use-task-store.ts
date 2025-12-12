
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, Task, UserState } from '@/lib/types';
import { doc, onSnapshot, updateDoc, setDoc, FirestoreError } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

// This entire hook is now legacy and will be phased out.
// It is kept here for reference but new development should use individual hooks
// and direct Firestore interactions in components.

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
    pairedWith: userData.pairedWith ?? null,
  };
};

export const useTaskStore = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();
  const { user: authUser, profile } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!authUser || !firestore) return;

    // This hook is legacy and should not be used.
    // The new data model is based on /task_lists/{userId}.
    // This effect is kept to avoid breaking the old TaskFlipper component if it's still used somewhere.

  }, [authUser, firestore, toast]);

  const updateFirestore = useCallback(async (updatePayload: object) => {
    // Legacy function, should not be used for new updates.
  }, [toast, profile, firestore]);

  const switchUser = useCallback(() => {
    setState(prevState => ({ ...prevState, showBack: !prevState.showBack }));
  }, []);
  
  // All other functions (addTask, updateTask, etc.) are deprecated
  // as they operate on the legacy state model. Direct Firestore updates
  // from components should be used instead.

  return {
    state,
    switchUser,
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},
    toggleTask: () => {},
    toggleTimer: () => {},
    handleActionButton: () => {},
    startNewList: () => {},
    restorePreviousList: () => {},
  };
};
