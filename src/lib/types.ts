// Represents a single task item for any user.
export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: number;
  timeSpent: number; // in seconds
  timerState: 'stopped' | 'running' | 'paused';
  timerStartedAt: number | null;
}

// A simplified task object for historical records.
export interface PreviousTask {
  text: string;
}

// The complete state for a single user's task list.
// This is the schema for documents in the `/task_lists/{userId}` collection.
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
  pairedWith?: string | null; // UID of the user on the back of the card
}

// Represents a user's public profile.
// This is the schema for documents in the `/users/{userId}` collection.
export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    cardTheme: string; // e.g., 'default', 'periwinkle', 'lavender'
}

// Represents a group of users.
// This is the schema for documents in the `/groups/{groupId}` collection.
export interface Group {
    name: string;
    invitationCode: string;
    createdBy: string; // UID of the user who created the group
    members: {
        [uid: string]: 'admin' | 'member';
    };
}


// --- LEGACY --- //
// The following types are for the old data model and should not be used for new features.

export type LegacyUser = 'riya' | 'naitik' | 'ambuj';

export interface LegacyUserState {
  tasks: Task[];
  previousTasks: PreviousTask[];
  isLocked: boolean;
  isFinished: boolean;
  totalCompleted: number;
  totalAssigned: number;
  currentStreak: number;
  maxStreak: number;
  lockedAt: number | null;
  lastLockedAt: number | null;
}

export type LegacyAppState = {
  [key in LegacyUser]: LegacyUserState;
} & {
  showBack: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error';
  lastUpdater: LegacyUser | null;
};
