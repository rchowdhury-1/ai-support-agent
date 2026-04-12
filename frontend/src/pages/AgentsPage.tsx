import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bot, MessageSquare, Code2, Settings, Loader2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Agent } from '../types';
import toast from 'react-hot-toast';

const DEFAULT_PROMPT = `You are a helpful customer support assistant for our business. Be friendly, concise, and always try to solve the customer's problem. If you can't help, offer to escalate to a human agent.`;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', system_prompt: DEFAULT_PROMPT, welcome_message: 'Hello! How can I help you today?', color: '#8b5cf6' });

  useEffect(() => {
    api.get('/agents').then((res) => setAgents(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Agent name is required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/agents', form);
      setAgents((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ name: '', system_prompt: DEFAULT_PROMPT, welcome_message: 'Hello! How can I help you today?', color: '#8b5cf6' });
      toast.success('Agent created!');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent and all its conversations?')) return;
    try {
      await api.delete(`/agents/${id}`);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      toast.success('Agent deleted');
    } catch { toast.error('Failed to delete agent'); }
  };

  const copyEmbed = async (id: string) => {
    try {
      const res = await api.get(`/agents/${id}/embed`);
      await navigator.clipboard.writeText(res.data.embedCode);
      toast.success('Embed code copied!');
    } catch { toast.error('Failed to get embed code'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your AI support agents</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6" style={{ borderColor: 'rgba(139,92,246,0.4)', boxShadow: '0 0 30px rgba(139,92,246,0.1)' }}>
          <h2 className="font-semibold text-white mb-5">Create New Agent</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Agent Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Support Bot" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>System Prompt</label>
              <textarea value={form.system_prompt} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                rows={4} className="input-field resize-none" style={{ fontFamily: 'inherit' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Welcome Message</label>
              <input value={form.welcome_message} onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }} />
                <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{form.color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm disabled:opacity-50">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Agent
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm transition-colors px-4 py-2 rounded-xl"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {agents.length === 0 && !showForm ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)' }}>
            <Bot className="w-6 h-6" style={{ color: 'var(--primary-light)' }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No agents yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Create your first AI support agent to get started</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Create first agent</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="card p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${agent.color}20`, border: `1px solid ${agent.color}40` }}>
                    <Bot className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <MessageSquare className="w-3 h-3" />
                      {agent.conversation_count ?? 0} conversations
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(agent.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs line-clamp-2 mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{agent.system_prompt}</p>
              <div className="flex gap-2">
                <Link to={`/dashboard/agents/${agent.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-all duration-150"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
                  <Settings className="w-3.5 h-3.5" /> Configure
                </Link>
                <button onClick={() => copyEmbed(agent.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-all duration-150"
                  style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.25)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.1)'; }}>
                  <Code2 className="w-3.5 h-3.5" /> Copy Embed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
