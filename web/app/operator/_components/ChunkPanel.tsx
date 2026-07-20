import type { Chunk } from '@/lib/operator-types';

/** Similarity colour scale from the design: ≥0.7 green, ≥0.55 amber, else red. */
export function simColor(sim: number): string {
  return sim >= 0.7 ? '#7FB894' : sim >= 0.55 ? '#D2A05A' : '#D98A75';
}

/** Dark retrieval-telemetry panel (sandbox chat + review queue). */
export function ChunkPanel({
  title,
  chunks,
  meta,
}: {
  title: string;
  chunks: Chunk[];
  meta?: string;
}) {
  return (
    <div className="bg-code rounded-[11px] px-[15px] py-[13px] flex flex-col gap-2">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: '#8A9282' }}>
        {title}
      </div>
      {chunks.map((c) => (
        <div key={c.src} className="flex flex-col gap-[3px]">
          <div className="flex justify-between gap-2">
            <span className="font-mono text-[10.5px] text-codet">{c.src}</span>
            <span className="font-mono text-[10.5px] font-bold" style={{ color: simColor(c.sim) }}>
              {c.sim.toFixed(2)}
            </span>
          </div>
          <div className="h-[3px] rounded-sm" style={{ background: 'rgba(255,255,255,.12)' }}>
            <div
              className="h-full rounded-sm"
              style={{ width: `${Math.round(c.sim * 100)}%`, background: simColor(c.sim) }}
            />
          </div>
          {c.excerpt ? (
            <div className="text-[10.5px] leading-[1.45] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: '#8A9282' }}>
              {c.excerpt}
            </div>
          ) : null}
        </div>
      ))}
      {meta ? (
        <div className="font-mono text-[9.5px] pt-[7px]" style={{ color: '#8A9282', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {meta}
        </div>
      ) : null}
    </div>
  );
}
