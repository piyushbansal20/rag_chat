import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  LayoutDashboard,
  Settings,
  Plus,
  X,
  Sparkles,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Button } from '../ui/index.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatAPI } from '../../api/chat.api.js';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/chat', icon: MessageSquare, label: 'Chat', description: 'AI Assistant' },
  { path: '/documents', icon: FileText, label: 'Documents', description: 'Knowledge Base' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview' },
  { path: '/settings', icon: Settings, label: 'Settings', description: 'Preferences' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const { setActiveSession } = useChatStore();

  const { data: sessionsData } = useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: () => chatAPI.listSessions({ limit: 10 }),
    select: (res) => res.data.data.sessions,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => chatAPI.createSession({}),
    onSuccess: (res) => {
      const newSession = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      setActiveSession(newSession._id);
      navigate(`/chat/${newSession._id}`);
      setMobileSidebarOpen(false);
    },
  });

  const handleNewChat = () => {
    createSessionMutation.mutate();
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50',
          'w-72 gradient-sidebar text-gray-900 dark:text-white flex flex-col',
          'transform transition-transform duration-300 ease-out',
          'lg:translate-x-0 border-r border-gray-200 dark:border-slate-700/50',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          !sidebarOpen && 'lg:w-20'
        )}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700/50">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">Knowledge AI</h1>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Enterprise Assistant</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          )}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            isLoading={createSessionMutation.isPending}
            className={cn(
              'w-full justify-center gap-2 bg-blue-600 hover:bg-blue-500 border-0 shadow-lg shadow-blue-600/25',
              !sidebarOpen && 'lg:p-3'
            )}
          >
            <Plus className="h-4 w-4" />
            {sidebarOpen && <span className="font-medium">New Chat</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 py-2 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Navigation
            </p>
          )}
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white',
                !sidebarOpen && 'lg:justify-center lg:px-3'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                isActive(item.path) ? '' : 'group-hover:scale-110'
              )} />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                </div>
              )}
              {sidebarOpen && isActive(item.path) && (
                <ChevronRight className="h-4 w-4 opacity-60" />
              )}
            </Link>
          ))}

          {/* Recent Chats */}
          {sidebarOpen && sessionsData && sessionsData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700/50">
              <p className="px-3 py-2 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                Recent Conversations
              </p>
              <div className="mt-1 space-y-0.5">
                {sessionsData.slice(0, 5).map((session) => (
                  <ChatSessionItem
                    key={session._id}
                    session={session}
                    isActive={location.pathname === `/chat/${session._id}`}
                    onNavigate={() => setMobileSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
            <div className="px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Powered by <span className="text-blue-600 dark:text-blue-400 font-medium">AI</span>
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function ChatSessionItem({ session, isActive, onNavigate }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: (title) => chatAPI.updateSession(session._id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'session', session._id] });
      setIsEditing(false);
      toast.success('Chat renamed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to rename');
      setEditTitle(session.title);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => chatAPI.deleteSession(session._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      toast.success('Chat deleted');
      // If we're on the deleted chat, navigate to /chat
      if (isActive) {
        navigate('/chat');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete');
    },
  });

  const handleRename = () => {
    setShowMenu(false);
    setIsEditing(true);
    setEditTitle(session.title);
  };

  const handleSaveRename = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== session.title) {
      renameMutation.mutate(trimmedTitle);
    } else {
      setIsEditing(false);
      setEditTitle(session.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(session.title);
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteMutation.mutate();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveRename}
          className="flex-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm px-2 py-1 rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:border-blue-500"
          disabled={renameMutation.isPending}
        />
        <button
          onClick={handleSaveRename}
          disabled={renameMutation.isPending}
          className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link
        to={`/chat/${session._id}`}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 pr-8',
          isActive
            ? 'bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-white'
            : 'text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-slate-200'
        )}
      >
        <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-60" />
        <span className="truncate">{session.title}</span>
      </Link>

      {/* More options button */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            'p-1.5 rounded-lg transition-all duration-200',
            showMenu
              ? 'bg-white/70 dark:bg-slate-700 text-gray-700 dark:text-white'
              : 'text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-white/70 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-white'
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-50 animate-scale-in origin-top-right">
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-[var(--bg-main)] dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
