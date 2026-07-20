import type { Metadata } from 'next';
import { getReviewOpenCount } from '@/lib/operator-api';
import { OperatorNav } from './_components/OperatorNav';

export const metadata: Metadata = { title: 'Operator — SupportAI' };

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const reviewBadge = await getReviewOpenCount();
  return (
    <div className="min-h-screen">
      <OperatorNav reviewBadge={reviewBadge} />
      <main className="max-w-[1360px] mx-auto px-[22px] pb-16">{children}</main>
    </div>
  );
}
