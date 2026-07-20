'use client';

import { getDriftNotice, getTenant, listOpConversations, listSources, listTriage } from '@/lib/operator-api';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { TenantDetail } from './TenantDetail';

export default function TenantPage({ params }: { params: { id: string } }) {
  const { data, error, reload } = useData(async () => {
    const tenant = await getTenant(params.id);
    if (!tenant) return { tenant: undefined };
    const [sources, drift, conversations, triage] = await Promise.all([
      listSources(params.id),
      getDriftNotice(params.id),
      listOpConversations(params.id),
      listTriage(params.id),
    ]);
    return { tenant, sources, drift, conversations, triage };
  }, [params.id]);

  if (error) return <LoadError message={error} />;
  if (!data) return <Loading />;
  if (!data.tenant) return <LoadError message="Tenant not found" />;
  return (
    <TenantDetail
      tenant={data.tenant}
      sources={data.sources!}
      drift={data.drift!}
      conversations={data.conversations!}
      triage={data.triage!}
      onChanged={reload}
    />
  );
}
