

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
}

// Represents a user's public profile.
// This is the schema for documents in the `/users/{userId}` collection.
export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string | null;
    cardTheme: string; // e.g., 'default', 'periwinkle', 'lavender'
    groupId?: string | null; // ID of the group the user belongs to
    pairedWith?: string | null; // UID of the paired user
}

// Represents a group of users.
// This is the schema for documents in the `/groups/{groupId}` collection.
export interface Group {
    id: string;
    name: string;
    invitationCode: string;
    createdBy: string; // UID of the user who created the group
    members: {
        [uid: string]: 'admin' | 'co-admin' | 'member';
    };
    lastKickedUid?: string; // UID of the last user kicked, for security rules
}

// Represents a pairing invitation.
// This is the schema for documents in the `/pair_invitations/{invitationId}` collection.
export interface PairInvitation {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    createdAt: number; // Timestamp
}

// Represents a group invitation sent via email.
// This is the schema for documents in the `/group_invitations/{invitationId}` collection.
export interface GroupInvitation {
    id: string;
    groupId: string;
    groupName: string;
    senderId: string;
    senderName: string;
    receiverEmail: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: number;
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
  lastLockedAt: null;
}

export interface AppState {
  [key: string]: any; 
  showBack: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error';
  lastUpdater: LegacyUser | null;
};

    
