import Link from 'next/link';
import { listInsightMonths } from '@/lib/api';
import { insightPill, Pill } from '../../_components/Pill';

export const metadata = { title: 'Insights — SupportAI' };

function SummaryCard({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-surface border border-line rounded-[14px] px-5 py-[18px]">
      <div className="text-xs font-semibold text-ink3 mb-2">{label}</div>
      {children}
      {sub ? <div className="text-[11.5px] text-ink3 mt-[7px]">{sub}</div> : null}
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const months = await listInsightMonths();
  const idx = Math.max(
    0,
    months.findIndex((m) => m.key === searchParams.month) === -1
      ? months.length - 1
      : months.findIndex((m) => m.key === searchParams.month)
  );
  const month = months[idx];
  const prev = idx > 0 ? months[idx - 1] : null;
  const next = idx < months.length - 1 ? months[idx + 1] : null;

  return (
    <section className="fade-up">
      <header className="pt-[34px] pb-6 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-accent mb-2">
            Monthly insight report
          </div>
          <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-[-.025em]">
            What your customers asked <em className="accent-em">that we couldn&rsquo;t answer.</em>
          </h1>
          <div className="text-[13.5px] text-ink2">Grouped by meaning, names removed. Compiled by Raz.</div>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-line rounded-full p-1">
          {prev ? (
            <Link href={`/dashboard/insights?month=${prev.key}`} aria-label="Previous month" className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] text-ink2 no-underline hover:bg-accent-soft">
              ‹
            </Link>
          ) : (
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] text-ink3 opacity-40">‹</span>
          )}
          <span className="text-[13px] font-bold min-w-[92px] text-center">{month.label}</span>
          {next ? (
            <Link href={`/dashboard/insights?month=${next.key}`} aria-label="Next month" className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] text-ink2 no-underline hover:bg-accent-soft">
              ›
            </Link>
          ) : (
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] text-ink3 opacity-40">›</span>
          )}
        </div>
      </header>

      {month.empty ? (
        <div className="bg-surface border border-line rounded-2xl py-14 px-6 text-center">
          <div
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'color-mix(in srgb, var(--g) 13%, transparent)', color: 'var(--g)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="text-lg font-bold tracking-[-.015em] mb-1.5">
            Nothing unanswered in {month.label.split(' ')[0]} — good sign.
          </div>
          <div className="text-[13.5px] text-ink2 max-w-[46ch] mx-auto leading-relaxed">
            Your content covered everything visitors asked. {month.emptyStats?.answered} questions were
            answered, every one with a source.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
            <SummaryCard label="Questions found" sub={month.summary!.foundSub}>
              <div className="font-serif font-semibold text-3xl leading-none">{month.summary!.found}</div>
            </SummaryCard>
            <SummaryCard label="Answers added" sub={month.summary!.addedSub}>
              <div className="font-serif font-semibold text-3xl leading-none text-good">{month.summary!.added}</div>
            </SummaryCard>
            <SummaryCard label="Answered since" sub="times, by new answers">
              <div className="font-serif font-semibold text-3xl leading-none">{month.summary!.answeredSince}</div>
            </SummaryCard>
            <SummaryCard label="Top asked topics">
              <div className="flex flex-wrap gap-[5px] mt-0.5">
                {month.summary!.topics.map((t) => (
                  <span key={t} className="text-[11px] font-bold border border-line rounded-full px-[9px] py-[3px] text-ink2">
                    {t}
                  </span>
                ))}
              </div>
            </SummaryCard>
          </div>

          <div className="bg-surface border border-line rounded-[14px] px-5 py-1.5 mb-3.5">
            {month.rows.map((r) => {
              const pill = insightPill[r.status];
              return (
                <div key={r.id} className="flex items-center gap-3.5 py-[15px] border-b border-line flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="text-[14.5px] font-semibold tracking-[-.01em]">&ldquo;{r.question}&rdquo;</div>
                    <div className="text-xs text-ink3 mt-[3px]">
                      Asked {r.count} times · {r.meta}
                    </div>
                  </div>
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                </div>
              );
            })}
            <div className="py-[13px] text-xs text-ink3">
              Statuses are set by Raz as fixes go in — &ldquo;Answer added&rdquo; means it&rsquo;s live in your assistant now.
            </div>
          </div>

          {month.beforeAfter ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-line rounded-[14px] p-5">
                <div className="font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-ink3 mb-3.5">
                  {month.beforeAfter.beforeDate}
                </div>
                <div className="pl-3.5 text-[13.5px] leading-relaxed text-ink2 italic" style={{ borderLeft: '3px solid var(--am)' }}>
                  {month.beforeAfter.beforeText}
                </div>
                <div className="text-[11.5px] text-ink3 mt-2.5">{month.beforeAfter.beforeAsked}</div>
              </div>
              <div className="bg-surface border border-line rounded-[14px] p-5">
                <div className="font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-good mb-3.5">
                  {month.beforeAfter.afterDate}
                </div>
                <div className="pl-3.5 text-[13.5px] leading-relaxed text-ink" style={{ borderLeft: '3px solid var(--g)' }}>
                  {month.beforeAfter.afterText}
                </div>
                <div className="text-[11.5px] text-ink3 mt-2.5">{month.beforeAfter.afterMeta}</div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
