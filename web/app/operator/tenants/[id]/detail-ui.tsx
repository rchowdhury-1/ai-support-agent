/** Static presentational constants for the tenant-detail screen. */
import type { Source } from '@/lib/operator-types';

export const TABS = ['Agent', 'Sources', 'Conversations', 'Insights', 'Usage & cost', 'Billing'] as const;
export type Tab = (typeof TABS)[number];

export const label = 'flex flex-col gap-[5px] text-[11.5px] font-bold text-ink2';
export const input =
  'px-[11px] py-[9px] border border-line rounded-lg bg-page text-ink text-[12.5px] outline-none focus:border-accent font-sans font-normal';
export const card = 'bg-surface border border-line rounded-[14px] p-5';

export const SOURCE_ICONS: Record<Source['icon'], React.ReactNode> = {
  site: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c2.5 2.6 4 6.1 4 10s-1.5 7.4-4 10c-2.5-2.6-4-6.1-4-10s1.5-7.4 4-10z" />
    </svg>
  ),
  pdf: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
    </svg>
  ),
  text: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
};
