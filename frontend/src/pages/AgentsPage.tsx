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
  const [form, setForm] = useState({ name: '', system_prompt: DEFAULT_PROMPT, welcome_message: 'Hello! How can I help you today?', color: '#6366f1' });

  useEffect(() => {
    api.get('/agents')
      .then((res) => setAgents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Agent name is required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/agents', form);
      setAgents((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ name: '', system_prompt: DEFAULT_PROMPT, welcome_message: 'Hello! How can I help you today?', color: '#6366f1' });
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
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  const copyEmbed = async (id: string) => {
    try {
      const res = await api.get(`/agents/${id}/embed`);
      await navigator.clipboard.writeText(res.data.embedCode);
      toast.success('Embed code copied!');
    } catch {
      toast.error('Failed to get embed code');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">Manage your AI support agents</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-indigo-700 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">Create New Agent</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Support Bot"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">System Prompt</label>
              <textarea
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Welcome Message</label>
              <input
                value={form.welcome_message}
                onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
                />
                <span className="text-gray-400 text-sm">{form.color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Agent
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-5 py-2.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {agents.length === 0 && !showForm ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
          <Bot className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No agents yet</h2>
          <p className="text-gray-400 mb-6">Create your first AI support agent to get started</p>
          <button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm">
            Create first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: agent.color + '33' }}>
                    <Bot className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {agent.conversation_count ?? 0} conversations
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(agent.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{agent.system_prompt}</p>
              <div className="flex gap-2">
                <Link
                  to={`/dashboard/agents/${agent.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" /> Configure
                </Link>
                <button
                  onClick={() => copyEmbed(agent.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-xs font-medium py-2 rounded-lg transition-colors"
                >
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
