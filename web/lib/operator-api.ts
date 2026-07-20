/**
 * Operator-dashboard data layer — MOCK ADAPTER (same pattern as lib/api.ts).
 * Signatures match the v2 operator API; bodies become fetch calls when the
 * backend ships, and lib/operator-data.ts is deleted.
 */
import {
  demoDrift,
  demoOpConversations,
  demoReviewItems,
  demoSources,
  demoTenants,
  demoTriage,
  demoUsage,
  demoUsageBars,
} from './operator-data';
import type { OpConversation, ReviewItem, Source, Tenant, TriageItem, UsageRow } from './operator-types';

export async function listTenants(): Promise<Tenant[]> {
  return demoTenants; // v2: GET /api/admin/tenants
}

export async function getTenant(id: string): Promise<Tenant | undefined> {
  return demoTenants.find((t) => t.id === id); // v2: GET /api/admin/tenants/:id
}

export async function listSources(tenantId: string): Promise<Source[]> {
  return demoSources[tenantId] ?? []; // v2: GET /api/admin/tenants/:id/sources
}

export async function getDriftNotice(tenantId: string): Promise<string | null> {
  const sources = await listSources(tenantId);
  return sources.some((s) => s.status === 'drift') ? demoDrift : null;
}

export async function listReviewItems(): Promise<ReviewItem[]> {
  return demoReviewItems; // v2: GET /api/admin/review
}

export async function getReviewOpenCount(): Promise<number> {
  return (await listReviewItems()).length;
}

export async function listOpConversations(tenantId: string): Promise<OpConversation[]> {
  return tenantId === '3' ? [] : demoOpConversations; // v2: GET /api/admin/tenants/:id/conversations
}

export async function listTriage(tenantId: string): Promise<TriageItem[]> {
  return tenantId === '3' ? [] : demoTriage; // v2: GET /api/admin/tenants/:id/insights
}

export async function getUsage(): Promise<{ rows: UsageRow[]; bars: number[] }> {
  return { rows: demoUsage, bars: demoUsageBars }; // v2: GET /api/admin/usage
}
