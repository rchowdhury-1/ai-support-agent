import { notFound } from 'next/navigation';
import { getDriftNotice, getTenant, listOpConversations, listSources, listTriage } from '@/lib/operator-api';
import { TenantDetail } from './TenantDetail';

export const metadata = { title: 'Tenant — SupportAI Operator' };

export default async function TenantPage({ params }: { params: { id: string } }) {
  const tenant = await getTenant(params.id);
  if (!tenant) notFound();
  const [sources, drift, conversations, triage] = await Promise.all([
    listSources(params.id),
    getDriftNotice(params.id),
    listOpConversations(params.id),
    listTriage(params.id),
  ]);
  return (
    <TenantDetail tenant={tenant} sources={sources} drift={drift} conversations={conversations} triage={triage} />
  );
}
