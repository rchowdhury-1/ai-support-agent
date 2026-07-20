import type { ConversationStatus, EnquiryStatus, InsightStatus } from '@/lib/types';
import type { ReviewType, SourceStatus, TenantStatus } from '@/lib/operator-types';

/** Consistent status colour language across surfaces (design token families). */
type Tone = 'good' | 'accent' | 'warn' | 'bad' | 'muted';

const TONE_STYLE: Record<Tone, { color: string; background: string }> = {
  good: { color: 'var(--g)', background: 'color-mix(in srgb, var(--g) 13%, transparent)' },
  accent: { color: 'var(--a)', background: 'color-mix(in srgb, var(--a) 12%, transparent)' },
  warn: { color: 'var(--am)', background: 'color-mix(in srgb, var(--am) 14%, transparent)' },
  bad: { color: 'var(--rd)', background: 'color-mix(in srgb, var(--rd) 12%, transparent)' },
  muted: { color: 'var(--t3)', background: 'color-mix(in srgb, var(--t3) 14%, transparent)' },
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className="flex-none text-[11px] font-bold px-[10px] py-1 rounded-full whitespace-nowrap"
      style={TONE_STYLE[tone]}
    >
      {children}
    </span>
  );
}

export const conversationPill: Record<ConversationStatus, { tone: Tone; label: string }> = {
  answered: { tone: 'good', label: 'Answered' },
  no_answer: { tone: 'warn', label: "Couldn't answer" },
  escalated: { tone: 'bad', label: 'Escalated' },
};

export const insightPill: Record<InsightStatus, { tone: Tone; label: string }> = {
  new: { tone: 'warn', label: 'New' },
  fixing: { tone: 'accent', label: 'Being fixed' },
  added: { tone: 'good', label: 'Answer added ✓' },
  not_relevant: { tone: 'muted', label: 'Not relevant' },
};

export const enquiryPill: Record<EnquiryStatus, { tone: Tone; label: string }> = {
  new: { tone: 'warn', label: 'New' },
  contacted: { tone: 'accent', label: 'Contacted' },
  closed: { tone: 'muted', label: 'Closed' },
};

export const tenantPill: Record<TenantStatus, { tone: Tone; label: string }> = {
  active: { tone: 'good', label: 'Active' },
  pending: { tone: 'warn', label: 'Pending' },
  paused: { tone: 'bad', label: 'Paused' },
  past_due: { tone: 'bad', label: 'Past due' },
};

export const sourcePill: Record<SourceStatus, { tone: Tone; label: string }> = {
  synced: { tone: 'good', label: 'Synced ✓' },
  drift: { tone: 'warn', label: 'Drift detected' },
  processing: { tone: 'accent', label: 'Processing…' },
};

export const reviewTypePill: Record<ReviewType, { tone: Tone; label: string }> = {
  flag: { tone: 'bad', label: 'Client flag' },
  down: { tone: 'warn', label: '👎 answer' },
  weak: { tone: 'warn', label: 'Weak retrieval' },
  insight: { tone: 'accent', label: 'New insight' },
};
