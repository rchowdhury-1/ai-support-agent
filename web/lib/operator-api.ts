'use client';

/**
 * Operator data layer — live v2 backend via the same-origin /api proxy.
 * Read shapes per lib/operator-types.ts; mutations mirror the admin API.
 */
import { apiFetch } from './client';
import type { CrawlPage, OpConversation, ReviewItem, Source, Tenant, TriageItem, UsageRow } from './operator-types';

export async function listTenants(): Promise<Tenant[]> {
  return apiFetch('/api/admin/tenants');
}

export async function getTenant(id: string): Promise<Tenant | undefined> {
  try {
    return await apiFetch(`/api/admin/tenants/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) return undefined;
    throw err;
  }
}

export async function createTenant(input: {
  name: string;
  domain?: string;
  contactName?: string;
  contactEmail?: string;
}): Promise<{ tenantId: string; agentId: string }> {
  return apiFetch('/api/admin/tenants', { method: 'POST', body: JSON.stringify(input) });
}

export interface AgentConfigUpdate {
  agentName?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  disclaimer?: string;
  accent?: string;
  theme?: 'light' | 'dark';
  model?: 'haiku' | 'sonnet';
  suggestedQuestions?: string[];
  allowedOrigins?: string[];
  poweredBy?: boolean;
  monthlyCap?: number;
  dailyCap?: number;
  sessionCap?: number;
  onboardingStep?: number | null;
}

export async function updateAgent(tenantId: string, update: AgentConfigUpdate): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/agent`, {
    method: 'PUT',
    body: JSON.stringify(update),
  });
}

export async function pauseAgent(tenantId: string): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/pause`, { method: 'POST', body: '{}' });
}

export async function resumeAgent(tenantId: string): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/resume`, { method: 'POST', body: '{}' });
}

export async function provisionClientUser(
  tenantId: string,
  input: { name: string; email: string; password: string }
): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/client-user`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function crawlSite(tenantId: string, url: string): Promise<CrawlPage[]> {
  return apiFetch(`/api/admin/tenants/${tenantId}/crawl`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function addSiteSources(tenantId: string, urls: string[]): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/sources`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'site', urls }),
  });
}

export async function addTextSource(tenantId: string, name: string, text: string): Promise<void> {
  await apiFetch(`/api/admin/tenants/${tenantId}/sources`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'text', name, text }),
  });
}

export async function uploadPdfSource(tenantId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await apiFetch(`/api/admin/tenants/${tenantId}/sources/pdf`, { method: 'POST', body: form });
}

export async function listSources(tenantId: string): Promise<Source[]> {
  return apiFetch(`/api/admin/tenants/${tenantId}/sources`);
}

export async function refreshSource(sourceId: string): Promise<void> {
  await apiFetch(`/api/admin/sources/${sourceId}/refresh`, { method: 'POST', body: '{}' });
}

export async function deleteSource(sourceId: string): Promise<void> {
  await apiFetch(`/api/admin/sources/${sourceId}`, { method: 'DELETE' });
}

export async function getDriftNotice(tenantId: string): Promise<string | null> {
  const sources = await listSources(tenantId);
  const drifted = sources.filter((s) => s.status === 'drift');
  if (drifted.length === 0) return null;
  return `${drifted.map((s) => s.name).join(', ')} ${drifted.length === 1 ? 'has' : 'have'} changed since last sync — refresh to re-ingest.`;
}

export interface SandboxResult {
  text: string;
  srcLine: string;
  chunks: { src: string; sim: number; excerpt?: string }[];
  meta: string;
}

export async function runSandbox(tenantId: string, question: string): Promise<SandboxResult> {
  return apiFetch(`/api/admin/tenants/${tenantId}/sandbox`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export async function listReviewItems(): Promise<ReviewItem[]> {
  return apiFetch('/api/admin/review');
}

export async function resolveReviewItem(
  id: string,
  resolution: 'resolved' | 'content_fix' | 'dismissed'
): Promise<void> {
  await apiFetch(`/api/admin/review/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
}

export async function getReviewOpenCount(): Promise<number> {
  return (await listReviewItems()).length;
}

export async function listOpConversations(tenantId: string): Promise<OpConversation[]> {
  return apiFetch(`/api/admin/tenants/${tenantId}/conversations`);
}

export async function listTriage(tenantId: string): Promise<TriageItem[]> {
  return apiFetch(`/api/admin/tenants/${tenantId}/insights`);
}

export async function triageInsight(
  id: string,
  action: 'reviewed' | 'added' | 'dismissed'
): Promise<void> {
  await apiFetch(`/api/admin/insights/${id}/triage`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function getUsage(): Promise<{ rows: UsageRow[]; bars: number[] }> {
  return apiFetch('/api/admin/usage');
}

export async function sendPaymentLink(
  tenantId: string,
  monthlyAmountPence: number,
  setupFeePence: number
): Promise<string> {
  const d = await apiFetch<{ url: string }>('/billing/payment-link', {
    method: 'POST',
    body: JSON.stringify({ tenantId, monthlyAmountPence, setupFeePence }),
  });
  return d.url;
}
