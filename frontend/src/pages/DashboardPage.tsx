import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Bot, TrendingUp, Clock, Plus, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { DashboardStats, Conversation } from '../types';
import clsx from 'clsx';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => {
        setStats(res.data.stats);
        setRecent(res.data.recentConversations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    open: 'bg-green-900 text-green-300',
    closed: 'bg-gray-800 text-gray-400',
    escalated: 'bg-yellow-900 text-yellow-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Your support overview</p>
        </div>
        <Link
          to="/dashboard/agents"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Agents', value: stats?.agents_count ?? '0', icon: Bot, color: 'text-indigo-400' },
          { label: 'Total Conversations', value: stats?.total_conversations ?? '0', icon: MessageSquare, color: 'text-blue-400' },
          { label: 'Open Conversations', value: stats?.open_conversations ?? '0', icon: Clock, color: 'text-green-400' },
          { label: 'Messages Today', value: stats?.messages_today ?? '0', icon: TrendingUp, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Conversations</h2>
          <Link to="/dashboard/conversations" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No conversations yet</p>
            <Link to="/dashboard/agents" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
              Create your first agent →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {recent.map((conv) => (
              <Link
                key={conv.id}
                to={`/dashboard/conversations/${conv.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{conv.visitor_name ?? 'Anonymous'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{conv.agent_name} · {conv.message_count} messages</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColor[conv.status])}>
                    {conv.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(conv.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
