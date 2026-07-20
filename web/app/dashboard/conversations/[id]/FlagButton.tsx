'use client';

import { useState } from 'react';
import { flagMessage } from '@/lib/api';

/** The client's safety-valve write action → operator review queue. */
export function FlagButton({ conversationId, messageIndex }: { conversationId: string; messageIndex: number }) {
  const [flagged, setFlagged] = useState(false);

  if (flagged) {
    return (
      <span
        className="text-[11px] font-bold rounded-full px-[11px] py-1"
        style={{ color: 'var(--rd)', background: 'color-mix(in srgb, var(--rd) 12%, transparent)' }}
      >
        Flagged — Raz will review
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        setFlagged(true);
        flagMessage(conversationId, messageIndex).catch(() => setFlagged(false));
      }}
      className="border border-line bg-transparent rounded-full text-[11px] font-bold text-ink2 px-[11px] py-1 cursor-pointer hover:text-bad"
      style={{ transition: 'color .15s, border-color .15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rd)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--b)')}
    >
      Flag this answer
    </button>
  );
}
