import { TaskFlipper } from '@/components/task-flipper';

export default function Home() {
  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center py-4 flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl font-bold font-headline text-slate-800 tracking-tight">
          Daily Dash
        </h1>
      </header>
      <main className="flex-grow flex flex-col">
        <TaskFlipper />
      </main>
    </div>
  );
}
