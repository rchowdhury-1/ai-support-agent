import { listTenants } from '@/lib/operator-api';
import { TenantsTable } from './_components/TenantsTable';

export default async function OperatorTenantsPage() {
  const tenants = await listTenants();
  return <TenantsTable tenants={tenants} />;
}
