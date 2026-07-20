import { listReviewItems } from '@/lib/operator-api';
import { ReviewQueue } from './ReviewQueue';

export const metadata = { title: 'Review queue — SupportAI Operator' };

export default async function ReviewPage() {
  const items = await listReviewItems();
  return <ReviewQueue items={items} />;
}
