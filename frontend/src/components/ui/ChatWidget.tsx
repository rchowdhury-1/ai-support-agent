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
  color = '#6366f1',
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

  useEffect(() => {
    if (open && !started) {
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
      setStarted(true);
      if (agentId && !demoMode) {
        api.post('/chat/start', { agentId }).then((res) => {
          setSessionId(res.data.sessionId);
        }).catch(() => {});
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
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Thanks for your question! This is a demo. In the real version, I'm powered by Gemini AI and can answer questions specific to your business.",
          },
        ]);
      } else if (sessionId) {
        const res = await api.post('/chat/message', { sessionId, content: userMessage });
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-96 h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: color }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-white font-semibold text-sm">{agentName}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: color } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none outline-none border border-gray-700 focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: color }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
