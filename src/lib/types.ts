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
  ambuj: UserState;
  // false for Riya's view (front), true for Ambuj's view (back)
  showBack: boolean;
};

export type User = 'riya' | 'ambuj';
