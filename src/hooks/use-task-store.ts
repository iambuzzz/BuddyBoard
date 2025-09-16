"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppState, User, Task } from '@/lib/types';

const APP_STORAGE_KEY = 'taskFlipperState';

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

export const useTaskStore = () => {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [state, setState] = useState<AppState>(getInitialState());
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedState = localStorage.getItem(APP_STORAGE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        // Basic validation
        if (parsedState.riya && parsedState.ambuj) {
          setState(parsedState);
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      try {
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }
  }, [state, status]);

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
    setState(prevState => ({
      ...prevState,
      [user]: {
        ...prevState[user],
        tasks: [...prevState[user].tasks, newTask].sort((a, b) => a.createdAt - b.createdAt),
      },
    }));
  }, []);

  const updateTask = useCallback((user: User, taskId: string, newText: string) => {
    setState(prevState => ({
      ...prevState,
      [user]: {
        ...prevState[user],
        tasks: prevState[user].tasks.map(t =>
          t.id === taskId ? { ...t, text: newText } : t
        ),
      },
    }));
  }, []);

  const deleteTask = useCallback((user: User, taskId: string) => {
    setState(prevState => ({
      ...prevState,
      [user]: {
        ...prevState[user],
        tasks: prevState[user].tasks.filter(t => t.id !== taskId),
      },
    }));
  }, []);

  const toggleTask = useCallback((user: User, taskId: string) => {
    if (!state[user].isLocked) return;
    setState(prevState => ({
      ...prevState,
      [user]: {
        ...prevState[user],
        tasks: prevState[user].tasks.map(t =>
          t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        ),
      },
    }));
  }, [state]);

  const startNewList = useCallback((user: User) => {
    setState(prevState => ({
      ...prevState,
      [user]: {
        ...prevState[user],
        tasks: [],
        isLocked: false,
        isFinished: false,
      },
    }));
  }, []);

  const handleActionButton = useCallback((user: User) => {
    const userData = state[user];
    if (userData.isFinished) {
      startNewList(user);
    } else if (userData.isLocked) {
      // Finish List
      const completed = userData.tasks.filter(t => t.isCompleted).length;
      const total = userData.tasks.length;
      setState(prevState => ({
        ...prevState,
        [user]: {
          ...prevState[user],
          isFinished: true,
          totalCompleted: prevState[user].totalCompleted + completed,
          totalAssigned: prevState[user].totalAssigned + total,
        },
      }));
    } else {
      // Lock List
      if (userData.tasks.length === 0) {
        toast({ title: 'List is empty', description: 'Add at least one task to lock in your list.', variant: 'destructive'});
        return;
      }
      setState(prevState => ({
        ...prevState,
        [user]: {
          ...prevState[user],
          isLocked: true,
        },
      }));
    }
  }, [state, toast, startNewList]);
  

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
