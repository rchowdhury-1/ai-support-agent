import type { AgentConfig, AnswerMeta, EscalatePayload, StreamHandlers, WidgetOptions } from './types';

const TIMEOUT_MS = 20000;

function withTimeout(init?: RequestInit): RequestInit {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { ...init, signal: ctrl.signal };
}

/**
 * v2 config endpoint; returns null when unavailable (v1 backend) so the caller
 * falls back to /chat/start bootstrap values with v2 features disabled.
 */
export async function fetchConfig(opts: WidgetOptions): Promise<AgentConfig | null> {
  try {
    const res = await fetch(
      `${opts.apiUrl}/chat/config?agentId=${encodeURIComponent(opts.agentId)}`,
      withTimeout()
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      agentName: d.agentName || 'Support',
      accent: opts.accent || d.color || '#2D5A44',
      theme: opts.theme || d.theme || 'light',
      welcomeMessage: d.welcomeMessage || 'Hello! How can I help you today?',
      suggestedQuestions: Array.isArray(d.suggestedQuestions) ? d.suggestedQuestions.slice(0, 4) : [],
      disclaimer: d.disclaimer || '',
      poweredBy: d.poweredBy !== false,
      status: d.status === 'paused' ? 'paused' : 'live',
      v2: true,
    };
  } catch {
    return null;
  }
}

export interface Session {
  sessionId: string;
  agentName: string;
  color: string;
  welcomeMessage: string;
}

export async function startSession(opts: WidgetOptions): Promise<Session> {
  const res = await fetch(`${opts.apiUrl}/chat/start`, withTimeout({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: opts.agentId }),
  }));
  if (!res.ok) throw new Error(`start failed: ${res.status}`);
  const d = await res.json();
  return { sessionId: d.sessionId, agentName: d.agentName, color: d.color, welcomeMessage: d.welcomeMessage };
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  citations?: AnswerMeta['citations'];
  answer_status?: AnswerMeta['answerStatus'];
}

export async function loadHistory(apiUrl: string, sessionId: string): Promise<HistoryMessage[] | null> {
  try {
    const res = await fetch(`${apiUrl}/chat/${encodeURIComponent(sessionId)}/history`, withTimeout());
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d.messages) ? d.messages : [];
  } catch {
    return null;
  }
}

/**
 * Send a message. Speaks both protocols:
 *  - v2 SSE (`text/event-stream`): `delta` events carry answer text increments,
 *    `done` carries {messageId, answerStatus, citations}.
 *  - v1 JSON: single {response} object, surfaced as one delta + done.
 * Limit responses (402/429) map to onError('limit'); everything else to 'error'.
 * Retries once on network/5xx before giving up.
 */
export async function sendMessage(
  apiUrl: string,
  sessionId: string,
  content: string,
  h: StreamHandlers,
  attempt = 0
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/chat/message`, withTimeout({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ sessionId, content }),
    }));
  } catch {
    if (attempt === 0) return retry(apiUrl, sessionId, content, h);
    return h.onError('error');
  }

  if (res.status === 429 || res.status === 402) return h.onError('limit');
  if (!res.ok) {
    if (res.status >= 500 && attempt === 0) return retry(apiUrl, sessionId, content, h);
    return h.onError('error');
  }

  const type = res.headers.get('content-type') || '';
  if (type.includes('text/event-stream') && res.body) {
    return readSse(res.body, h);
  }

  try {
    const d = await res.json();
    const text: string = d.response || '';
    h.onDelta(text);
    h.onDone(text, {
      messageId: d.messageId,
      answerStatus: d.answerStatus,
      citations: Array.isArray(d.citations) ? d.citations : undefined,
    });
  } catch {
    h.onError('error');
  }
}

function retry(apiUrl: string, sessionId: string, content: string, h: StreamHandlers): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(sendMessage(apiUrl, sessionId, content, h, 1)), 800);
  });
}

async function readSse(body: ReadableStream<Uint8Array>, h: StreamHandlers): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  let done = false;
  try {
    for (;;) {
      const { value, done: eof } = await reader.read();
      if (eof) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        let event = 'message';
        let data = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(data); } catch { /* tolerate plain-text data */ }
        if (event === 'delta') {
          const t = typeof payload.text === 'string' ? payload.text : data;
          full += t;
          h.onDelta(t);
        } else if (event === 'done') {
          done = true;
          h.onDone(full, payload as AnswerMeta);
        } else if (event === 'error') {
          done = true;
          h.onError('error');
        }
      }
    }
    if (!done) h.onDone(full, {});
  } catch {
    if (!done) h.onError('error');
  }
}

/** v2 only — fire and forget; failure is silent (the thumb press still registers visually). */
export function sendFeedback(apiUrl: string, messageId: string, rating: 'up' | 'down'): void {
  fetch(`${apiUrl}/chat/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, rating }),
  }).catch(() => undefined);
}

/** Contact capture — a plain DB write on the backend, designed to work when the LLM is down. */
export async function escalate(apiUrl: string, payload: EscalatePayload): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/chat/escalate`, withTimeout({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
    return res.ok;
  } catch {
    return false;
  }
}
