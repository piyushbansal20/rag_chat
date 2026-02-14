import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  Zap,
  TrendingUp,
  ArrowRight,
  Upload,
  Settings,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '../../components/ui/index.js';
import { statsAPI } from '../../api/stats.api.js';

function formatNumber(num) {
  if (num === undefined || num === null) return '—';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function DashboardPage() {
  const { data: statsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => statsAPI.getDashboard(),
    select: (res) => res.data.data,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const stats = [
    {
      label: 'Total Documents',
      value: statsData?.documents?.total,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/25',
    },
    {
      label: 'Chat Sessions',
      value: statsData?.sessions?.total,
      icon: MessageSquare,
      color: 'from-emerald-500 to-emerald-600',
      shadowColor: 'shadow-emerald-500/25',
    },
    {
      label: 'Queries Today',
      value: statsData?.today?.queries,
      icon: Zap,
      color: 'from-amber-500 to-amber-600',
      shadowColor: 'shadow-amber-500/25',
    },
    {
      label: 'Tokens Used',
      value: statsData?.allTime?.tokens,
      icon: TrendingUp,
      color: 'from-violet-500 to-violet-600',
      shadowColor: 'shadow-violet-500/25',
      format: true,
    },
  ];

  const quickActions = [
    {
      href: '/chat',
      icon: MessageSquare,
      title: 'Start a Chat',
      description: 'Ask questions about your documents',
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      href: '/documents',
      icon: Upload,
      title: 'Upload Documents',
      description: 'Add new files to your knowledge base',
      color: 'from-emerald-500 to-emerald-600',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      href: '/settings',
      icon: Settings,
      title: 'Settings',
      description: 'Configure your account preferences',
      color: 'from-slate-500 to-slate-600',
      shadowColor: 'shadow-slate-500/20',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
          </div>
          <p className="text-gray-500 dark:text-slate-400">
            Welcome back! Here's an overview of your knowledge base.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  {isLoading ? (
                    <div className="mt-2 h-9 flex items-center">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {stat.format ? formatNumber(stat.value) : (stat.value ?? '—')}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadowColor}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Stats Detail */}
      {statsData?.today && (statsData.today.queries > 0 || statsData.today.tokens > 0) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Queries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData.today.queries}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Tokens Used</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(statsData.today.tokens)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">All-Time Queries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(statsData.allTime?.queries)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">All-Time Tokens</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(statsData.allTime?.tokens)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className="group relative flex items-center gap-4 p-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg ${action.shadowColor} group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Section */}
      <Card className="mt-6">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Getting Started
              </h3>
              <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
                Upload your documents to build a knowledge base, then use the AI chat to ask questions and get answers based on your content. The more documents you add, the smarter your assistant becomes.
              </p>
            </div>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200 whitespace-nowrap"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
