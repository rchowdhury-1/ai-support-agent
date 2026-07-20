export interface WidgetOptions {
  agentId: string;
  apiUrl: string;
  /** Optional script-tag overrides; server config wins when present. */
  accent?: string;
  theme?: 'light' | 'dark';
  /** Inline mode: render the panel open inside `container` (no launcher, not fixed). */
  inline?: boolean;
  container?: HTMLElement;
}

/** Resolved runtime configuration. v2 fields fall back to v1 bootstrap values. */
export interface AgentConfig {
  agentName: string;
  accent: string;
  theme: 'light' | 'dark';
  welcomeMessage: string;
  suggestedQuestions: string[];
  disclaimer: string;
  poweredBy: boolean;
  status: 'live' | 'paused';
  /** True when the v2 /chat/config endpoint answered — gates feedback, escalate, citations. */
  v2: boolean;
}

export interface Citation {
  title: string;
  url?: string;
}

export type AnswerStatus = 'answered' | 'partial' | 'not_in_kb' | 'error';

export interface AnswerMeta {
  messageId?: string;
  answerStatus?: AnswerStatus;
  citations?: Citation[];
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone: (fullText: string, meta: AnswerMeta) => void;
  onError: (kind: 'limit' | 'error') => void;
}

export interface EscalatePayload {
  agentId: string;
  sessionId?: string;
  name: string;
  contact: string;
  message: string;
  source: 'no_answer' | 'quota_fallback' | 'agent_paused' | 'error';
}
