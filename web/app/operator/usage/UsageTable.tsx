'use client';

import { useState } from 'react';
import type { UsageRow } from '@/lib/operator-types';

export function UsageTable({ rows }: { rows: UsageRow[] }) {
  const [sort, setSort] = useState<'cost' | 'msgs'>('cost');
  const sorted = [...rows].sort((a, b) => (sort === 'cost' ? b.cost - a.cost : b.msgs - a.msgs));
  const totalMsgs = rows.reduce((n, r) => n + r.msgs, 0);
  const totalCost = rows.reduce((n, r) => n + r.cost, 0);

  const chip = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? 'var(--a)' : 'var(--b)'}`,
    background: active ? 'var(--asf)' : 'transparent',
    color: active ? 'var(--a)' : 'var(--t2)',
  });

  return (
    <section className="fade-up max-w-[980px]">
      <header className="pt-[26px] pb-4 flex items-end gap-3.5 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h1 className="m-0 mb-1 text-[22px] font-bold tracking-[-.02em]">Global usage</h1>
          <div className="text-[13px] text-ink2">
            July 2026 · total spend <strong className="text-ink">£{totalCost.toFixed(2)}</strong> · margin healthy on every tenant
          </div>
        </div>
        <div className="flex gap-[5px]">
          <button onClick={() => setSort('msgs')} className="rounded-full text-[11.5px] font-bold px-3 py-1.5 cursor-pointer" style={chip(sort === 'msgs')}>
            Sort: messages
          </button>
          <button onClick={() => setSort('cost')} className="rounded-full text-[11.5px] font-bold px-3 py-1.5 cursor-pointer" style={chip(sort === 'cost')}>
            Sort: cost
          </button>
        </div>
      </header>

      <div className="bg-surface border border-line rounded-[14px] overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.8fr_1fr_1.6fr_.9fr_.9fr_1.2fr] gap-3 px-[18px] py-[11px] border-b border-line font-mono text-[9.5px] font-bold uppercase tracking-[.12em] text-ink3">
            <span>Tenant</span><span>Messages</span><span>vs cap</span><span>Tokens</span><span>Cost</span><span>Alerts</span>
          </div>
          {sorted.map((u) => {
            const pct = u.cap ? Math.round((u.msgs / u.cap) * 100) : 0;
            const hot = pct >= 80;
            return (
              <div
                key={u.name}
                className="grid grid-cols-[1.8fr_1fr_1.6fr_.9fr_.9fr_1.2fr] gap-3 items-center px-[18px] py-3 border-b border-line"
                style={{ background: hot ? 'color-mix(in srgb, var(--am) 6%, transparent)' : 'transparent' }}
              >
                <span className="text-[12.5px] font-bold">{u.name}</span>
                <span className="text-xs text-ink2">{u.msgs.toLocaleString('en-GB')}</span>
                <span>
                  <span className="block h-1 rounded-sm bg-sunken overflow-hidden mb-[3px]">
                    <span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: hot ? 'var(--am)' : 'var(--a)' }} />
                  </span>
                  <span className="text-[10px] text-ink3">{pct}% of {u.cap.toLocaleString('en-GB')}</span>
                </span>
                <span className="text-xs text-ink2">{u.tokens}</span>
                <span className="text-[12.5px] font-bold">£{u.cost.toFixed(2)}</span>
                <span className={`text-[11px] font-bold ${u.alert === '—' ? 'text-ink3' : 'text-warn'}`}>{u.alert}</span>
              </div>
            );
          })}
          <div className="grid grid-cols-[1.8fr_1fr_1.6fr_.9fr_.9fr_1.2fr] gap-3 px-[18px] py-3 text-[12.5px] font-extrabold">
            <span>Total</span>
            <span>{totalMsgs.toLocaleString('en-GB')}</span>
            <span />
            <span>7.1M</span>
            <span>£{totalCost.toFixed(2)}</span>
            <span />
          </div>
        </div>
      </div>
    </section>
  );
}
