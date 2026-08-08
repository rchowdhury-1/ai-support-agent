import type { Dispatch, SetStateAction } from 'react';
import { triageInsight } from '@/lib/operator-api';
import type { TriageItem } from '@/lib/operator-types';
import { Pill } from '../../../../_components/Pill';

type TriageState = Record<string, 'rev' | 'add' | 'dis'>;

export function InsightsTab({
  triage,
  triageState,
  setTriageState,
}: {
  triage: TriageItem[];
  triageState: TriageState;
  setTriageState: Dispatch<SetStateAction<TriageState>>;
}) {
  return (
    <div className="pt-[18px]">
      <div className="text-xs text-ink2 mb-3">
        What you set here is exactly what the client sees on their Insights screen.
      </div>
      <div className="bg-surface border border-line rounded-[14px] px-[18px]">
        {triage.map((t) => {
          const st = triageState[t.id];
          const pillDef =
            st === 'rev' ? { tone: 'accent' as const, label: 'Reviewed' }
            : st === 'add' ? { tone: 'good' as const, label: 'Content added ✓' }
            : st === 'dis' ? { tone: 'muted' as const, label: 'Dismissed' }
            : { tone: 'warn' as const, label: 'New' };
          return (
            <div key={t.id} className="flex items-center gap-3 py-[13px] border-b border-line flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="text-[13px] font-semibold">&ldquo;{t.question}&rdquo;</div>
                <div className="text-[11px] text-ink3 mt-0.5">asked {t.count} times · {t.meta}</div>
              </div>
              <Pill tone={pillDef.tone}>{pillDef.label}</Pill>
              <div className="flex gap-[5px]">
                <button onClick={() => { setTriageState((s) => ({ ...s, [t.id]: 'rev' })); triageInsight(t.id, 'reviewed').catch(() => undefined); }} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-accent hover:border-accent">Reviewed</button>
                <button onClick={() => { setTriageState((s) => ({ ...s, [t.id]: 'add' })); triageInsight(t.id, 'added').catch(() => undefined); }} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-good hover:border-good">Content added</button>
                <button onClick={() => { setTriageState((s) => ({ ...s, [t.id]: 'dis' })); triageInsight(t.id, 'dismissed').catch(() => undefined); }} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-bad hover:border-bad">Dismiss</button>
              </div>
            </div>
          );
        })}
        {triage.length === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-ink3">No insights yet — the agent isn&rsquo;t live.</div>
        ) : (
          <div className="py-3" />
        )}
      </div>
    </div>
  );
}
