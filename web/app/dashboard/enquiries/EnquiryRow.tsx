'use client';

import { useState } from 'react';
import { setEnquiryStatus } from '@/lib/api';
import type { Enquiry, EnquiryStatus } from '@/lib/types';
import { enquiryPill, Pill } from '../../_components/Pill';

/** The client's one other write: advancing an enquiry New → Contacted → Closed. */
export function EnquiryRow({ enquiry }: { enquiry: Enquiry }) {
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const pill = enquiryPill[status];

  return (
    <div className="flex items-center gap-3.5 py-4 border-b border-line flex-wrap">
      <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-none">
        {enquiry.initials}
      </div>
      <div className="flex-1 min-w-[220px]">
        <div className="flex gap-2 items-baseline flex-wrap">
          <span className="text-[13.5px] font-bold">{enquiry.name}</span>
          <span className="text-xs text-ink3">{enquiry.email}</span>
        </div>
        <div className="text-[12.5px] text-ink2 mt-0.5">&ldquo;{enquiry.question}&rdquo;</div>
      </div>
      <div className="text-[11.5px] text-ink3 flex-none">{enquiry.time}</div>
      <Pill tone={pill.tone}>{pill.label}</Pill>
      {status !== 'closed' ? (
        <button
          onClick={() => {
            const next = status === 'new' ? 'contacted' : 'closed';
            setStatus(next);
            setEnquiryStatus(enquiry.id, next).catch(() => setStatus(status));
          }}
          className="flex-none border border-line bg-transparent rounded-[9px] text-xs font-bold text-ink2 px-[13px] py-[7px] cursor-pointer hover:text-accent"
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--a)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--b)')}
        >
          {status === 'new' ? 'Mark contacted' : 'Close'}
        </button>
      ) : null}
    </div>
  );
}
