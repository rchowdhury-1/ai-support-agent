import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import { Conversation } from '../types';
import clsx from 'clsx';

type StatusFilter = 'all' | 'open' | 'closed' | 'escalated';

const statusClass: Record<string, string> = {
  open: 'status-open',
  closed: 'status-closed',
  escalated: 'status-escalated',
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    api.get(`/conversations${params}`)
      .then((res) => setConversations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All customer support conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['all', 'open', 'closed', 'escalated'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize"
                style={filter === s
                  ? { background: 'var(--primary)', color: 'white' }
                  : { color: 'var(--text-muted)', background: 'transparent' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)' }}>
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
            </div>
            <p className="text-sm font-medium text-white mb-1">No conversations found</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try changing the status filter</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Visitor', 'Agent', 'Messages', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => (
                <tr key={conv.id} className="transition-all duration-150" style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/conversations/${conv.id}`} className="block">
                      <p className="text-sm font-medium text-white transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-light)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'white')}>
                        {conv.visitor_name ?? 'Anonymous'}
                      </p>
                      {conv.visitor_email && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{conv.visitor_email}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{conv.agent_name}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{conv.message_count}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusClass[conv.status])}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {new Date(conv.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
