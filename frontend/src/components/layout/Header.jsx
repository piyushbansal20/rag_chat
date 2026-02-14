import { Menu, LogOut, User, ChevronDown, Bell, Search, Sun, Moon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useUIStore } from '../../stores/uiStore.js';
import { Avatar } from '../ui/index.js';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toggleSidebar, toggleMobileSidebar } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[var(--bg-main)] dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search bar - Desktop only */}
        <div className="hidden md:flex items-center ml-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Avatar
              name={user ? `${user.firstName} ${user.lastName}` : ''}
              size="sm"
              className="ring-2 ring-white dark:ring-slate-800"
            />
            <div className="hidden sm:block text-left">
              <span className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                {user?.firstName}
              </span>
              <span className="block text-xs text-gray-500 dark:text-slate-400">
                {user?.email?.split('@')[0]}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50 animate-scale-in origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-[var(--bg-main)] dark:hover:bg-slate-700/50 transition-colors"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  Account Settings
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-slate-700 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
