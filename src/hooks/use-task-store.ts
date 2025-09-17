"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, User, Task } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const getInitialState = (): AppState => ({
  riya: {
    tasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
  },
  ambuj: {
    tasks: [],
    isLocked: false,
    isFinished: false,
    totalCompleted: 0,
    totalAssigned: 0,
  },
  showBack: false,
  connectionStatus: 'connecting',
});

const APP_STATE_DOC_ID = 'taskFlipperState';
const APP_STATE_COLLECTION_ID = 'app';

export const useTaskStore = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<AppState, 'showBack' | 'connectionStatus'>;
        setState(prevState => ({ ...prevState, ...data, connectionStatus: 'connected' }));
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
  
  const updateFirestore = useCallback(async (newState: Partial<AppState>) => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    try {
      // Create a new object for Firestore without the client-side state
      const stateToSync = { ...state, ...newState };
      delete (stateToSync as Partial<AppState>).showBack;
      delete (stateToSync as Partial<AppState>).connectionStatus;

      await setDoc(docRef, stateToSync, { merge: true });
    } catch (error) {
      console.error("Failed to update state to Firestore", error);
      toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  }, [state, toast]);

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
  };
};
