import { TaskFlipper } from '@/components/task-flipper';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold font-headline text-slate-800 tracking-tight">
          Daily Dash
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Lock-in your tasks for the day, crush your goals, and watch your score soar!
        </p>
      </header>
      <main>
        <TaskFlipper />
      </main>
    </div>
  );
}
