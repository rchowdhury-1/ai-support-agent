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
  agentName: string;
  systemPrompt: string;
  disclaimer: string;
  accent: string;
  caps: { monthly: string; daily: string; session: string };
  /** Pending tenants route to the wizard instead of tenant detail. */
  onboardingStep?: number;
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
  id: string;
  title: string;
  path: string;
  chunks: string;
  status: 'done' | 'processing' | 'queued' | 'skipped';
}

export interface SandboxAnswer {
  text: string;
  srcLine: string;
  chunks: Chunk[];
  meta: string;
}
