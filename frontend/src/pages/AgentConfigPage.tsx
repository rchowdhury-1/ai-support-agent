import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Code2, Loader2, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { Agent } from '../types';
import ChatWidget from '../components/ui/ChatWidget';
import toast from 'react-hot-toast';

export default function AgentConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: '', system_prompt: '', welcome_message: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embedCode, setEmbedCode] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get('/agents')
      .then((res) => {
        const found = res.data.find((a: Agent) => a.id === id);
        if (!found) { navigate('/dashboard/agents'); return; }
        setAgent(found);
        setForm({ name: found.name, system_prompt: found.system_prompt, welcome_message: found.welcome_message, color: found.color });
      })
      .catch(() => navigate('/dashboard/agents'))
      .finally(() => setLoading(false));

    api.get(`/agents/${id}/embed`)
      .then((res) => setEmbedCode(res.data.embedCode))
      .catch(() => {});
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/agents/${id}`, form);
      setAgent(res.data);
      toast.success('Agent updated!');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied!');
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!agent) return null;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/dashboard/agents')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Configure Agent</h1>
          <p className="text-gray-400 mt-1">{agent.name}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config form */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-white">Agent Settings</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Welcome Message</label>
              <input
                value={form.welcome_message}
                onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500"
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
                <span className="text-gray-400 text-sm font-mono">{form.color}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">System Prompt</label>
            </div>
            <p className="text-xs text-gray-500 mb-3">Define your AI's personality, knowledge, and behavior. This shapes every response.</p>
            <textarea
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              rows={10}
              placeholder="e.g. You are a helpful support agent for Acme Corp. We sell cloud software. Always be friendly and professional..."
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 resize-none text-sm leading-relaxed"
            />
            <p className="text-xs text-gray-600 mt-2">{form.system_prompt.length} / 5000 characters</p>
          </div>

          {embedCode && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="font-semibold text-white">Embed Code</h2>
                </div>
                <button onClick={copyEmbed} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">Paste this into your website's &lt;body&gt; tag:</p>
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">
                {embedCode}
              </pre>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div>
          <h2 className="font-semibold text-white mb-4">Live Preview</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative" style={{ height: '600px' }}>
            <p className="text-gray-500 text-sm mb-4">This is how your widget looks and feels:</p>
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <ChatWidget
                demoMode
                color={form.color}
                agentName={form.name || 'Support Agent'}
                welcomeMessage={form.welcome_message || 'Hello! How can I help?'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
