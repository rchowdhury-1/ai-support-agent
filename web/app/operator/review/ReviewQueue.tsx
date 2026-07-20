'use client';

import { useState } from 'react';
import type { ReviewItem, ReviewType } from '@/lib/operator-types';
import { Pill, reviewTypePill } from '../../_components/Pill';
import { ChunkPanel } from '../_components/ChunkPanel';

type Filter = 'all' | ReviewType;
type Resolution = 'res' | 'fix' | 'dis';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flag', label: 'Flagged' },
  { key: 'down', label: 'Thumbs-down' },
  { key: 'weak', label: 'Weak retrieval' },
  { key: 'insight', label: 'New insights' },
];

const RES_LABEL: Record<Resolution, string> = {
  res: 'Resolved ✓',
  fix: 'Content fix queued',
  dis: 'Dismissed',
};

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});

  const openCount = (k: Filter) =>
    items.filter((it) => (k === 'all' || it.type === k) && !resolved[it.id]).length;
  const visible = items.filter((it) => filter === 'all' || it.type === filter);
  const resolve = (id: string, r: Resolution) => {
    setResolved((s) => ({ ...s, [id]: r })); // v2: POST /api/admin/review/:id/resolve
    setExpanded(null);
  };

  return (
    <section className="fade-up max-w-[980px]">
      <header className="pt-[26px] pb-4">
        <h1 className="m-0 mb-1 text-[22px] font-bold tracking-[-.02em]">Review queue</h1>
        <div className="text-[13px] text-ink2">Everything needing your eyes, across all tenants.</div>
      </header>

      <div className="flex gap-1.5 flex-wrap mb-3.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="rounded-full text-xs font-bold px-[13px] py-1.5 cursor-pointer"
            style={{
              border: `1px solid ${filter === f.key ? 'var(--a)' : 'var(--b)'}`,
              background: filter === f.key ? 'var(--asf)' : 'transparent',
              color: filter === f.key ? 'var(--a)' : 'var(--t2)',
            }}
          >
            {f.label} {openCount(f.key)}
          </button>
        ))}
      </div>

      {visible.filter((it) => !resolved[it.id]).length === 0 && (
        <div className="bg-surface border border-line rounded-[14px] px-5 py-12 text-center mb-2.5">
          <div
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center mx-auto mb-3.5"
            style={{ background: 'color-mix(in srgb, var(--g) 13%, transparent)', color: 'var(--g)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="text-[14.5px] font-bold">Queue clear</div>
          <div className="text-[12.5px] text-ink2 mt-1">Nothing needs your eyes in this view.</div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {visible.map((it) => {
          const type = reviewTypePill[it.type];
          const res = resolved[it.id];
          const isOpen = expanded === it.id && !res;
          return (
            <div key={it.id} className="bg-surface border border-line rounded-[14px] overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : it.id)}
                className="flex items-center gap-3 w-full px-[18px] py-[13px] border-none bg-transparent text-left cursor-pointer text-ink flex-wrap hover:bg-sunken"
              >
                <Pill tone={type.tone}>{type.label}</Pill>
                <span className="text-[11px] font-bold text-ink3 border border-line rounded-full px-[9px] py-[3px] whitespace-nowrap">
                  {it.tenant}
                </span>
                <span className="flex-1 min-w-[200px] text-[13px] font-semibold">&ldquo;{it.question}&rdquo;</span>
                <span className="text-[11px] text-ink3 whitespace-nowrap">{it.time}</span>
                {res ? <Pill tone="good">{RES_LABEL[res]}</Pill> : null}
              </button>
              {isOpen && (
                <div className="border-t border-line px-[18px] py-4 flex flex-col gap-3 fade-up">
                  <div className="text-xs text-ink2 leading-relaxed">{it.context}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-sunken rounded-[11px] px-[15px] py-[13px]">
                      <div className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-ink3 mb-2">Answer given</div>
                      <div className="text-[12.5px] leading-relaxed">{it.answer}</div>
                      <div className="text-[10.5px] text-ink3 mt-2">{it.cite}</div>
                    </div>
                    <ChunkPanel title="Chunks retrieved" chunks={it.chunks} />
                  </div>
                  <div className="flex gap-[7px] flex-wrap">
                    <button onClick={() => resolve(it.id, 'res')} className="border-none rounded-[9px] bg-accent text-accent-ink text-xs font-bold px-3.5 py-2 cursor-pointer hover:brightness-110">
                      Resolve ✓
                    </button>
                    <button onClick={() => resolve(it.id, 'fix')} className="border border-line-strong rounded-[9px] bg-transparent text-ink text-xs font-bold px-3.5 py-2 cursor-pointer hover:text-warn hover:border-warn">
                      Needs content fix
                    </button>
                    <button onClick={() => resolve(it.id, 'dis')} className="border border-line rounded-[9px] bg-transparent text-ink2 text-xs font-bold px-3.5 py-2 cursor-pointer hover:text-bad hover:border-bad">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
