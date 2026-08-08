import type { Tenant } from '@/lib/operator-types';
import { card } from '../detail-ui';

export function UsageTab({ tenant }: { tenant: Tenant }) {
  return (
    <div className="pt-[18px] grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className={`${card} flex flex-col gap-3.5`}>
        <div className="text-[13.5px] font-bold">This month</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-ink3">Messages</div>
            <div className="font-serif font-semibold text-2xl">{tenant.used.toLocaleString('en-GB')}</div>
            <div className="text-[10.5px] text-ink3">of {tenant.cap.toLocaleString('en-GB')} cap</div>
          </div>
          <div>
            <div className="text-[11px] text-ink3">Spend</div>
            <div className="font-serif font-semibold text-2xl">{tenant.cost}</div>
            <div className="text-[10.5px] text-ink3">{tenant.tokens ?? '—'} tokens</div>
          </div>
          <div>
            <div className="text-[11px] text-ink3">Avg / conversation</div>
            <div className="font-serif font-semibold text-2xl">{tenant.avgCostPerConv ?? '—'}</div>
          </div>
          <div>
            <div className="text-[11px] text-ink3">Answer rate</div>
            <div className="font-serif font-semibold text-2xl text-good">{tenant.answerRate ?? '—'}</div>
          </div>
        </div>
        <div>
          <div className="h-1.5 rounded-[3px] bg-sunken overflow-hidden">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${Math.round((tenant.used / tenant.cap) * 100)}%`, background: 'var(--a)' }}
            />
          </div>
          <div className="text-[10.5px] text-ink3 mt-[5px]">
            {Math.round((tenant.used / tenant.cap) * 100)}% of monthly cap · alert at 80%
          </div>
        </div>
      </div>
      <div className={card}>
        <div className="text-[13.5px] font-bold mb-3.5">Daily messages</div>
        <div className="flex items-end gap-1 h-[90px]">
          {(tenant.bars ?? []).map((v, i) => (
            <div key={i} className="flex-1 rounded-t-[3px] bg-accent opacity-85" style={{ height: `${v}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-ink3 mt-1.5">
          <span>14 days ago</span><span>today</span>
        </div>
      </div>
    </div>
  );
}
