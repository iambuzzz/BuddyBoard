import type { P, PD } from 'patch-package/dist/patch/parse';

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface UserState {
  tasks: Task[];
  isLocked: boolean;
  isFinished: boolean;
  totalCompleted: number;
  totalAssigned: number;
}

export type AppState = {
  riya: UserState;
  naitik: UserState;
  // false for Riya's view (front), true for Naitik's view (back)
  showBack: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error';
};

export type User = 'riya' | 'naitik';
