/** Operator-dashboard domain types, mirroring the v2 API contract. */

export type TenantStatus = 'active' | 'pending' | 'paused' | 'past_due';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: TenantStatus;
  model: 'Haiku' | 'Sonnet';
  used: number;
  cap: number;
  cost: string;
  last: string;
  flags: number;
  insights: number;
  agentId: string | null;
  agentName: string;
  agentStatus: 'live' | 'paused';
  systemPrompt: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  allowedOrigins: string[];
  disclaimer: string;
  accent: string;
  caps: { monthly: string; daily: string; session: string };
  /** Pending tenants route to the wizard instead of tenant detail. */
  onboardingStep?: number;
  /** Detail-endpoint extras (GET /api/admin/tenants/:id). */
  bars?: number[];
  tokens?: string;
  answerRate?: string;
  avgCostPerConv?: string;
  monthlyAmountPence?: number;
  setupFeePence?: number;
}

export type SourceStatus = 'synced' | 'drift' | 'processing';

export interface Source {
  id: string;
  icon: 'site' | 'pdf' | 'text';
  name: string;
  type: string;
  size: string;
  status: SourceStatus;
  synced: string;
}

export interface Chunk {
  src: string;
  sim: number;
  excerpt?: string;
}

export type ReviewType = 'flag' | 'down' | 'weak' | 'insight';

export interface ReviewItem {
  id: string;
  type: ReviewType;
  tenant: string;
  question: string;
  time: string;
  context: string;
  answer: string;
  cite: string;
  chunks: Chunk[];
}

export interface OpConversation {
  question: string;
  time: string;
  status: 'answered' | 'escalated';
  telemetry: string;
}

export interface TriageItem {
  id: string;
  question: string;
  count: number;
  meta: string;
}

export interface UsageRow {
  name: string;
  msgs: number;
  cap: number;
  tokens: string;
  cost: number;
  alert: string;
}

export interface CrawlPage {
  /** The page URL — doubles as the ingest identifier. */
  id: string;
  title: string;
  path: string;
  chunks: string;
  status: 'queued' | 'skipped';
}
