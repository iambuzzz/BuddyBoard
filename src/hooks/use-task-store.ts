"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, User, Task, UserState } from '@/lib/types';
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
  },
  naitik: {
    tasks: [],
    previousTasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
  },
  showBack: false,
  connectionStatus: 'connecting',
});

const APP_STATE_DOC_ID = 'riyalTodoState';
const APP_STATE_COLLECTION_ID = 'app';

// Helper to ensure user data has default values for scoring
const sanitizeUserData = (userData: Partial<UserState>): UserState => {
  return {
    tasks: userData.tasks ?? [],
    previousTasks: userData.previousTasks ?? [],
    isLocked: userData.isLocked ?? false,
    isFinished: userData.isFinished ?? false,
    totalCompleted: userData.totalCompleted ?? 0,
    totalAssigned: userData.totalAssigned ?? 0,
  };
};

export const useTaskStore = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<AppState, 'showBack' | 'connectionStatus'>;
        
        // Sanitize incoming data to ensure all fields are present
        const sanitizedData = {
          riya: sanitizeUserData(data.riya || {}),
          naitik: sanitizeUserData(data.naitik || {}),
        };

        setState(prevState => ({ ...prevState, ...sanitizedData, connectionStatus: 'connected' }));
      } else {
        const initialState = getInitialState();
        const { showBack, connectionStatus, ...initialDbState } = initialState;
        setDoc(docRef, initialDbState).then(() => {
           setState(prevState => ({ ...prevState, ...initialDbState, connectionStatus: 'connected' }));
        }).catch(error => {
          console.error("Failed to create initial document:", error);
          toast({ title: 'Error', description: 'Could not initialize database.', variant: 'destructive'});
          setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
        });
      }
    }, (error) => {
      console.error("Error fetching data from Firestore:", error);
      toast({ title: 'Error', description: 'Could not connect to the database.', variant: 'destructive'});
      setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
    });

    return () => unsubscribe();
  }, [toast]);
  
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
      },
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
    const restoredTasks = userState.previousTasks.map(task => ({
      ...task,
      isCompleted: false,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }));

    const newState = {
      ...state,
      [user]: {
        ...userState,
        tasks: restoredTasks,
        isLocked: false,
        isFinished: false,
      },
    };
    setState(newState);
    updateFirestore(newState);
  }, [state, updateFirestore, toast]);

  const handleActionButton = useCallback((user: User) => {
    const userData = state[user];

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
      // Start New List
      newUserData = {
        ...userData,
        tasks: [],
        isLocked: false,
        isFinished: false,
      };
    } else if (userData.isLocked) {
      // Finish List
      const completed = userData.tasks.filter(t => t.isCompleted).length;
      const total = userData.tasks.length;
      newUserData = {
        ...userData,
        isFinished: true,
        totalCompleted: userData.totalCompleted + completed,
        totalAssigned: userData.totalAssigned + total,
        previousTasks: userData.tasks, // Save current tasks as previous
      };
    } else {
      // Lock List
      newUserData = {
        ...userData,
        isLocked: true,
      };
    }
    const newState = { ...state, [user]: newUserData };
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
