import type { P, PD } from 'patch-package/dist/patch/parse';

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface PreviousTask {
  text: string;
}

export interface UserState {
  tasks: Task[];
  previousTasks: PreviousTask[];
  isLocked: boolean;
  isFinished: boolean;
  totalCompleted: number;
  totalAssigned: number;
  currentStreak: number;
  maxStreak: number;
  lockedAt: number | null; // Timestamp when the list was locked
  lastLockedAt: number | null; // Timestamp of the previously locked list
}

export type AppState = {
  riya: UserState;
  naitik: UserState;
  ambuj: UserState;
  // false for Riya's view (front), true for Naitik's view (back)
  showBack: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error';
  lastUpdater: User | null;
};

export type User = 'riya' | 'naitik' | 'ambuj';
