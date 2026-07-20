'use client';

import { useState } from 'react';
import { demoCrawlPages, embedSnippets, sandboxAnswer } from '@/lib/operator-data';
import type { SandboxAnswer } from '@/lib/operator-types';
import { ChunkPanel } from '../_components/ChunkPanel';

/**
 * 6-step onboarding wizard (Kentish Heating Co walkthrough from the design).
 * All state is local mock; v2 endpoints noted per step. The point of the flow:
 * started 11:20 — live the same day.
 */

const STEPS = ['Create', 'Ingest', 'Agent', 'Sandbox', 'Embed', 'Billing'];

const label = 'flex flex-col gap-1.5 text-xs font-bold text-ink2';
const input =
  'px-3 py-2.5 border border-line rounded-[9px] bg-page text-ink text-[13px] outline-none focus:border-accent font-sans font-normal';
const card = 'bg-surface border border-line rounded-[14px] p-6 flex flex-col';
const primaryBtn =
  'self-start px-[18px] py-2.5 border-none rounded-[10px] bg-accent text-accent-ink text-[13px] font-bold cursor-pointer hover:brightness-110';

type SandboxTurn = { id: number; role: 'user' | 'bot'; text: string; answer?: SandboxAnswer };

const crawlStatusPill = {
  done: { tx: 'Ingested ✓', color: 'var(--g)', bg: 'color-mix(in srgb, var(--g) 13%, transparent)' },
  processing: { tx: 'Processing…', color: 'var(--a)', bg: 'color-mix(in srgb, var(--a) 12%, transparent)' },
  queued: { tx: 'Queued', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 14%, transparent)' },
  skipped: { tx: 'Skipped', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 12%, transparent)' },
} as const;

export function Wizard({ initialStep }: { initialStep: number }) {
  const [step, setStep] = useState(Math.min(6, Math.max(1, initialStep)));
  const [crawled, setCrawled] = useState(initialStep > 2);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({ c7: true });
  const [turns, setTurns] = useState<SandboxTurn[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [embedTab, setEmbedTab] = useState<'html' | 'next' | 'wp'>('html');
  const [copied, setCopied] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setSandboxInput('');
    setTurns((t) => [
      ...t,
      { id: t.length * 2, role: 'user', text },
      { id: t.length * 2 + 1, role: 'bot', text: '', answer: sandboxAnswer(text) },
    ]);
    // v2: POST /api/admin/tenants/:id/sandbox — real retrieval + generation
  };

  return (
    <section className="fade-up max-w-[980px]">
      <header className="pt-[26px] pb-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.02em]">New tenant — Kentish Heating Co</h1>
          <span className="text-xs text-ink3">started 11:20 · target: live today</span>
        </div>
      </header>

      {/* Step chips */}
      <div className="flex gap-1.5 flex-wrap pt-4 pb-5">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const cur = n === step;
          return (
            <button
              key={s}
              onClick={() => setStep(n)}
              className="flex items-center gap-2 rounded-full text-xs font-bold px-[13px] py-[7px] cursor-pointer"
              style={{
                border: `1px solid ${cur ? 'var(--a)' : done ? 'color-mix(in srgb, var(--a) 30%, transparent)' : 'var(--b)'}`,
                background: cur ? 'var(--a)' : done ? 'var(--asf)' : 'transparent',
                color: cur ? 'var(--ai)' : done ? 'var(--a)' : 'var(--t3)',
              }}
            >
              {done ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="font-mono text-[10px]">{n}</span>
              )}
              {s}
            </button>
          );
        })}
      </div>

      {/* Step 1 — Create */}
      {step === 1 && (
        <div className={`${card} gap-4 max-w-[560px]`}>
          <div className="text-[15px] font-bold">Create tenant</div>
          <label className={label}>Business name<input className={input} defaultValue="Kentish Heating Co" /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={label}>Contact<input className={input} defaultValue="Dan Kentish" /></label>
            <label className={label}>Email<input className={input} defaultValue="dan@kentishheating.co.uk" /></label>
          </div>
          <div className={label}>
            Vertical
            <span className="flex gap-1.5 flex-wrap">
              {['Accountancy', 'Law', 'Trades ✓'].map((v) => (
                <span
                  key={v}
                  className="text-xs font-bold rounded-full px-3 py-1.5"
                  style={
                    v.includes('✓')
                      ? { border: '1px solid var(--a)', color: 'var(--a)', background: 'var(--asf)' }
                      : { border: '1px solid var(--b)', color: 'var(--t2)' }
                  }
                >
                  {v}
                </span>
              ))}
            </span>
          </div>
          <button onClick={() => setStep(2)} className={primaryBtn}>Create &amp; continue →</button>
        </div>
      )}

      {/* Step 2 — Ingest */}
      {step === 2 && (
        <div className={`${card} gap-4`}>
          <div className="text-[15px] font-bold">Ingest content</div>
          <div className="flex gap-2 flex-wrap">
            <input className={`${input} flex-1 min-w-[240px] font-mono text-[12.5px]`} defaultValue="https://kentishheating.co.uk" />
            <button onClick={() => setCrawled(true)} className={primaryBtn.replace('self-start ', '')}>
              {crawled ? 'Re-crawl' : 'Crawl site'}
            </button>
            <button className="px-3.5 py-2.5 border border-line-strong rounded-[9px] bg-transparent text-ink text-[12.5px] font-bold cursor-pointer hover:border-accent">+ Add PDF</button>
            <button className="px-3.5 py-2.5 border border-line-strong rounded-[9px] bg-transparent text-ink text-[12.5px] font-bold cursor-pointer hover:border-accent">+ Paste text</button>
          </div>
          {!crawled ? (
            <div className="border border-dashed border-line-strong rounded-xl px-5 py-[34px] text-center">
              <div className="text-[13.5px] font-bold mb-1">Nothing ingested yet</div>
              <div className="text-[12.5px] text-ink2">Crawl the site — pages appear here as a checklist for you to prune.</div>
            </div>
          ) : (
            <>
              <div className="border border-line rounded-xl overflow-hidden">
                <div className="flex justify-between gap-2.5 px-4 py-2.5 bg-sunken text-[11.5px] font-bold text-ink2">
                  <span>7 pages found · {7 - Object.values(skipped).filter(Boolean).length} selected</span>
                  <span>142 chunks · ~£0.04 to embed</span>
                </div>
                {demoCrawlPages.map((p) => {
                  const off = skipped[p.id] ?? p.status === 'skipped';
                  const st = off ? crawlStatusPill.skipped : crawlStatusPill[p.status];
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
              <button onClick={() => setStep(3)} className={primaryBtn}>Looks right — continue →</button>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Agent setup */}
      {step === 3 && (
        <div className={`${card} gap-[18px]`}>
          <div className="text-[15px] font-bold">Agent setup</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            <div className="flex flex-col gap-3.5">
              <label className={label}>Agent name<input className={input} defaultValue="Kentish Heating assistant" /></label>
              <label className={label}>
                System prompt
                <textarea
                  rows={7}
                  className={`${input} font-mono text-[11.5px] leading-[1.6] resize-y`}
                  defaultValue="You are the website assistant for Kentish Heating Co, a Gas Safe registered heating firm in Kent. Answer only from the provided context. Quote prices exactly as written. If the context doesn't contain the answer, say so plainly and offer to take the visitor's details. Keep answers under 80 words, plain British English, no jargon."
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Model</span>
                <div className="flex gap-2 flex-wrap">
                  <span className="flex flex-col gap-0.5 rounded-[10px] px-[13px] py-[9px]" style={{ border: '1px solid var(--a)', background: 'var(--asf)' }}>
                    <span className="text-[12.5px] font-bold text-accent">Haiku ✓ default</span>
                    <span className="text-[10.5px] text-ink2">~£0.01 / conversation</span>
                  </span>
                  <span className="flex flex-col gap-0.5 border border-line rounded-[10px] px-[13px] py-[9px]">
                    <span className="text-[12.5px] font-bold text-ink2">Sonnet</span>
                    <span className="text-[10.5px] text-ink3">for tricky content · 4×</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Widget accent · theme</span>
                <div className="flex gap-[7px] items-center flex-wrap">
                  <span className="w-[26px] h-[26px] rounded-lg" style={{ background: '#B3552E', border: '2px solid var(--t)' }} />
                  <span className="w-[26px] h-[26px] rounded-lg" style={{ background: '#2D5A44' }} />
                  <span className="w-[26px] h-[26px] rounded-lg" style={{ background: '#1F3A5F' }} />
                  <span className="w-[26px] h-[26px] rounded-lg" style={{ background: '#53387A' }} />
                  <span className="w-px h-5 bg-line mx-1" />
                  <span className="text-[11.5px] font-bold rounded-full px-[11px] py-1" style={{ border: '1px solid var(--a)', color: 'var(--a)', background: 'var(--asf)' }}>Light ✓</span>
                  <span className="text-[11.5px] font-bold border border-line text-ink2 rounded-full px-[11px] py-1">Dark</span>
                </div>
              </div>
              <div className={label}>
                Allowed domains
                <span className="flex gap-1.5 flex-wrap">
                  <span className="font-mono text-[11px] border border-line rounded-full px-2.5 py-1 text-ink2 font-normal">kentishheating.co.uk</span>
                  <span className="font-mono text-[11px] border border-line rounded-full px-2.5 py-1 text-ink2 font-normal">www.kentishheating.co.uk</span>
                  <span className="text-[11px] border border-dashed border-line-strong rounded-full px-2.5 py-1 text-ink3 font-normal">+ add</span>
                </span>
              </div>
              <label className={label}>Disclaimer line<input className={input} defaultValue="Estimates are indicative until we've seen the job." /></label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Caps</span>
                <div className="grid grid-cols-3 gap-2">
                  {[['MONTHLY', '1,000'], ['DAILY', '80'], ['PER SESSION', '12']].map(([capLabel, v]) => (
                    <label key={capLabel} className="flex flex-col gap-1 text-[10.5px] font-bold text-ink3">
                      {capLabel}
                      <input className={`${input} px-2.5 py-2 text-[12.5px]`} defaultValue={v} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(4)} className={primaryBtn}>Save — test it →</button>
        </div>
      )}

      {/* Step 4 — Sandbox */}
      {step === 4 && (
        <div className={`${card} gap-3.5`}>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[15px] font-bold">Sandbox test chat</span>
            <span className="text-xs text-ink3">not live — answers show full retrieval detail</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["What's your call-out charge?", 'How much is a boiler service?', 'Do you service oil boilers? (refusal)'].map((preset) => (
              <button
                key={preset}
                onClick={() => ask(preset.replace(' (refusal)', ''))}
                className="border border-line rounded-full bg-transparent text-accent text-xs font-bold px-3 py-1.5 cursor-pointer hover:bg-accent-soft hover:border-accent"
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="border border-line rounded-xl bg-sunken p-4 flex flex-col gap-3 min-h-[180px]">
            {turns.length === 0 && (
              <div className="text-[12.5px] text-ink3 text-center py-9">
                Ask something, or use a preset — tune the prompt until the answers feel right.
              </div>
            )}
            {turns.map((t) =>
              t.role === 'user' ? (
                <div key={t.id} className="self-end max-w-[70%] bg-accent text-accent-ink px-3 py-2 text-[12.5px] leading-normal" style={{ borderRadius: '12px 12px 4px 12px' }}>
                  {t.text}
                </div>
              ) : (
                <div key={t.id} className="self-stretch grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                  <div className="bg-surface border border-line px-[13px] py-[11px]" style={{ borderRadius: '12px 12px 12px 4px' }}>
                    <div className="text-[12.5px] leading-relaxed">{t.answer!.text}</div>
                    <div className="text-[10.5px] text-ink3 mt-[7px]">{t.answer!.srcLine}</div>
                  </div>
                  <ChunkPanel title="Retrieval" chunks={t.answer!.chunks} meta={t.answer!.meta} />
                </div>
              )
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={sandboxInput}
              onChange={(e) => setSandboxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask(sandboxInput)}
              placeholder="Test a question against the new agent…"
              className={`${input} flex-1 min-w-[200px] rounded-[10px]`}
            />
            <button onClick={() => ask(sandboxInput)} className={primaryBtn.replace('self-start ', '')}>Send</button>
            <button onClick={() => setStep(5)} className="px-4 py-2.5 border border-line-strong rounded-[10px] bg-transparent text-ink text-[13px] font-bold cursor-pointer hover:border-accent">
              Answers look right →
            </button>
          </div>
        </div>
      )}

      {/* Step 5 — Embed */}
      {step === 5 && (
        <div className={`${card} gap-3.5 max-w-[760px]`}>
          <div className="text-[15px] font-bold">Embed the widget</div>
          <div className="flex gap-1">
            {(Object.keys(embedSnippets) as Array<keyof typeof embedSnippets>).map((k) => (
              <button
                key={k}
                onClick={() => { setEmbedTab(k as 'html' | 'next' | 'wp'); setCopied(false); }}
                className="bg-transparent text-[12.5px] font-bold px-3 py-2 cursor-pointer border-0"
                style={{
                  borderBottom: `2px solid ${embedTab === k ? 'var(--a)' : 'transparent'}`,
                  color: embedTab === k ? 'var(--a)' : 'var(--t3)',
                }}
              >
                {embedSnippets[k].label}
              </button>
            ))}
          </div>
          <div className="relative bg-code rounded-xl px-[18px] pt-[18px] pb-4">
            <pre className="m-0 font-mono text-[11.5px] leading-[1.7] text-codet whitespace-pre-wrap break-words">
              {embedSnippets[embedTab].code}
            </pre>
            <button
              onClick={() => {
                try { navigator.clipboard.writeText(embedSnippets[embedTab].code); } catch { /* clipboard unavailable */ }
                setCopied(true);
              }}
              className="absolute top-2.5 right-2.5 rounded-lg text-[11px] font-bold px-[11px] py-1.5 cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: '#D8DCCB' }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <div className="text-xs text-ink2 leading-relaxed">{embedSnippets[embedTab].note}</div>
          <button onClick={() => setStep(6)} className={primaryBtn}>Embedded — set up billing →</button>
        </div>
      )}

      {/* Step 6 — Billing */}
      {step === 6 && (
        <div className={`${card} gap-4 max-w-[560px]`}>
          <div className="text-[15px] font-bold">Billing &amp; go-live</div>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Setup fee<input className={input} defaultValue="£400" /></label>
            <label className={label}>Monthly<input className={input} defaultValue="£89" /></label>
          </div>
          {!linkSent ? (
            <button onClick={() => setLinkSent(true)} className={primaryBtn}>Send payment link</button>
          ) : (
            <div
              className="flex gap-[9px] items-start rounded-[11px] px-[15px] py-[13px] fade-up"
              style={{
                background: 'color-mix(in srgb, var(--g) 11%, transparent)',
                border: '1px solid color-mix(in srgb, var(--g) 30%, transparent)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <div className="text-[12.5px] leading-relaxed">
                <strong>Payment link emailed to dan@kentishheating.co.uk.</strong>
                <br />
                Tenant flips to Active the moment it&rsquo;s paid — widget stays in contact-form mode until then.
              </div>
            </div>
          )}
          <div className="text-xs text-ink3 border-t border-line pt-3.5">
            Started 11:20 — live the same day. That&rsquo;s the whole point.
          </div>
        </div>
      )}
    </section>
  );
}
