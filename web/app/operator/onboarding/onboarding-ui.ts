/** Static style tokens and data for the onboarding wizard. */
import type { SandboxResult } from '@/lib/operator-api';

export const STEPS = ['Create', 'Ingest', 'Agent', 'Sandbox', 'Embed', 'Billing'];

export type SandboxTurn = { id: number; role: 'user' | 'bot'; text: string; answer?: SandboxResult | 'pending' };

export type EmbedSnippets = Record<'html' | 'next' | 'wp', { label: string; code: string; note: string }>;

export const label = 'flex flex-col gap-1.5 text-xs font-bold text-ink2';
export const input =
  'px-3 py-2.5 border border-line rounded-[9px] bg-page text-ink text-[13px] outline-none focus:border-accent font-sans font-normal';
export const card = 'bg-surface border border-line rounded-[14px] p-6 flex flex-col';
export const primaryBtn =
  'self-start px-[18px] py-2.5 border-none rounded-[10px] bg-accent text-accent-ink text-[13px] font-bold cursor-pointer hover:brightness-110 disabled:opacity-60';

export const ACCENTS = ['#B3552E', '#2D5A44', '#1F3A5F', '#53387A'];

export const crawlStatusPill = {
  done: { tx: 'Ingested ✓', color: 'var(--g)', bg: 'color-mix(in srgb, var(--g) 13%, transparent)' },
  processing: { tx: 'Processing…', color: 'var(--a)', bg: 'color-mix(in srgb, var(--a) 12%, transparent)' },
  queued: { tx: 'Queued', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 14%, transparent)' },
  skipped: { tx: 'Skipped', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 12%, transparent)' },
} as const;
