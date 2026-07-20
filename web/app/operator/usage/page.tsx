'use client';

import { getUsage } from '@/lib/operator-api';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { UsageTable } from './UsageTable';

export default function UsagePage() {
  const { data, error } = useData(getUsage);
  if (error) return <LoadError message={error} />;
  if (!data) return <Loading />;
  const { rows } = data;
  return <UsageTable rows={rows} />;
}
