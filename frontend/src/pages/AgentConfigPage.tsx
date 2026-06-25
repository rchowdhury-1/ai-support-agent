import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Code2, Loader2, Copy, Upload, FileText, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Agent, KnowledgeDocument } from '../types';
import ChatWidget from '../components/ui/ChatWidget';
import toast from 'react-hot-toast';

export default function AgentConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: '', system_prompt: '', welcome_message: '', color: '#8b5cf6' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const embedCode = id
    ? `<script src="${appUrl}/widget.js" data-agent-id="${id}" data-api-url="${apiUrl}" defer></script>`
    : '';

  const loadDocuments = () => {
    if (!id) return;
    api.get(`/knowledge/${id}`).then((res) => setDocuments(res.data)).catch(console.error);
  };

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
    loadDocuments();
  }, [id, navigate]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/knowledge/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded — processing...');
      loadDocuments();
      // Poll for processing completion
      const poll = setInterval(() => {
        api.get(`/knowledge/${id}`).then((res) => {
          setDocuments(res.data);
          const stillProcessing = res.data.some((d: KnowledgeDocument) => d.status === 'processing');
          if (!stillProcessing) clearInterval(poll);
        });
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000); // Stop polling after 2 min
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await api.delete(`/knowledge/${id}/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

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

          {/* Knowledge Base */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-white">Knowledge Base</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Upload docs so your agent answers from your content</p>
              </div>
              <label className="btn-primary text-sm cursor-pointer flex items-center gap-1.5">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
                <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="py-8 text-center rounded-xl" style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
                <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No documents uploaded yet</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(156,163,175,0.4)' }}>Supports .txt and .md files (max 5MB)</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary-light)' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(doc.file_size / 1024).toFixed(1)}KB
                          {doc.status === 'ready' && ` · ${doc.chunk_count} chunks`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.status === 'processing' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                        </span>
                      )}
                      {doc.status === 'ready' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#4ade80' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                      {doc.status === 'error' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--error)' }} title={doc.error_message || ''}>
                          <AlertCircle className="w-3.5 h-3.5" /> Error
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="ml-1 p-1 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            title="Delete and re-upload"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
