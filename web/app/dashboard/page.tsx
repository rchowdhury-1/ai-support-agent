'use client';

import Link from 'next/link';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { getOverview, getSessionUser } from '@/lib/api';
import { Greeting } from './_components/Greeting';

const TONE_COLOR = { ink: 'var(--t)', good: 'var(--g)', warn: 'var(--am)' } as const;

function Sparkline({ data }: { data: number[] }) {
  const W = 300;
  const H = 84;
  const max = 16;
  const pts = data
    .map((v, i) => `${(i * (W / (data.length - 1))).toFixed(1)},${(H - 6 - (v / max) * (H - 14)).toFixed(1)}`)
    .join(' ');
  const area = `M0,${H} L${pts.split(' ').join(' L')} L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none">
      <path d={area} fill="color-mix(in srgb, var(--a) 12%, transparent)" />
      <polyline points={pts} fill="none" stroke="var(--a)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function OverviewPage() {
  const { data, error } = useData(async () => {
    const [user, o] = await Promise.all([getSessionUser(), getOverview()]);
    return { user, o };
  });
  if (error) return <LoadError message={error} />;
  if (!data) return <Loading />;
  const { user, o } = data;

  return (
    <section className="fade-up">
      <header className="pt-[34px] pb-6 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <Greeting name={user.name} />
          <div className="text-sm text-ink2">Everything is handled — here&rsquo;s {o.rangeLabel} so far.</div>
        </div>
        <div className="text-[12.5px] font-bold text-ink2 border border-line rounded-full px-[13px] py-1.5 bg-surface">
          {o.rangeLabel}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        {o.stats.map((st) => (
          <div key={st.label} className="bg-surface border border-line rounded-[14px] px-5 py-[18px]">
            <div className="text-xs font-semibold text-ink3 mb-2">{st.label}</div>
            <div className="font-serif font-semibold text-3xl leading-none" style={{ color: TONE_COLOR[st.tone] }}>
              {st.value}
            </div>
            <div className="text-[11.5px] text-ink3 mt-[7px]">{st.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        <div className="bg-surface border border-line rounded-[14px] p-5">
          <div className="flex justify-between items-center mb-3.5">
            <div className="text-[13px] font-bold">Daily conversations</div>
            <div className="text-[11.5px] text-ink3">July</div>
          </div>
          <Sparkline data={o.spark} />
          <div className="flex justify-between text-[10.5px] text-ink3 mt-1.5">
            <span>1 Jul</span>
            <span>19 Jul</span>
          </div>
        </div>
        <div
          className="bg-accent-soft rounded-[14px] p-[22px] flex flex-col gap-2.5"
          style={{ border: '1px solid color-mix(in srgb, var(--a) 24%, transparent)' }}
        >
          <div className="font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-accent">
            Latest insight report
          </div>
          <div className="font-serif italic font-medium text-[21px] leading-[1.35] text-ink">{o.reportTeaser.headline}</div>
          <div className="text-[13px] text-ink2 leading-relaxed">{o.reportTeaser.body}</div>
          <Link href="/dashboard/insights" className="btn-primary self-start mt-1 text-[13px] px-4 py-2.5 rounded-[10px]">
            Read the July report
          </Link>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-[14px] px-5 py-2">
        <div className="flex items-center justify-between py-3">
          <div className="text-[13px] font-bold">Enquiries waiting for you</div>
          <Link href="/dashboard/enquiries" className="text-[12.5px] font-bold text-accent no-underline">
            View all →
          </Link>
        </div>
        {o.waiting.map((w) => (
          <div key={w.name} className="flex items-center gap-3.5 py-3 border-t border-line">
            <div className="w-[30px] h-[30px] rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-none">
              {w.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold">{w.name}</div>
              <div className="text-[12.5px] text-ink2 whitespace-nowrap overflow-hidden text-ellipsis">
                &ldquo;{w.question}&rdquo;
              </div>
            </div>
            <div className="text-[11.5px] text-ink3 flex-none">{w.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
