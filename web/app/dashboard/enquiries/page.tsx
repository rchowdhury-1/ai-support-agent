'use client';

import { listEnquiries } from '@/lib/api';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { EnquiryRow } from './EnquiryRow';

export default function EnquiriesPage() {
  const { data: enquiries, error } = useData(listEnquiries);
  if (error) return <LoadError message={error} />;
  if (!enquiries) return <Loading />;

  return (
    <section className="fade-up">
      <header className="pt-[34px] pb-6">
        <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-[-.025em]">Enquiries</h1>
        <div className="text-sm text-ink2">
          Visitors who left their details when the assistant couldn&rsquo;t answer.
        </div>
      </header>
      <div className="bg-surface border border-line rounded-[14px] px-5">
        {enquiries.map((e) => (
          <EnquiryRow key={e.id} enquiry={e} />
        ))}
        <div className="py-[13px] text-xs text-ink3">
          New enquiries are also emailed to you the moment they arrive.
        </div>
      </div>
    </section>
  );
}
