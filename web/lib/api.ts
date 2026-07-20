'use client';

/**
 * Client-dashboard data layer — live v2 backend via the same-origin
 * /api proxy (see next.config.mjs rewrites). Shapes per lib/types.ts.
 */
import { apiFetch, ensureSession } from './client';
import type { Billing, Conversation, Enquiry, InsightMonth, Overview, SessionUser } from './types';

export async function getSessionUser(): Promise<SessionUser> {
  return ensureSession();
}

export async function getOverview(): Promise<Overview> {
  return apiFetch('/api/overview');
}

export async function listConversations(): Promise<Conversation[]> {
  return apiFetch('/api/conversations');
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  try {
    return await apiFetch(`/api/conversations/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) return undefined;
    throw err;
  }
}

export async function flagMessage(conversationId: string, messageIndex: number): Promise<void> {
  await apiFetch(`/api/conversations/${conversationId}/messages/${messageIndex}/flag`, {
    method: 'POST',
    body: '{}',
  });
}

export async function listInsightMonths(): Promise<InsightMonth[]> {
  return apiFetch('/api/insights');
}

export async function getBilling(): Promise<Billing> {
  return apiFetch('/api/billing');
}

export async function openBillingPortal(): Promise<string> {
  const d = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST', body: '{}' });
  return d.url;
}

export async function listEnquiries(): Promise<Enquiry[]> {
  return apiFetch('/api/enquiries');
}

export async function setEnquiryStatus(id: string, status: Enquiry['status']): Promise<void> {
  await apiFetch(`/api/enquiries/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/** Badge counts for the sidebar, derived from data (not hardcoded). */
export async function getNavBadges(): Promise<{ insights: number; enquiries: number }> {
  const [months, enquiries] = await Promise.all([listInsightMonths(), listEnquiries()]);
  const latest = months[months.length - 1];
  return {
    insights: latest ? latest.rows.filter((r) => r.status === 'new').length : 0,
    enquiries: enquiries.filter((e) => e.status === 'new').length,
  };
}
