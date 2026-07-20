'use client';

import { getReviewOpenCount } from '@/lib/operator-api';
import { ensureSession } from '@/lib/client';
import { useData } from '@/lib/use-data';
import { Loading } from '@/lib/ui-state';
import { OperatorNav } from './_components/OperatorNav';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { data } = useData(async () => {
    const user = await ensureSession();
    const reviewBadge = user.role === 'operator' ? await getReviewOpenCount().catch(() => 0) : 0;
    return { user, reviewBadge };
  });

  if (!data) return <Loading />;
  return (
    <div className="min-h-screen">
      <OperatorNav reviewBadge={data.reviewBadge} />
      <main className="max-w-[1360px] mx-auto px-[22px] pb-16">{children}</main>
    </div>
  );
}
