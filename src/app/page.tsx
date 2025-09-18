"use client";

import { useEffect } from 'react';
import { TaskFlipper } from '@/components/task-flipper';
import { useTaskStore } from '@/hooks/use-task-store';

export default function Home() {
  const { state } = useTaskStore();

  useEffect(() => {
    const themeColor = state.showBack ? '#22d3ee' : '#a78bfa';
    const themeMetaTag = document.querySelector('meta[name="theme-color"]');
    if (themeMetaTag) {
      themeMetaTag.setAttribute('content', themeColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, [state.showBack]);

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <main className="flex-grow flex flex-col min-h-0">
        <TaskFlipper />
      </main>
    </div>
  );
}
