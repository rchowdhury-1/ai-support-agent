import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  agentId?: string;
  demoMode?: boolean;
  color?: string;
  agentName?: string;
  welcomeMessage?: string;
}

export default function ChatWidget({
  agentId,
  demoMode = false,
  color = '#8b5cf6',
  agentName = 'Support Agent',
  welcomeMessage = 'Hello! How can I help you today?',
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Use CSS variable if color is a var() reference
  const resolvedColor = color.startsWith('var(') ? '#8b5cf6' : color;

  useEffect(() => {
    if (open && !started) {
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
      setStarted(true);
      if (agentId && !demoMode) {
        api.post('/chat/start', { agentId }).then((res) => setSessionId(res.data.sessionId)).catch(() => {});
      }
    }
  }, [open, started, welcomeMessage, agentId, demoMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 1000));
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "Thanks for your question! This is a demo. In the real version, I'm powered by Gemini AI and can answer questions specific to your business.",
        }]);
      } else if (sessionId) {
        const res = await api.post('/chat/message', { sessionId, content: userMessage });
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-[360px] flex flex-col overflow-hidden"
          style={{
            height: '500px',
            background: '#0c0a1a',
            borderRadius: '20px',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.15)',
          }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${resolvedColor}, ${resolvedColor}cc)`, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
              <span className="text-white font-semibold text-sm">{agentName}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[82%] px-3 py-2.5 text-sm leading-relaxed"
                  style={msg.role === 'user'
                    ? { background: resolvedColor, color: 'white', borderRadius: '16px 16px 4px 16px' }
                    : { background: '#1e1a3a', color: '#f1f0ff', borderRadius: '16px 16px 16px 4px', border: '1px solid rgba(139,92,246,0.2)' }
                  }>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2.5" style={{ background: '#1e1a3a', borderRadius: '16px 16px 16px 4px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: resolvedColor, animationDelay: `${delay}ms`, opacity: 0.8 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 text-sm resize-none outline-none scrollbar-thin"
                style={{
                  background: '#1e1a3a',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  color: '#f1f0ff',
                  minHeight: '38px',
                  maxHeight: '100px',
                  fontFamily: 'inherit',
                  caretColor: resolvedColor,
                }}
                onFocus={e => (e.target.style.borderColor = resolvedColor)}
                onBlur={e => (e.target.style.borderColor = 'rgba(139,92,246,0.25)')}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all duration-150"
                style={{
                  background: `linear-gradient(135deg, ${resolvedColor}, #06b6d4)`,
                  boxShadow: input.trim() ? `0 0 16px ${resolvedColor}60` : 'none',
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${resolvedColor}, #06b6d4)`,
          boxShadow: open ? 'none' : `0 4px 24px ${resolvedColor}60, 0 0 40px ${resolvedColor}30`,
        }}
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
}
