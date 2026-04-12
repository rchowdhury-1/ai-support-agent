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
      .then((res) => { setStats(res.data.stats); setRecent(res.data.recentConversations); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusClass: Record<string, string> = {
    open: 'status-open',
    closed: 'status-closed',
    escalated: 'status-escalated',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Active Agents', value: stats?.agents_count ?? '0', icon: Bot,
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
      iconColor: 'var(--primary-light)', glow: 'rgba(139,92,246,0.2)',
    },
    {
      label: 'Total Conversations', value: stats?.total_conversations ?? '0', icon: MessageSquare,
      gradient: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
      iconColor: 'var(--accent)', glow: 'rgba(6,182,212,0.2)',
    },
    {
      label: 'Open Conversations', value: stats?.open_conversations ?? '0', icon: Clock,
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
      iconColor: '#10b981', glow: 'rgba(16,185,129,0.2)',
    },
    {
      label: 'Messages Today', value: stats?.messages_today ?? '0', icon: TrendingUp,
      gradient: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(167,139,250,0.05))',
      iconColor: 'var(--primary-light)', glow: 'rgba(167,139,250,0.15)',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your support overview</p>
        </div>
        <Link to="/dashboard/agents" className="btn-primary text-sm px-4 py-2">
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, gradient, iconColor, glow }) => (
          <div key={label} className="card p-5 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl opacity-60" style={{ background: gradient }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${glow.replace('0.2', '0.12')}`, boxShadow: `0 0 12px ${glow}` }}>
                  <Icon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Conversations */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-white">Recent Conversations</h2>
          <Link to="/dashboard/conversations" className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'var(--primary-light)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--primary-light)')}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)' }}>
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
            </div>
            <p className="text-sm font-medium text-white mb-1">No conversations yet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Deploy your first agent to start receiving messages</p>
            <Link to="/dashboard/agents" className="btn-primary text-xs px-4 py-2">
              Create first agent
            </Link>
          </div>
        ) : (
          <div>
            {recent.map((conv) => (
              <Link
                key={conv.id}
                to={`/dashboard/conversations/${conv.id}`}
                className="flex items-center justify-between px-6 py-4 transition-all duration-150"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p className="text-sm font-medium text-white">{conv.visitor_name ?? 'Anonymous'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{conv.agent_name} · {conv.message_count} messages</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusClass[conv.status])}>
                    {conv.status}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(conv.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
