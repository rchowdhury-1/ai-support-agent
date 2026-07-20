/**
 * Client-dashboard data layer.
 *
 * MOCK ADAPTER: currently serves the demo dataset so the dashboard is fully
 * navigable before the v2 backend exists. Each function's signature matches
 * the v2 API contract from the approved architecture — replacing the bodies
 * with `fetch` calls (and deleting lib/demo-data.ts) is the entire swap.
 */
import {
  demoBilling,
  demoConversations,
  demoEnquiries,
  demoInsightMonths,
  demoOverview,
  demoUser,
} from './demo-data';
import type { Billing, Conversation, Enquiry, InsightMonth, Overview, SessionUser } from './types';

export async function getSessionUser(): Promise<SessionUser> {
  return demoUser; // v2: GET /api/me
}

export async function getOverview(): Promise<Overview> {
  return demoOverview; // v2: GET /api/overview
}

export async function listConversations(): Promise<Conversation[]> {
  return demoConversations; // v2: GET /api/conversations
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return demoConversations.find((c) => c.id === id); // v2: GET /api/conversations/:id
}

export async function listInsightMonths(): Promise<InsightMonth[]> {
  return demoInsightMonths; // v2: GET /api/insights
}

export async function getBilling(): Promise<Billing> {
  return demoBilling; // v2: GET /api/billing
}

export async function listEnquiries(): Promise<Enquiry[]> {
  return demoEnquiries; // v2: GET /api/enquiries
}

/** Badge counts for the sidebar, derived from data (not hardcoded). */
export async function getNavBadges(): Promise<{ insights: number; enquiries: number }> {
  const [months, enquiries] = await Promise.all([listInsightMonths(), listEnquiries()]);
  const latest = months[months.length - 1];
  return {
    insights: latest.rows.filter((r) => r.status === 'new').length,
    enquiries: enquiries.filter((e) => e.status === 'new').length,
  };
}
