import { TaskFlipper } from '@/components/task-flipper';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8 sm:mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold font-headline text-slate-800">
          Daily Dash
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Lock-in tasks, finish them, and boost score!
        </p>
      </header>
      <main>
        <TaskFlipper />
      </main>
    </div>
  );
}
