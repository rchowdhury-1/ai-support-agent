import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Filter } from 'lucide-react';
import { api } from '../lib/api';
import { Conversation } from '../types';
import clsx from 'clsx';

type StatusFilter = 'all' | 'open' | 'closed' | 'escalated';

const statusColors: Record<string, string> = {
  open: 'bg-green-900 text-green-300',
  closed: 'bg-gray-800 text-gray-400',
  escalated: 'bg-yellow-900 text-yellow-300',
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
          <p className="text-gray-400 mt-1">All customer support conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1">
            {(['all', 'open', 'closed', 'escalated'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                  filter === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-16 text-center">
            <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No conversations found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Visitor</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Messages</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {conversations.map((conv) => (
                <tr key={conv.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/conversations/${conv.id}`} className="block">
                      <p className="text-sm font-medium text-white hover:text-indigo-300 transition-colors">
                        {conv.visitor_name ?? 'Anonymous'}
                      </p>
                      {conv.visitor_email && (
                        <p className="text-xs text-gray-500 mt-0.5">{conv.visitor_email}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{conv.agent_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{conv.message_count}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[conv.status])}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
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
