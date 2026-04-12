import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bot, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusClass: Record<string, string> = {
  open: 'status-open',
  closed: 'status-closed',
  escalated: 'status-escalated',
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
      .then((res) => { setConversation(res.data.conversation); setMessages(res.data.messages); })
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
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  );
  if (!conversation) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/dashboard/conversations')}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <ArrowLeft className="w-4 h-4" /> Back to Conversations
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{conversation.visitor_name ?? 'Anonymous Visitor'}</h1>
          {conversation.visitor_email && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{conversation.visitor_email}</p>}
          <p className="text-xs mt-1" style={{ color: 'rgba(156,163,175,0.5)' }}>
            via {conversation.agent_name} · {new Date(conversation.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('px-3 py-1 rounded-full text-sm font-medium capitalize', statusClass[conversation.status])}>
            {conversation.status}
          </span>
          <div className="relative">
            <select
              value={conversation.status}
              onChange={(e) => updateStatus(e.target.value as 'open' | 'closed' | 'escalated')}
              disabled={updating}
              className="appearance-none text-sm rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{messages.length} messages</span>
          <span className="text-xs font-mono" style={{ color: 'rgba(156,163,175,0.4)' }}>{conversation.session_id}</span>
        </div>

        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <Bot className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
                  </div>
                )}
                <div className={clsx('max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed', msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm')}
                  style={msg.role === 'user'
                    ? { background: 'var(--primary)', color: 'white' }
                    : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }
                  }>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1.5 opacity-60">{new Date(msg.created_at).toLocaleTimeString()}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
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
