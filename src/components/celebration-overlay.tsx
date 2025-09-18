"use client";

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { History, Plus } from 'lucide-react';

type CelebrationOverlayProps = {
  completed: number;
  total: number;
  onNewList: () => void;
  onRestorePrevious: () => void;
  canRestore: boolean;
  theme: 'riya' | 'naitik';
};

export function CelebrationOverlay({ completed, total, onNewList, onRestorePrevious, canRestore, theme }: CelebrationOverlayProps) {
  
  const buttonClass = theme === 'riya' ? 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-400' : 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-400';
  const restoreButtonClass = theme === 'riya' ? 'text-purple-600 border-purple-300 hover:bg-purple-50' : 'text-cyan-600 border-cyan-300 hover:bg-cyan-50';


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        className="flex flex-col items-center gap-4"
      >
        <div>
            <h3 className="text-4xl font-bold text-emerald-600">List Finished!</h3>
            <p className="text-lg text-slate-600 mt-2">
              You completed {completed} of {total} tasks.
            </p>
        </div>
        <div className="flex gap-4">
            <Button
              onClick={onNewList}
              className={`px-6 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${buttonClass}`}
            >
              <Plus className="w-4 h-4 mr-2"/>
              Start New List
            </Button>
            {canRestore && (
              <Button
                variant="outline"
                onClick={onRestorePrevious}
                className={`px-6 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 ${restoreButtonClass}`}
              >
                <History className="w-4 h-4 mr-2"/>
                Previous List
              </Button>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}
