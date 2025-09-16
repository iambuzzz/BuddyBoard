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
});

const APP_STATE_DOC_ID = 'taskFlipperState';
const APP_STATE_COLLECTION_ID = 'app';

export const useTaskStore = () => {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<AppState, 'showBack'>;
        setState(prevState => ({ ...prevState, ...data }));
      } else {
        // Document doesn't exist, create it with initial state.
        const initialState = getInitialState();
        const { showBack, ...initialDbState } = initialState;
        setDoc(docRef, initialDbState);
      }
      setStatus('ready');
    }, (error) => {
      console.error("Error fetching data from Firestore:", error);
      toast({ title: 'Error', description: 'Could not connect to the database.', variant: 'destructive'});
      setStatus('ready');
    });

    return () => unsubscribe();
  }, [toast]);
  
  const updateFirestore = async (newState: Partial<AppState>) => {
    const docRef = doc(db, APP_STATE_COLLECTION_ID, APP_STATE_DOC_ID);
    try {
      // Ensure we don't try to write 'showBack' to firestore
      const { showBack, ...dbState } = newState;
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
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      isCompleted: false,
      createdAt: Date.now(),
    };
    
    setState(prevState => {
      const userState = prevState[user];
      const newTasks = [...userState.tasks, newTask].sort((a, b) => a.createdAt - b.createdAt);
      const newState = {
        ...prevState,
        [user]: {
          ...userState,
          tasks: newTasks,
        },
      };
      updateFirestore({ [user]: newState[user] });
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
      updateFirestore({ [user]: newState[user] });
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
        updateFirestore({ [user]: newState[user] });
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
       updateFirestore({ [user]: newState[user] });
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
      updateFirestore({ [user]: newState[user] });
      return newState;
    });
  }, []);

  const handleActionButton = useCallback((user: User) => {
    setState(prevState => {
      const userData = prevState[user];
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
        if (userData.tasks.length === 0) {
          toast({ title: 'List is empty', description: 'Add at least one task to lock in your list.', variant: 'destructive'});
          return prevState;
        }
        newUserData = {
          ...userData,
          isLocked: true,
        };
      }
      const newState = { ...prevState, [user]: newUserData };
      updateFirestore({ [user]: newUserData });
      return newState;
    });
  }, [toast]);
  

  return {
    state: { ...state, status },
    switchUser,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    handleActionButton,
    startNewList,
  };
};
