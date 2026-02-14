import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useUIStore } from '../../stores/uiStore.js';
import { cn } from '../../lib/cn.js';

export default function AppLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] dark:bg-slate-900 flex">
      <Sidebar />

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
        )}
      >
        <Header />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
