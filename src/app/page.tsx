"use client";

import { useEffect } from 'react';
import { TaskFlipper } from '@/components/task-flipper';
import { useTaskStore } from '@/hooks/use-task-store';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

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

  const scrollToTop = () => {
    const topSection = document.getElementById('top-section');
    if (topSection) {
      topSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div>
      <section id="top-section" className="snap-section h-screen flex flex-col justify-center pt-4 pb-6 pl-5 pr-5">
        <div className="h-full w-full max-w-4xl mx-auto">
          <TaskFlipper />
        </div>
      </section>
      <section id="ambuj" className="snap-section h-screen flex items-center justify-center pt-4 pb-6 pl-5 pr-5">
        <div className="h-full w-full max-w-4xl flex flex-col">
           <div className="flex justify-center items-center mb-4">
             <Button
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 rounded-full backdrop-blur-sm shadow-lg text-sm font-semibold px-4 py-2 focus:outline-none focus:ring-0 bg-[--ambuj-primary] hover:bg-emerald-500 text-white"
              >
                <ArrowUp className="h-4 w-4" />
                <span>Go to Top</span>
              </Button>
           </div>
           <div className="flex-grow min-h-0">
             <TaskCard user="ambuj" />
           </div>
        </div>
      </section>
    </div>
  );
}
