
"use client";

import { useContext } from 'react';
import { FirebaseContext } from '../provider';

export const useStorage = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
      throw new Error('useStorage must be used within a FirebaseProvider');
    }
    return context.storage;
};
