/** Domain types mirroring the v2 API contract from the approved architecture. */

export type ConversationStatus = 'answered' | 'no_answer' | 'escalated';
export type InsightStatus = 'new' | 'fixing' | 'added' | 'not_relevant';
export type EnquiryStatus = 'new' | 'contacted' | 'closed';

export interface SessionUser {
  name: string;
  initials: string;
  businessName: string;
}

export interface OverviewStats {
  label: string;
  value: string;
  sub: string;
  tone: 'ink' | 'good' | 'warn';
}

export interface Overview {
  rangeLabel: string;
  stats: OverviewStats[];
  spark: number[];
  reportTeaser: { headline: string; body: string };
  waiting: { initials: string; name: string; question: string; time: string }[];
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  source?: string;
  noSource?: boolean;
  visitorThumbDown?: boolean;
}

export interface Conversation {
  id: string;
  who: string;
  initials: string;
  firstQuestion: string;
  time: string;
  status: ConversationStatus;
  messages: Message[];
}

export interface InsightRow {
  id: string;
  question: string;
  count: number;
  meta: string;
  status: InsightStatus;
}

export interface InsightMonth {
  key: string; // e.g. "2026-07"
  label: string; // e.g. "July 2026"
  empty: boolean;
  summary?: {
    found: number;
    foundSub: string;
    added: number;
    addedSub: string;
    answeredSince: number;
    topics: string[];
  };
  rows: InsightRow[];
  beforeAfter?: {
    beforeDate: string;
    beforeText: string;
    beforeAsked: string;
    afterDate: string;
    afterText: string;
    afterMeta: string;
  };
  emptyStats?: { answered: number };
}

export interface Enquiry {
  id: string;
  name: string;
  initials: string;
  email: string;
  question: string;
  time: string;
  status: EnquiryStatus;
}

export interface Billing {
  planStatus: 'active';
  setupLine: string;
  monthlyLine: string;
  renewalLine: string;
  cardLine: string;
  invoices: { label: string; amount: string }[];
}
