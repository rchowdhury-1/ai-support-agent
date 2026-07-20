import { getUsage } from '@/lib/operator-api';
import { UsageTable } from './UsageTable';

export const metadata = { title: 'Usage — SupportAI Operator' };

export default async function UsagePage() {
  const { rows } = await getUsage();
  return <UsageTable rows={rows} />;
}
