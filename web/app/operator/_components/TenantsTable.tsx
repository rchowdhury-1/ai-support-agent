'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Tenant } from '@/lib/operator-types';
import { Pill, tenantPill } from '../../_components/Pill';

export function TenantsTable({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const shown = tenants.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <section className="fade-up">
      <header className="pt-[26px] pb-[18px] flex items-end gap-3.5 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <h1 className="m-0 mb-1 text-[22px] font-bold tracking-[-.02em]">Tenants</h1>
          <div className="text-[13px] text-ink2">
            {tenants.length} tenants · £54.90 spend this month ·{' '}
            <span className="text-warn font-bold">2 need attention</span>
          </div>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tenants…"
          className="px-[13px] py-[9px] border border-line rounded-[9px] bg-surface text-ink text-[12.5px] outline-none focus:border-accent w-[200px]"
        />
      </header>

      <div className="bg-surface border border-line rounded-[14px] overflow-x-auto">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[2fr_.9fr_.7fr_1.3fr_.7fr_.9fr_1fr] gap-3 px-[18px] py-[11px] border-b border-line font-mono text-[9.5px] font-bold uppercase tracking-[.12em] text-ink3">
            <span>Tenant</span><span>Status</span><span>Model</span><span>Messages / cap</span>
            <span>Cost</span><span>Last activity</span><span>Awaiting review</span>
          </div>
          {shown.map((t) => {
            const pill = tenantPill[t.status];
            const pct = Math.round((t.used / t.cap) * 100);
            const attention = t.flags > 0 || t.status === 'pending';
            const awaiting =
              t.status === 'pending'
                ? `onboarding · step ${t.onboardingStep ?? 1}`
                : t.flags || t.insights
                  ? `${t.flags} flags · ${t.insights} insights`
                  : '—';
            return (
              <button
                key={t.id}
                onClick={() =>
                  t.status === 'pending'
                    ? router.push(`/operator/onboarding?step=${t.onboardingStep ?? 1}`)
                    : router.push(`/operator/tenants/${t.id}`)
                }
                className="grid grid-cols-[2fr_.9fr_.7fr_1.3fr_.7fr_.9fr_1fr] gap-3 items-center w-full px-[18px] py-[13px] border-b border-line bg-transparent text-left cursor-pointer text-ink hover:bg-sunken"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold tracking-[-.01em]">{t.name}</span>
                  <span className="block text-[11.5px] text-ink3">{t.domain}</span>
                </span>
                <span><Pill tone={pill.tone}>{pill.label}</Pill></span>
                <span className="text-xs font-semibold text-ink2">{t.model}</span>
                <span>
                  <span className="block text-[11px] text-ink2 mb-1">
                    {t.used.toLocaleString('en-GB')} / {t.cap.toLocaleString('en-GB')}
                  </span>
                  <span className="block h-1 rounded-sm bg-sunken overflow-hidden">
                    <span
                      className="block h-full rounded-sm"
                      style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--am)' : 'var(--a)' }}
                    />
                  </span>
                </span>
                <span className="text-[12.5px] font-bold">{t.cost}</span>
                <span className="text-xs text-ink2">{t.last}</span>
                <span className={`text-xs ${attention ? 'text-warn font-bold' : 'text-ink3'}`}>{awaiting}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-[11.5px] text-ink3 mt-2.5">Row click opens the tenant. Alerts fire at 80% of any cap.</div>
    </section>
  );
}
