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
        setDoc(docRef, initialDbState).catch(error => {
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
  
  const updateFirestore = async (newState: Partial<AppState>) => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    try {
      // Create a new object for Firestore without the client-side state
      const stateToSync = { ...state, ...newState };
      const { showBack, connectionStatus, ...dbState } = stateToSync;
      await setDoc(docRef, dbState, { merge: true });
    } catch (error) {
      console.error("Failed to update state to Firestore", error);
      toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  };

  const switchUser = useCallback(() => {
    setState(prevState => ({ ...prevState, showBack: !prevState.showBack }));
  }, []);

  const addTask = useCallback((user: User, text: string) => {
    setState(prevState => {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text,
        isCompleted: false,
        createdAt: Date.now(),
      };
      const userState = prevState[user];
      const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
      const newState = {
        ...prevState,
        [user]: {
          ...userState,
          tasks: newTasks,
        },
      };
      updateFirestore(newState);
      return newState;
    });
  }, []);

  const updateTask = useCallback((user: User, taskId: string, newText: string) => {
    setState(prevState => {
      const userState = prevState[user];
      const newTasks = userState.tasks.map(t =>
        t.id === taskId ? { ...t, text: newText } : t
      );
      const newState = {
        ...prevState,
        [user]: {
          ...userState,
          tasks: newTasks,
        },
      };
      updateFirestore(newState);
      return newState;
    });
  }, []);

  const deleteTask = useCallback((user: User, taskId: string) => {
    setState(prevState => {
        const userState = prevState[user];
        const newTasks = userState.tasks.filter(t => t.id !== taskId);
        const newState = {
          ...prevState,
          [user]: {
            ...userState,
            tasks: newTasks,
          },
        };
        updateFirestore(newState);
        return newState;
      });
  }, []);

  const toggleTask = useCallback((user: User, taskId: string) => {
    setState(prevState => {
      if (!prevState[user].isLocked) return prevState;

      const userState = prevState[user];
      const newTasks = userState.tasks.map(t =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      );
      const newState = {
        ...prevState,
        [user]: {
          ...userState,
          tasks: newTasks,
        },
      };
       updateFirestore(newState);
      return newState;
    });
  }, []);

  const startNewList = useCallback((user: User) => {
     setState(prevState => {
      const userState = prevState[user];
      const newState = {
        ...prevState,
        [user]: {
          ...userState,
          tasks: [],
          isLocked: false,
          isFinished: false,
        },
      };
      updateFirestore(newState);
      return newState;
    });
  }, []);

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
  
    setState(prevState => {
      const currentData = prevState[user];
      let newUserData;

      if (currentData.isFinished) {
        // Start New List
        newUserData = {
          ...currentData,
          tasks: [],
          isLocked: false,
          isFinished: false,
        };
      } else if (currentData.isLocked) {
        // Finish List
        const completed = currentData.tasks.filter(t => t.isCompleted).length;
        const total = currentData.tasks.length;
        newUserData = {
          ...currentData,
          isFinished: true,
          totalCompleted: currentData.totalCompleted + completed,
          totalAssigned: currentData.totalAssigned + total,
        };
      } else {
        // Lock List
        newUserData = {
          ...currentData,
          isLocked: true,
        };
      }
      const newState = { ...prevState, [user]: newUserData };
      updateFirestore(newState);
      return newState;
    });
  }, [state, toast]);
  

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
