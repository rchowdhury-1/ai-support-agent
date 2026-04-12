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
  const [form, setForm] = useState({ name: '', system_prompt: '', welcome_message: '', color: '#8b5cf6' });
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
    api.get(`/agents/${id}/embed`).then((res) => setEmbedCode(res.data.embedCode)).catch(() => {});
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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>;
  if (!agent) return null;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/dashboard/agents')}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Configure Agent</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{agent.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config */}
        <div className="space-y-5">
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-white">Agent Settings</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Agent Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Welcome Message</label>
              <input value={form.welcome_message} onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))} className="input-field" />
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

          <div className="card p-6">
            <h2 className="font-semibold text-white mb-1">System Prompt</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Define your AI's personality, knowledge, and behavior.</p>
            <textarea value={form.system_prompt} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              rows={10}
              placeholder="e.g. You are a helpful support agent for Acme Corp..."
              className="input-field resize-none text-sm leading-relaxed"
              style={{ fontFamily: 'inherit' }}
            />
            <p className="text-xs mt-2" style={{ color: 'rgba(156,163,175,0.4)' }}>{form.system_prompt.length} / 5000</p>
          </div>

          {embedCode && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <h2 className="font-semibold text-white">Embed Code</h2>
                </div>
                <button onClick={copyEmbed} className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-dark)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Paste into your website's &lt;body&gt; tag:</p>
              <pre className="rounded-xl p-3 text-xs overflow-x-auto scrollbar-thin" style={{ background: 'var(--bg)', color: '#4ade80', border: '1px solid var(--border)' }}>
                {embedCode}
              </pre>
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          <h2 className="font-semibold text-white mb-4">Live Preview</h2>
          <div className="card relative overflow-hidden" style={{ height: '580px' }}>
            <div className="absolute inset-0 hero-grid opacity-30" />
            <p className="relative text-xs p-4" style={{ color: 'var(--text-muted)' }}>Live widget preview:</p>
            <div className="absolute inset-0">
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
