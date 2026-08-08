import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { CrawlPage } from '@/lib/operator-types';
import { card, crawlStatusPill, input, primaryBtn } from '../onboarding-ui';

export function Step2Ingest({
  crawlUrl,
  setCrawlUrl,
  crawling,
  crawl,
  fileRef,
  onPdfPicked,
  pasteText,
  pages,
  skipped,
  setSkipped,
  ingesting,
  ingestSelected,
  ingested,
  setStep,
}: {
  crawlUrl: string;
  setCrawlUrl: Dispatch<SetStateAction<string>>;
  crawling: boolean;
  crawl: () => void;
  fileRef: RefObject<HTMLInputElement>;
  onPdfPicked: (file: File | undefined) => void;
  pasteText: () => void;
  pages: CrawlPage[] | null;
  skipped: Record<string, boolean>;
  setSkipped: Dispatch<SetStateAction<Record<string, boolean>>>;
  ingesting: boolean;
  ingestSelected: () => void;
  ingested: number;
  setStep: (n: number) => void;
}) {
  return (
    <div className={`${card} gap-4`}>
      <div className="text-[15px] font-bold">Ingest content</div>
      <div className="flex gap-2 flex-wrap">
        <input
          className={`${input} flex-1 min-w-[240px] font-mono text-[12.5px]`}
          value={crawlUrl}
          onChange={(e) => setCrawlUrl(e.target.value)}
          placeholder="https://kentishheating.co.uk"
        />
        <button onClick={crawl} disabled={crawling} className={primaryBtn.replace('self-start ', '')}>
          {crawling ? 'Crawling…' : pages ? 'Re-crawl' : 'Crawl site'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onPdfPicked(e.target.files?.[0])}
        />
        <button onClick={() => fileRef.current?.click()} className="px-3.5 py-2.5 border border-line-strong rounded-[9px] bg-transparent text-ink text-[12.5px] font-bold cursor-pointer hover:border-accent">
          + Add PDF
        </button>
        <button onClick={pasteText} className="px-3.5 py-2.5 border border-line-strong rounded-[9px] bg-transparent text-ink text-[12.5px] font-bold cursor-pointer hover:border-accent">
          + Paste text
        </button>
      </div>
      {!pages ? (
        <div className="border border-dashed border-line-strong rounded-xl px-5 py-[34px] text-center">
          <div className="text-[13.5px] font-bold mb-1">
            {ingested > 0 ? `${ingested} source${ingested === 1 ? '' : 's'} ingesting` : 'Nothing ingested yet'}
          </div>
          <div className="text-[12.5px] text-ink2">
            Crawl the site — pages appear here as a checklist for you to prune.
          </div>
          {ingested > 0 ? (
            <button onClick={() => setStep(3)} className={`${primaryBtn} mt-4 self-center`}>
              Continue →
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="flex justify-between gap-2.5 px-4 py-2.5 bg-sunken text-[11.5px] font-bold text-ink2">
              <span>
                {pages.length} pages found · {pages.filter((p) => !skipped[p.id]).length} selected
              </span>
              <span>{ingested > 0 ? `${ingested} ingesting` : 'nothing ingested yet'}</span>
            </div>
            {pages.map((p) => {
              const off = skipped[p.id] ?? false;
              const st = off ? crawlStatusPill.skipped : crawlStatusPill.queued;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-line">
                  <button
                    onClick={() => setSkipped((s) => ({ ...s, [p.id]: !off }))}
                    aria-label={`Toggle ${p.title}`}
                    className="w-[17px] h-[17px] flex-none rounded-[5px] cursor-pointer flex items-center justify-center p-0"
                    style={{
                      border: `1.5px solid ${off ? 'var(--bs)' : 'var(--a)'}`,
                      background: off ? 'transparent' : 'var(--a)',
                      color: 'var(--ai)',
                    }}
                  >
                    {!off && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: off ? 'var(--t3)' : 'var(--t)' }}>{p.title}</span>
                    <span className="block font-mono text-[10.5px] text-ink3">{p.path}</span>
                  </span>
                  <span className="text-[11px] text-ink3 flex-none">{p.chunks}</span>
                  <span className="flex-none text-[10.5px] font-bold px-[9px] py-[3px] rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                    {st.tx}
                  </span>
                </div>
              );
            })}
          </div>
          <button onClick={ingestSelected} disabled={ingesting} className={primaryBtn}>
            {ingesting ? 'Starting ingest…' : 'Ingest selected — continue →'}
          </button>
        </>
      )}
    </div>
  );
}
