'use client';

import { useRef, useState } from 'react';
import {
  addSiteSources,
  addTextSource,
  crawlSite,
  createTenant,
  provisionClientUser,
  runSandbox,
  sendPaymentLink,
  updateAgent,
  uploadPdfSource,
  type SandboxResult,
} from '@/lib/operator-api';
import type { CrawlPage } from '@/lib/operator-types';
import { ChunkPanel } from '../_components/ChunkPanel';

/**
 * 6-step onboarding wizard, fully live against the v2 backend. The point of
 * the flow: started 11:20 — live the same day.
 */

const STEPS = ['Create', 'Ingest', 'Agent', 'Sandbox', 'Embed', 'Billing'];

const label = 'flex flex-col gap-1.5 text-xs font-bold text-ink2';
const input =
  'px-3 py-2.5 border border-line rounded-[9px] bg-page text-ink text-[13px] outline-none focus:border-accent font-sans font-normal';
const card = 'bg-surface border border-line rounded-[14px] p-6 flex flex-col';
const primaryBtn =
  'self-start px-[18px] py-2.5 border-none rounded-[10px] bg-accent text-accent-ink text-[13px] font-bold cursor-pointer hover:brightness-110 disabled:opacity-60';

const API_URL =
  process.env.NEXT_PUBLIC_SUPPORTAI_API_URL || 'https://ai-support-agent-backend-xsoi.onrender.com';
const WIDGET_URL = process.env.NEXT_PUBLIC_WIDGET_URL || 'https://supportai-web-rc-1.vercel.app/widget/v2.js';

const ACCENTS = ['#B3552E', '#2D5A44', '#1F3A5F', '#53387A'];

type SandboxTurn = { id: number; role: 'user' | 'bot'; text: string; answer?: SandboxResult | 'pending' };

function embedSnippets(agentId: string): Record<'html' | 'next' | 'wp', { label: string; code: string; note: string }> {
  const attrs = `data-agent-id="${agentId}"\n  data-api-url="${API_URL}"`;
  return {
    html: {
      label: 'HTML',
      code: `<script src="${WIDGET_URL}"\n  ${attrs}\n  defer></script>`,
      note: 'Paste before the closing </body> tag on every page the widget should appear on.',
    },
    next: {
      label: 'Next.js',
      code: `import Script from 'next/script';\n\n<Script\n  src="${WIDGET_URL}"\n  ${attrs.replace(/\n  /g, '\n  ')}\n  strategy="lazyOnload"\n/>`,
      note: 'Drop into app/layout.tsx inside <body>, after {children}.',
    },
    wp: {
      label: 'WordPress',
      code: `<script src="${WIDGET_URL}"\n  ${attrs}\n  defer></script>`,
      note: 'Appearance → Theme file editor → footer.php, before </body>. Or use any "insert headers & footers" plugin.',
    },
  };
}

const crawlStatusPill = {
  done: { tx: 'Ingested ✓', color: 'var(--g)', bg: 'color-mix(in srgb, var(--g) 13%, transparent)' },
  processing: { tx: 'Processing…', color: 'var(--a)', bg: 'color-mix(in srgb, var(--a) 12%, transparent)' },
  queued: { tx: 'Queued', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 14%, transparent)' },
  skipped: { tx: 'Skipped', color: 'var(--t3)', bg: 'color-mix(in srgb, var(--t3) 12%, transparent)' },
} as const;

export function Wizard({ initialStep, initialTenantId }: { initialStep: number; initialTenantId?: string }) {
  const [step, setStepRaw] = useState(Math.min(6, Math.max(1, initialStep)));
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId ?? null);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [bizName, setBizName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Step 2
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [pages, setPages] = useState<CrawlPage[] | null>(null);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [ingesting, setIngesting] = useState(false);
  const [ingested, setIngested] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [agentName, setAgentName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState<'haiku' | 'sonnet'>('haiku');
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [domains, setDomains] = useState<string[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [capMonthly, setCapMonthly] = useState('1000');
  const [capDaily, setCapDaily] = useState('80');
  const [capSession, setCapSession] = useState('12');
  const [savingAgent, setSavingAgent] = useState(false);

  // Step 4
  const [turns, setTurns] = useState<SandboxTurn[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');

  // Step 5/6
  const [embedTab, setEmbedTab] = useState<'html' | 'next' | 'wp'>('html');
  const [copied, setCopied] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [monthly, setMonthly] = useState('99');
  const [setupFee, setSetupFee] = useState('500');
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  const setStep = (n: number) => {
    setStepRaw(n);
    setError(null);
    if (tenantId) updateAgent(tenantId, { onboardingStep: n }).catch(() => undefined);
  };

  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Something went wrong');

  const create = async () => {
    if (!bizName.trim()) return setError('Business name is required');
    setCreating(true);
    setError(null);
    try {
      const r = await createTenant({ name: bizName.trim(), contactName, contactEmail });
      setTenantId(r.tenantId);
      setAgentId(r.agentId);
      setAgentName(`${bizName.trim()} assistant`);
      setStepRaw(2);
    } catch (err) {
      fail(err);
    } finally {
      setCreating(false);
    }
  };

  const crawl = async () => {
    if (!tenantId || !crawlUrl.trim()) return;
    setCrawling(true);
    setError(null);
    try {
      let url = crawlUrl.trim();
      if (!/^https?:\/\//.test(url)) url = `https://${url}`;
      const found = await crawlSite(tenantId, url);
      setPages(found);
      setSkipped({});
      try {
        setDomains((d) => (d.length ? d : [new URL(url).hostname]));
      } catch {
        /* keep domains empty */
      }
    } catch (err) {
      fail(err);
    } finally {
      setCrawling(false);
    }
  };

  const ingestSelected = async () => {
    if (!tenantId || !pages) return;
    const urls = pages.filter((p) => !skipped[p.id]).map((p) => p.id);
    if (urls.length === 0) return setError('Select at least one page');
    setIngesting(true);
    setError(null);
    try {
      await addSiteSources(tenantId, urls);
      setIngested(urls.length);
      setStep(3);
    } catch (err) {
      fail(err);
    } finally {
      setIngesting(false);
    }
  };

  const pasteText = async () => {
    if (!tenantId) return;
    const name = window.prompt('Name for this text source (e.g. "Price list"):');
    if (!name) return;
    const text = window.prompt('Paste the text content:');
    if (!text) return;
    try {
      await addTextSource(tenantId, name, text);
      setIngested((n) => n + 1);
    } catch (err) {
      fail(err);
    }
  };

  const onPdfPicked = async (file: File | undefined) => {
    if (!tenantId || !file) return;
    try {
      await uploadPdfSource(tenantId, file);
      setIngested((n) => n + 1);
    } catch (err) {
      fail(err);
    }
  };

  const saveAgent = async () => {
    if (!tenantId) return;
    setSavingAgent(true);
    setError(null);
    try {
      await updateAgent(tenantId, {
        agentName,
        systemPrompt,
        model,
        accent,
        theme,
        disclaimer,
        allowedOrigins: domains.flatMap((d) => [`https://${d}`, `https://www.${d}`.replace('www.www.', 'www.')]),
        monthlyCap: parseInt(capMonthly, 10) || 1000,
        dailyCap: parseInt(capDaily, 10) || 80,
        sessionCap: parseInt(capSession, 10) || 12,
        onboardingStep: 4,
      });
      setStepRaw(4);
    } catch (err) {
      fail(err);
    } finally {
      setSavingAgent(false);
    }
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || !tenantId) return;
    setSandboxInput('');
    const id = turns.length * 2;
    setTurns((t) => [
      ...t,
      { id, role: 'user', text },
      { id: id + 1, role: 'bot', text: '', answer: 'pending' },
    ]);
    try {
      const answer = await runSandbox(tenantId, text);
      setTurns((t) => t.map((turn) => (turn.id === id + 1 ? { ...turn, answer } : turn)));
    } catch (err) {
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id + 1
            ? {
                ...turn,
                answer: {
                  text: err instanceof Error ? err.message : 'Sandbox failed',
                  srcLine: '—',
                  chunks: [],
                  meta: 'error',
                },
              }
            : turn
        )
      );
    }
  };

  const sendLink = async () => {
    if (!tenantId) return;
    setSendingLink(true);
    setError(null);
    try {
      const url = await sendPaymentLink(
        tenantId,
        Math.round(Number(monthly) * 100),
        Math.round(Number(setupFee) * 100)
      );
      setLinkUrl(url);
    } catch (err) {
      fail(err);
    } finally {
      setSendingLink(false);
    }
  };

  const snippets = embedSnippets(agentId ?? '<agent-id>');

  return (
    <section className="fade-up max-w-[980px]">
      <header className="pt-[26px] pb-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.02em]">
            New tenant{bizName ? ` — ${bizName}` : ''}
          </h1>
          <span className="text-xs text-ink3">target: live today</span>
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
              onClick={() => (tenantId || n === 1 ? setStep(n) : undefined)}
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

      {error ? (
        <div className="mb-3 text-[12.5px] font-semibold" style={{ color: 'var(--rd)' }}>
          {error}
        </div>
      ) : null}

      {/* Step 1 — Create */}
      {step === 1 && (
        <div className={`${card} gap-4 max-w-[560px]`}>
          <div className="text-[15px] font-bold">Create tenant</div>
          <label className={label}>
            Business name
            <input className={input} value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Kentish Heating Co" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={label}>
              Contact
              <input className={input} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Dan Kentish" />
            </label>
            <label className={label}>
              Email
              <input className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="dan@kentishheating.co.uk" />
            </label>
          </div>
          <button onClick={create} disabled={creating} className={primaryBtn}>
            {creating ? 'Creating…' : 'Create & continue →'}
          </button>
        </div>
      )}

      {/* Step 2 — Ingest */}
      {step === 2 && (
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
      )}

      {/* Step 3 — Agent setup */}
      {step === 3 && (
        <div className={`${card} gap-[18px]`}>
          <div className="text-[15px] font-bold">Agent setup</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            <div className="flex flex-col gap-3.5">
              <label className={label}>
                Agent name
                <input className={input} value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </label>
              <label className={label}>
                System prompt
                <textarea
                  rows={7}
                  className={`${input} font-mono text-[11.5px] leading-[1.6] resize-y`}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={`You are the website assistant for ${bizName || 'the business'}. Answer only from the provided context…`}
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Model</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setModel('haiku')}
                    className="flex flex-col gap-0.5 rounded-[10px] px-[13px] py-[9px] cursor-pointer bg-transparent text-left"
                    style={model === 'haiku' ? { border: '1px solid var(--a)', background: 'var(--asf)' } : { border: '1px solid var(--b)' }}
                  >
                    <span className={`text-[12.5px] font-bold ${model === 'haiku' ? 'text-accent' : 'text-ink2'}`}>
                      Haiku{model === 'haiku' ? ' ✓' : ''} default
                    </span>
                    <span className="text-[10.5px] text-ink2">~£0.01 / conversation</span>
                  </button>
                  <button
                    onClick={() => setModel('sonnet')}
                    className="flex flex-col gap-0.5 rounded-[10px] px-[13px] py-[9px] cursor-pointer bg-transparent text-left"
                    style={model === 'sonnet' ? { border: '1px solid var(--a)', background: 'var(--asf)' } : { border: '1px solid var(--b)' }}
                  >
                    <span className={`text-[12.5px] font-bold ${model === 'sonnet' ? 'text-accent' : 'text-ink2'}`}>
                      Sonnet{model === 'sonnet' ? ' ✓' : ''}
                    </span>
                    <span className="text-[10.5px] text-ink3">for tricky content · 4×</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Widget accent · theme</span>
                <div className="flex gap-[7px] items-center flex-wrap">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      aria-label={`Accent ${c}`}
                      className="w-[26px] h-[26px] rounded-lg cursor-pointer p-0"
                      style={{ background: c, border: accent === c ? '2px solid var(--t)' : '2px solid transparent' }}
                    />
                  ))}
                  <span className="w-px h-5 bg-line mx-1" />
                  {(['light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className="text-[11.5px] font-bold rounded-full px-[11px] py-1 cursor-pointer bg-transparent"
                      style={
                        theme === t
                          ? { border: '1px solid var(--a)', color: 'var(--a)', background: 'var(--asf)' }
                          : { border: '1px solid var(--b)', color: 'var(--t2)' }
                      }
                    >
                      {t === 'light' ? 'Light' : 'Dark'}
                      {theme === t ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className={label}>
                Allowed domains
                <span className="flex gap-1.5 flex-wrap">
                  {domains.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDomains((ds) => ds.filter((x) => x !== d))}
                      title="Remove"
                      className="font-mono text-[11px] border border-line rounded-full px-2.5 py-1 text-ink2 font-normal cursor-pointer bg-transparent hover:border-bad hover:text-bad"
                    >
                      {d} ×
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const d = window.prompt('Domain (e.g. kentishheating.co.uk):');
                      if (d) {
                        const clean = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                        setDomains((ds) => (ds.includes(clean) ? ds : [...ds, clean]));
                      }
                    }}
                    className="text-[11px] border border-dashed border-line-strong rounded-full px-2.5 py-1 text-ink3 font-normal cursor-pointer bg-transparent"
                  >
                    + add
                  </button>
                </span>
              </div>
              <label className={label}>
                Disclaimer line
                <input className={input} value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} placeholder="Estimates are indicative until we've seen the job." />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink2">Caps</span>
                <div className="grid grid-cols-3 gap-2">
                  {([['MONTHLY', capMonthly, setCapMonthly], ['DAILY', capDaily, setCapDaily], ['PER SESSION', capSession, setCapSession]] as const).map(
                    ([capLabel, v, set]) => (
                      <label key={capLabel} className="flex flex-col gap-1 text-[10.5px] font-bold text-ink3">
                        {capLabel}
                        <input className={`${input} px-2.5 py-2 text-[12.5px]`} value={v} onChange={(e) => set(e.target.value)} />
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          <button onClick={saveAgent} disabled={savingAgent} className={primaryBtn}>
            {savingAgent ? 'Saving…' : 'Save — test it →'}
          </button>
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
            {["What's your call-out charge?", 'What are your opening hours?', 'Do you sell teapots? (refusal)'].map((preset) => (
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
              ) : t.answer === 'pending' ? (
                <div key={t.id} className="self-start text-[12.5px] text-ink3 px-3 py-2">Thinking…</div>
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
            {(Object.keys(snippets) as Array<keyof typeof snippets>).map((k) => (
              <button
                key={k}
                onClick={() => { setEmbedTab(k); setCopied(false); }}
                className="bg-transparent text-[12.5px] font-bold px-3 py-2 cursor-pointer border-0"
                style={{
                  borderBottom: `2px solid ${embedTab === k ? 'var(--a)' : 'transparent'}`,
                  color: embedTab === k ? 'var(--a)' : 'var(--t3)',
                }}
              >
                {snippets[k].label}
              </button>
            ))}
          </div>
          <div className="relative bg-code rounded-xl px-[18px] pt-[18px] pb-4">
            <pre className="m-0 font-mono text-[11.5px] leading-[1.7] text-codet whitespace-pre-wrap break-words">
              {snippets[embedTab].code}
            </pre>
            <button
              onClick={() => {
                try { navigator.clipboard.writeText(snippets[embedTab].code); } catch { /* clipboard unavailable */ }
                setCopied(true);
              }}
              className="absolute top-2.5 right-2.5 rounded-lg text-[11px] font-bold px-[11px] py-1.5 cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: '#D8DCCB' }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <div className="text-xs text-ink2 leading-relaxed">{snippets[embedTab].note}</div>
          <button onClick={() => setStep(6)} className={primaryBtn}>Embedded — set up billing →</button>
        </div>
      )}

      {/* Step 6 — Billing */}
      {step === 6 && (
        <div className={`${card} gap-4 max-w-[560px]`}>
          <div className="text-[15px] font-bold">Billing &amp; go-live</div>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Setup fee (£)
              <input className={input} value={setupFee} onChange={(e) => setSetupFee(e.target.value)} />
            </label>
            <label className={label}>
              Monthly (£)
              <input className={input} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </label>
          </div>
          <button
            onClick={() => {
              const name = window.prompt('Client login — name:', contactName);
              if (!name) return;
              const email = window.prompt('Client login — email:', contactEmail);
              if (!email) return;
              const password = window.prompt('Client login — password (10+ chars):');
              if (!password || !tenantId) return;
              provisionClientUser(tenantId, { name, email, password })
                .then(() => window.alert('Client login created.'))
                .catch((err) => window.alert(err instanceof Error ? err.message : 'Failed'));
            }}
            className="self-start px-3.5 py-2 border border-line-strong rounded-[9px] bg-transparent text-ink text-xs font-bold cursor-pointer hover:border-accent"
          >
            Create client dashboard login
          </button>
          {!linkUrl ? (
            <button onClick={sendLink} disabled={sendingLink} className={primaryBtn}>
              {sendingLink ? 'Creating link…' : 'Create payment link'}
            </button>
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
              <div className="text-[12.5px] leading-relaxed min-w-0">
                <strong>Payment link ready — send it to {contactEmail || 'the client'}:</strong>
                <br />
                <a href={linkUrl} target="_blank" rel="noreferrer" className="text-accent break-all">{linkUrl}</a>
                <br />
                Tenant flips to Active the moment it&rsquo;s paid — widget stays in contact-form mode until then.
              </div>
            </div>
          )}
          <div className="text-xs text-ink3 border-t border-line pt-3.5">
            Started today — live the same day. That&rsquo;s the whole point.
          </div>
        </div>
      )}
    </section>
  );
}
