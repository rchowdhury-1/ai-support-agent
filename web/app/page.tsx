import Link from 'next/link';
import { Nav } from './_marketing/Nav';
import { Reveal } from './_marketing/Reveal';
import { ReportPanel } from './_marketing/ReportPanel';
import { WidgetDemo } from './_marketing/WidgetDemo';
import { Pricing } from './_marketing/Pricing';
import { steps, verticals, trustIcons, trust } from './_marketing/content';

export default function Home() {
  return (
    <div id="top" className="min-h-screen">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div
          className="absolute -right-36 -top-20 w-[720px] h-[720px] pointer-events-none"
          style={{ background: 'radial-gradient(circle at 55% 42%, var(--glow), transparent 62%)' }}
        />
        <div className="container-site relative grid grid-cols-1 md:grid-cols-2 gap-14 items-center pt-[72px] pb-[88px]">
          <div className="max-w-[560px]">
            <Reveal index={0}>
              <div className="eyebrow mb-[22px]">Done-for-you AI support · UK small firms</div>
            </Reveal>
            <Reveal index={1}>
              <h1 className="display-h text-[clamp(38px,4.6vw,56px)] leading-[1.04] tracking-[-.035em] mb-[22px] [text-wrap:balance]">
                Your website, answering customers — <em className="accent-em">day and night.</em>
              </h1>
            </Reveal>
            <Reveal index={2}>
              <p className="text-[17px] leading-relaxed text-ink2 max-w-[50ch] mb-[26px] [text-wrap:pretty]">
                An assistant trained on your business&rsquo;s own content — set up for you, by a
                person. It answers politely, shows its source, and takes a message when it
                doesn&rsquo;t know.
              </p>
            </Reveal>
            <Reveal index={3}>
              <div className="flex flex-wrap gap-3 items-center mb-[26px]">
                <a href="#pricing" className="btn-primary text-[15px] px-[22px] py-[13px]">
                  Book a 15-minute call
                </a>
                <a href="#report" className="btn-ghost text-[15px] px-5 py-3">
                  See the monthly report
                </a>
              </div>
            </Reveal>
            <Reveal index={4}>
              <div className="kicker max-w-[44ch]">
                It only answers from content you&rsquo;ve approved — and it tells you what it
                couldn&rsquo;t answer.
              </div>
            </Reveal>
          </div>
          <Reveal index={1} className="justify-self-center">
            <WidgetDemo />
          </Reveal>
        </div>
      </header>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="border-t border-line">
        <div className="container-site py-[88px]">
          <Reveal index={0}>
            <div className="eyebrow mb-[18px]">How it works</div>
          </Reveal>
          <Reveal index={1}>
            <h2 className="display-h text-[clamp(30px,3.4vw,42px)] mb-[46px]">
              Three steps. <em className="accent-em">No jargon.</em>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
            {steps.map((s, i) => (
              <Reveal key={s.n} index={i}>
                <div className="card p-7 flex flex-col gap-3 h-full">
                  <div className="font-mono text-xs font-bold text-accent">{s.n}</div>
                  <div className="text-lg font-bold tracking-[-.015em]">{s.title}</div>
                  <p className="text-[14.5px] leading-[1.65] text-ink2 [text-wrap:pretty]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The monthly report ───────────────────────────── */}
      <section id="report" className="border-t border-line">
        <div className="container-site grid grid-cols-1 md:grid-cols-2 gap-14 items-center py-[88px]">
          <div className="max-w-[520px]">
            <Reveal index={0}>
              <div className="eyebrow mb-[18px]">The monthly report</div>
            </Reveal>
            <Reveal index={1}>
              <h2 className="display-h text-[clamp(30px,3.4vw,42px)] leading-[1.1] mb-5 [text-wrap:balance]">
                Every unanswered question is <em className="accent-em">a customer telling you</em>{' '}
                what&rsquo;s missing.
              </h2>
            </Reveal>
            <Reveal index={2}>
              <p className="text-base leading-[1.65] text-ink2 mb-[22px] [text-wrap:pretty]">
                We collect the questions your website couldn&rsquo;t answer, and every month we
                fix them. Last month our demo firm was missing VAT return pricing — it&rsquo;s
                now answered dozens of times a week.
              </p>
            </Reveal>
            <Reveal index={3}>
              <div className="kicker">You&rsquo;ll know what customers want before your competitors do.</div>
            </Reveal>
          </div>
          <Reveal index={1} className="justify-self-center w-[min(480px,100%)]">
            <ReportPanel />
          </Reveal>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────── */}
      <section id="who" className="border-t border-line">
        <div className="container-site py-[88px]">
          <Reveal index={0}>
            <div className="eyebrow mb-[18px]">Built for your kind of firm</div>
          </Reveal>
          <Reveal index={1}>
            <h2 className="display-h text-[clamp(30px,3.4vw,42px)] mb-[46px]">
              The same questions, <em className="accent-em">every single week.</em>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
            {verticals.map((v, i) => (
              <Reveal key={v.name} index={i}>
                <div className="card p-[26px] flex flex-col gap-3.5 h-full">
                  <div className="text-lg font-bold tracking-[-.015em]">{v.name}</div>
                  <p className="text-[13.5px] leading-[1.55] text-ink2 italic">{v.pain}</p>
                  <div className="flex flex-col gap-2 mt-0.5">
                    {v.qs.map((q) => (
                      <div key={q} className="flex gap-[9px] items-start border border-line bg-page rounded-[10px] px-3 py-[9px]">
                        <span className="font-serif italic text-accent text-[15px] leading-[1.3] flex-none">&ldquo;</span>
                        <span className="text-[13px] leading-normal text-ink2">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────── */}
      <section id="trust" className="border-t border-line">
        <div className="container-site py-[88px]">
          <div className="max-w-[640px]">
            <Reveal index={0}>
              <div className="eyebrow mb-[18px]">Why it won&rsquo;t embarrass you</div>
            </Reveal>
            <Reveal index={1}>
              <h2 className="display-h text-[clamp(30px,3.4vw,42px)] mb-4">
                It doesn&rsquo;t guess. <em className="accent-em">Ever.</em>
              </h2>
            </Reveal>
            <Reveal index={2}>
              <p className="text-base leading-relaxed text-ink2 mb-11 [text-wrap:pretty]">
                Your clients trust you because you&rsquo;re careful. Your assistant should be
                held to the same standard.
              </p>
            </Reveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
            {trust.map((tItem, i) => (
              <Reveal key={tItem.title} index={i}>
                <div className="card p-[26px] flex flex-col gap-3 h-full">
                  <div className="w-[38px] h-[38px] rounded-[11px] bg-accent-soft text-accent flex items-center justify-center">
                    {trustIcons[tItem.icon]}
                  </div>
                  <div className="text-base font-bold tracking-[-.01em]">{tItem.title}</div>
                  <p className="text-sm leading-relaxed text-ink2 [text-wrap:pretty]">{tItem.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <Pricing />

      {/* ── Note from the maker ──────────────────────────── */}
      <section id="maker" className="border-t border-line">
        <div className="max-w-[900px] mx-auto px-6 py-[88px]">
          <Reveal index={0}>
            <div className="flex gap-7 items-start flex-wrap">
              <div className="w-[76px] h-[76px] rounded-full bg-accent-soft text-accent flex items-center justify-center font-serif italic text-3xl flex-none">
                R
              </div>
              <div className="flex-1 min-w-[280px]">
                <div className="eyebrow mb-4">A note from the maker</div>
                <p className="font-serif italic font-medium text-[clamp(21px,2.6vw,26px)] leading-[1.4] tracking-[-.01em] text-ink mb-[18px] [text-wrap:pretty]">
                  &ldquo;I build your website, and I build your assistant. If something&rsquo;s
                  wrong, you ring me — not a ticket queue.&rdquo;
                </p>
                <p className="text-[15px] leading-[1.65] text-ink2 max-w-[60ch] mb-5 [text-wrap:pretty]">
                  SupportAI is run by one person — me. I load your content myself, check the
                  source behind every answer, and write your monthly report by hand. You deal
                  with someone who actually knows your business.
                </p>
                <div className="flex items-center gap-2.5 flex-wrap mb-6">
                  <span className="text-[15px] font-bold">Razwanul Chowdhury</span>
                  <span className="text-[13.5px] text-ink3">— builds websites &amp; assistants for small UK firms</span>
                </div>
                <a href="#pricing" className="btn-primary text-[14.5px] px-5 py-3">
                  Book a 15-minute call
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="container-site py-7 flex items-center gap-[18px] flex-wrap">
          <span className="w-[22px] h-[22px] rounded-md bg-accent text-accent-ink flex items-center justify-center font-serif italic text-[13px]">
            S
          </span>
          <span className="text-[13px] font-bold">SupportAI</span>
          <span className="text-[12.5px] text-ink3">Made by Razwanul Chowdhury</span>
          <span className="flex-1" />
          <a href="#top" className="text-[12.5px] text-ink3 no-underline hover:text-ink">Privacy</a>
          <a href="#top" className="text-[12.5px] text-ink3 no-underline hover:text-ink">Terms</a>
          <Link href="/login" className="text-[12.5px] text-ink3 no-underline hover:text-ink">Client login</Link>
        </div>
      </footer>
    </div>
  );
}
