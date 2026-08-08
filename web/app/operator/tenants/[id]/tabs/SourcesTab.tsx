import type { Dispatch, SetStateAction } from 'react';
import { refreshSource } from '@/lib/operator-api';
import type { Source } from '@/lib/operator-types';
import { Pill, sourcePill } from '../../../../_components/Pill';
import { SOURCE_ICONS } from '../detail-ui';

export function SourcesTab({
  sources,
  drift,
  refreshing,
  setRefreshing,
  addSource,
  onChanged,
}: {
  sources: Source[];
  drift: string | null;
  refreshing: Record<string, boolean>;
  setRefreshing: Dispatch<SetStateAction<Record<string, boolean>>>;
  addSource: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="pt-[18px]">
      <div className="flex justify-end mb-3">
        <button onClick={addSource} className="px-[15px] py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110">
          + Add source
        </button>
      </div>
      <div className="bg-surface border border-line rounded-[14px] overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[2.2fr_.8fr_.9fr_1.1fr_1fr_.8fr] gap-3 px-[18px] py-[11px] border-b border-line font-mono text-[9.5px] font-bold uppercase tracking-[.12em] text-ink3">
            <span>Source</span><span>Type</span><span>Size</span><span>Status</span><span>Last synced</span><span />
          </div>
          {sources.map((src) => {
            const effective = refreshing[src.id] ? 'processing' : src.status;
            const pillDef = sourcePill[effective];
            return (
              <div key={src.id} className="grid grid-cols-[2.2fr_.8fr_.9fr_1.1fr_1fr_.8fr] gap-3 items-center px-[18px] py-3 border-b border-line">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 flex-none rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                    {SOURCE_ICONS[src.icon]}
                  </span>
                  <span className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{src.name}</span>
                </span>
                <span className="text-[11.5px] text-ink2">{src.type}</span>
                <span className="text-[11.5px] text-ink2">{src.size}</span>
                <span><Pill tone={pillDef.tone}>{pillDef.label}</Pill></span>
                <span className="text-[11.5px] text-ink3">{refreshing[src.id] ? 'refreshing…' : src.synced}</span>
                <span className="text-right">
                  <button
                    onClick={() => {
                      setRefreshing((r) => ({ ...r, [src.id]: true }));
                      refreshSource(src.id)
                        .then(() => setTimeout(onChanged, 4000))
                        .catch(() => setRefreshing((r) => ({ ...r, [src.id]: false })));
                    }}
                    className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-[11px] py-[5px] cursor-pointer hover:text-accent hover:border-accent"
                  >
                    {effective === 'processing' ? 'Refreshing…' : src.status === 'drift' ? 'Review & refresh' : 'Refresh'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {drift ? (
        <div
          className="flex gap-[9px] items-start rounded-[11px] px-[15px] py-3 mt-3"
          style={{
            background: 'color-mix(in srgb, var(--am) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--am) 30%, transparent)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--am)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
            <path d="M12 9v4M12 16.5v.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <div className="text-xs leading-relaxed text-ink2">
            <strong className="text-ink">Drift detected:</strong> {drift.replace('Drift detected: ', '')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
