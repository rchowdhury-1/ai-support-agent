'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The insight-report demonstration: question cards accumulate and flip from
 * "Couldn't answer" to "Answer added ✓" on a loop. Logic ported 1:1 from the
 * approved Claude Design component; reduced-motion shows the static panel.
 */

type RowStatus = 'new' | 'fix' | 'done';
interface Row {
  q: string;
  count: number;
  st: RowStatus;
}
interface ReportData {
  rows: Row[];
  found: number;
  added: number;
}

const initRows = (): Row[] => [
  { q: 'Do you do payroll for small teams?', count: 6, st: 'done' },
  { q: 'What do you charge for VAT returns?', count: 4, st: 'fix' },
  { q: 'Can you help with a late tax return?', count: 3, st: 'new' },
];
const initData = (): ReportData => ({ rows: initRows(), found: 9, added: 5 });

const PILL: Record<RowStatus, { tx: string; fg: string; bg: string }> = {
  done: { tx: 'Answer added ✓', fg: 'var(--g)', bg: 'color-mix(in srgb, var(--g) 13%, transparent)' },
  fix: { tx: 'Being fixed', fg: 'var(--a)', bg: 'color-mix(in srgb, var(--a) 12%, transparent)' },
  new: { tx: "Couldn't answer", fg: 'var(--am)', bg: 'color-mix(in srgb, var(--am) 14%, transparent)' },
};

export function ReportPanel() {
  const [data, setData] = useState<ReportData>(initData);
  const live = useRef<ReportData>(initData());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    const steps: ((d: ReportData) => void)[] = [
      (d) => { d.rows[2].count = 4; },
      (d) => { d.rows[1].st = 'done'; d.added++; },
      (d) => { d.rows.push({ q: 'Are you taking on new clients?', count: 2, st: 'new' }); d.found++; },
      (d) => { d.rows[2].st = 'fix'; },
      (d) => { d.rows[3].count = 3; },
      (d) => { d.rows[2].st = 'done'; d.added++; },
      (d) => { d.rows.push({ q: 'Do you work with CIS subcontractors?', count: 2, st: 'new' }); d.found++; },
    ];

    const run = (i: number) => {
      if (i >= steps.length) {
        t(() => {
          live.current = initData();
          setData(initData());
          t(() => run(0), 2200);
        }, 3600);
        return;
      }
      steps[i](live.current);
      setData({ rows: [...live.current.rows.map((r) => ({ ...r }))], found: live.current.found, added: live.current.added });
      t(() => run(i + 1), 2000);
    };

    t(() => run(0), 2400);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-surface border border-line rounded-[18px] overflow-hidden shadow-[0_24px_60px_-28px_rgba(24,33,28,.3)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
        <div className="font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-ink3">
          Unanswered this month
        </div>
        <div className="text-xs font-bold text-ink2 border border-line rounded-full px-[11px] py-1">July 2026</div>
      </div>
      <div className="flex gap-[26px] px-5 pt-[18px] pb-1">
        <div>
          <div className="font-serif font-semibold text-[32px] leading-none text-ink">{data.found}</div>
          <div className="text-[11.5px] text-ink3 mt-1">questions found</div>
        </div>
        <div className="w-px bg-line" />
        <div>
          <div className="font-serif font-semibold text-[32px] leading-none text-good">{data.added}</div>
          <div className="text-[11.5px] text-ink3 mt-1">answers added</div>
        </div>
      </div>
      <div className="flex flex-col gap-[9px] px-4 pt-4 pb-[18px]">
        {data.rows.slice(-4).map((r) => {
          const pill = PILL[r.st];
          return (
            <div
              key={r.q}
              className="flex items-center gap-3 border border-line rounded-xl px-[14px] py-3 bg-page"
              style={{ animation: 'rowIn .5s ease both' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold tracking-[-.01em] text-ink">{r.q}</div>
                <div className="text-[11.5px] text-ink3 mt-0.5">Asked {r.count} times</div>
              </div>
              <span
                className="flex-none text-[11px] font-bold px-[10px] py-[5px] rounded-full whitespace-nowrap"
                style={{ background: pill.bg, color: pill.fg, transition: 'background .45s ease, color .45s ease' }}
              >
                {pill.tx}
              </span>
            </div>
          );
        })}
        <div className="text-xs text-ink3 px-1 pt-1.5 leading-normal">
          From June&rsquo;s report: VAT return pricing added — answered 40 times since.
        </div>
      </div>
    </div>
  );
}
