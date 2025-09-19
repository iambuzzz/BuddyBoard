"use client";

import { useEffect } from 'react';
import { TaskFlipper } from '@/components/task-flipper';
import { useTaskStore } from '@/hooks/use-task-store';
import { TaskCard } from '@/components/task-card';

export default function Home() {
  const { state } = useTaskStore();

  useEffect(() => {
    const themeColor = state.showBack ? '#22d3ee' : '#a78bfa';
    let themeMetaTag = document.querySelector('meta[name="theme-color"]');
    if (themeMetaTag) {
      themeMetaTag.setAttribute('content', themeColor);
    } else {
      themeMetaTag = document.createElement('meta');
      themeMetaTag.name = 'theme-color';
      themeMetaTag.content = themeColor;
      document.getElementsByTagName('head')[0].appendChild(themeMetaTag);
    }
  }, [state.showBack]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="h-[85vh]">
        <TaskFlipper />
      </div>
      <div className="h-[85vh]">
        <TaskCard user="ambuj" />
      </div>
    </div>
  );
}
