(function () {
  'use strict';

  const API_URL = 'http://localhost:5000';
  const STORAGE_KEY_PREFIX = 'supportai_session_';

  const script = document.currentScript || document.querySelector('script[data-agent-id]');
  const AGENT_ID = script ? script.getAttribute('data-agent-id') : null;

  if (!AGENT_ID) {
    console.error('[SupportAI] data-agent-id attribute is required');
    return;
  }

  const STORAGE_KEY = STORAGE_KEY_PREFIX + AGENT_ID;

  // --- State ---
  let sessionId = null;
  let agentColor = '#6366f1';
  let agentName = 'Support';
  let welcomeMessage = 'Hello! How can I help you today?';
  let isOpen = false;
  let isLoading = false;
  let messages = [];
  let initialized = false;

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = `
    #supportai-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #supportai-root { position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    #supportai-btn { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s; outline: none; }
    #supportai-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,0,0,0.4); }
    #supportai-btn svg { width: 24px; height: 24px; fill: none; stroke: white; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #supportai-window { width: 360px; height: 520px; background: #111827; border-radius: 16px; border: 1px solid #374151; box-shadow: 0 20px 60px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; animation: supportai-pop 0.2s ease-out; }
    @keyframes supportai-pop { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    #supportai-header { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
    #supportai-header-info { display: flex; align-items: center; gap: 8px; }
    #supportai-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
    #supportai-name { color: white; font-weight: 600; font-size: 14px; }
    #supportai-close { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: color 0.15s; }
    #supportai-close:hover { color: white; }
    #supportai-close svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
    #supportai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: #374151 transparent; }
    #supportai-messages::-webkit-scrollbar { width: 4px; }
    #supportai-messages::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
    .sai-bubble { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; }
    .sai-user { align-self: flex-end; color: white; border-bottom-right-radius: 4px; }
    .sai-assistant { align-self: flex-start; background: #1f2937; color: #f3f4f6; border-bottom-left-radius: 4px; }
    .sai-time { font-size: 10px; margin-top: 4px; opacity: 0.6; }
    .sai-user .sai-time { color: rgba(255,255,255,0.8); }
    .sai-assistant .sai-time { color: #9ca3af; }
    #supportai-typing { align-self: flex-start; background: #1f2937; padding: 12px 14px; border-radius: 16px; border-bottom-left-radius: 4px; display: flex; gap: 4px; align-items: center; }
    .sai-dot { width: 6px; height: 6px; background: #6b7280; border-radius: 50%; animation: sai-bounce 1s infinite; }
    .sai-dot:nth-child(2) { animation-delay: 0.15s; }
    .sai-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes sai-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
    #supportai-input-area { padding: 12px; border-top: 1px solid #1f2937; display: flex; gap: 8px; align-items: flex-end; }
    #supportai-input { flex: 1; background: #1f2937; border: 1px solid #374151; color: #f9fafb; border-radius: 12px; padding: 8px 12px; font-size: 13px; outline: none; resize: none; max-height: 100px; min-height: 38px; transition: border-color 0.15s; font-family: inherit; }
    #supportai-input::placeholder { color: #6b7280; }
    #supportai-input:focus { border-color: var(--sai-color, #6366f1); }
    #supportai-send { width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; transition: opacity 0.15s; flex-shrink: 0; }
    #supportai-send:disabled { opacity: 0.5; cursor: not-allowed; }
    #supportai-send svg { width: 16px; height: 16px; stroke: white; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    @media (max-width: 480px) { #supportai-window { width: calc(100vw - 32px); height: 480px; } }
  `;
  document.head.appendChild(style);

  // --- Icons SVG strings ---
  const iconChat = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const iconX = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const iconSend = `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  const iconSpinner = `<svg viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" fill="none" stroke-dasharray="60" stroke-dashoffset="15"/></svg><style>@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>`;

  // --- DOM ---
  const root = document.createElement('div');
  root.id = 'supportai-root';
  root.style.setProperty('--sai-color', agentColor);

  const btn = document.createElement('button');
  btn.id = 'supportai-btn';
  btn.innerHTML = iconChat;
  btn.style.backgroundColor = agentColor;
  btn.setAttribute('aria-label', 'Open support chat');

  root.appendChild(btn);
  document.body.appendChild(root);

  // --- Render window ---
  function renderWindow() {
    const win = document.createElement('div');
    win.id = 'supportai-window';

    win.innerHTML = `
      <div id="supportai-header" style="background-color:${agentColor}">
        <div id="supportai-header-info">
          <span id="supportai-dot"></span>
          <span id="supportai-name">${escapeHtml(agentName)}</span>
        </div>
        <button id="supportai-close" aria-label="Close">${iconX}</button>
      </div>
      <div id="supportai-messages"></div>
      <div id="supportai-input-area">
        <textarea id="supportai-input" placeholder="Type a message..." rows="1"></textarea>
        <button id="supportai-send" style="background-color:${agentColor}" aria-label="Send">${iconSend}</button>
      </div>
    `;

    root.insertBefore(win, btn);

    document.getElementById('supportai-close').addEventListener('click', toggleChat);
    document.getElementById('supportai-send').addEventListener('click', handleSend);
    document.getElementById('supportai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    document.getElementById('supportai-input').addEventListener('input', autoResize);

    renderMessages();
  }

  function autoResize() {
    const ta = document.getElementById('supportai-input');
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
  }

  function renderMessages() {
    const container = document.getElementById('supportai-messages');
    if (!container) return;
    container.innerHTML = '';

    messages.forEach((msg) => {
      const el = document.createElement('div');
      el.className = `sai-bubble sai-${msg.role}`;
      if (msg.role === 'user') el.style.backgroundColor = agentColor;
      el.innerHTML = `${escapeHtml(msg.content)}<div class="sai-time">${formatTime(msg.time)}</div>`;
      container.appendChild(el);
    });

    if (isLoading) {
      const typing = document.createElement('div');
      typing.id = 'supportai-typing';
      typing.innerHTML = '<div class="sai-dot"></div><div class="sai-dot"></div><div class="sai-dot"></div>';
      container.appendChild(typing);
    }

    container.scrollTop = container.scrollHeight;
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- API ---
  async function startSession() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.sessionId && data.agentId === AGENT_ID) {
          sessionId = data.sessionId;
          await loadHistory();
          return;
        }
      } catch {}
    }

    const res = await fetch(`${API_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID }),
    });

    if (!res.ok) throw new Error('Failed to start session');
    const data = await res.json();

    sessionId = data.sessionId;
    agentColor = data.color || agentColor;
    agentName = data.agentName || agentName;
    welcomeMessage = data.welcomeMessage || welcomeMessage;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, agentId: AGENT_ID }));

    messages = [{ role: 'assistant', content: welcomeMessage, time: Date.now() }];
    root.style.setProperty('--sai-color', agentColor);
  }

  async function loadHistory() {
    const res = await fetch(`${API_URL}/chat/${sessionId}/history`);
    if (!res.ok) { sessionId = null; localStorage.removeItem(STORAGE_KEY); await startSession(); return; }
    const data = await res.json();

    agentColor = data.conversation.color || agentColor;
    agentName = data.conversation.agent_name || agentName;
    welcomeMessage = data.conversation.welcome_message || welcomeMessage;
    root.style.setProperty('--sai-color', agentColor);

    if (data.messages.length === 0) {
      messages = [{ role: 'assistant', content: welcomeMessage, time: Date.now() }];
    } else {
      messages = data.messages.map((m) => ({ role: m.role, content: m.content, time: new Date(m.created_at).getTime() }));
    }
  }

  async function sendMessage(content) {
    const res = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, content }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    const data = await res.json();
    return data.response;
  }

  // --- Handlers ---
  async function handleSend() {
    const input = document.getElementById('supportai-input');
    const content = input.value.trim();
    if (!content || isLoading || !sessionId) return;

    input.value = '';
    input.style.height = 'auto';

    messages.push({ role: 'user', content, time: Date.now() });
    isLoading = true;
    renderMessages();
    document.getElementById('supportai-send').disabled = true;

    try {
      const response = await sendMessage(content);
      messages.push({ role: 'assistant', content: response, time: Date.now() });
    } catch {
      messages.push({ role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.', time: Date.now() });
    } finally {
      isLoading = false;
      renderMessages();
      const sendBtn = document.getElementById('supportai-send');
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  async function toggleChat() {
    isOpen = !isOpen;
    btn.innerHTML = isOpen ? iconX : iconChat;
    btn.setAttribute('aria-label', isOpen ? 'Close support chat' : 'Open support chat');

    if (isOpen) {
      if (!initialized) {
        initialized = true;
        try { await startSession(); } catch (e) { console.error('[SupportAI] Init error:', e); }
      }
      renderWindow();
      setTimeout(() => {
        const input = document.getElementById('supportai-input');
        if (input) input.focus();
      }, 100);
    } else {
      const win = document.getElementById('supportai-window');
      if (win) win.remove();
    }
  }

  btn.addEventListener('click', toggleChat);
})();
