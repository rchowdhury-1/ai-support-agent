'use client';

import { listReviewItems } from '@/lib/operator-api';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { ReviewQueue } from './ReviewQueue';

export default function ReviewPage() {
  const { data: items, error } = useData(listReviewItems);
  if (error) return <LoadError message={error} />;
  if (!items) return <Loading />;
  return <ReviewQueue items={items} />;
}
