import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bot, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusColors: Record<string, string> = {
  open: 'bg-green-900 text-green-300',
  closed: 'bg-gray-800 text-gray-400',
  escalated: 'bg-yellow-900 text-yellow-300',
};

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/conversations/${id}`)
      .then((res) => {
        setConversation(res.data.conversation);
        setMessages(res.data.messages);
      })
      .catch(() => navigate('/dashboard/conversations'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const updateStatus = async (status: 'open' | 'closed' | 'escalated') => {
    if (!id) return;
    setUpdating(true);
    try {
      await api.put(`/conversations/${id}/status`, { status });
      setConversation((prev) => prev ? { ...prev, status } : null);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!conversation) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/dashboard/conversations')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Conversations
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {conversation.visitor_name ?? 'Anonymous Visitor'}
          </h1>
          {conversation.visitor_email && (
            <p className="text-gray-400 text-sm mt-1">{conversation.visitor_email}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            via {conversation.agent_name} · {new Date(conversation.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={clsx('px-3 py-1 rounded-full text-sm font-medium capitalize', statusColors[conversation.status])}>
            {conversation.status}
          </span>
          <div className="relative">
            <select
              value={conversation.status}
              onChange={(e) => updateStatus(e.target.value as 'open' | 'closed' | 'escalated')}
              disabled={updating}
              className="appearance-none bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400">{messages.length} messages</span>
          <span className="text-xs text-gray-600 font-mono">{conversation.session_id}</span>
        </div>

        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-300" />
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={clsx('text-xs mt-1.5', msg.role === 'user' ? 'text-indigo-200' : 'text-gray-500')}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
