import { TaskFlipper } from '@/components/task-flipper';

export default function Home() {
  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <main className="flex-grow flex flex-col min-h-0">
        <TaskFlipper />
      </main>
    </div>
  );
}
