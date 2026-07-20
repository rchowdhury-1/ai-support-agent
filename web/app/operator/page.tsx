'use client';

import { listTenants } from '@/lib/operator-api';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { TenantsTable } from './_components/TenantsTable';

export default function OperatorTenantsPage() {
  const { data: tenants, error } = useData(listTenants);
  if (error) return <LoadError message={error} />;
  if (!tenants) return <Loading />;
  return <TenantsTable tenants={tenants} />;
}
