'use client';

import Link from 'next/link';
import { useState } from 'react';
import { demoUsageBars } from '@/lib/operator-data';
import type { OpConversation, Source, Tenant, TriageItem } from '@/lib/operator-types';
import { Pill, sourcePill, tenantPill } from '../../../_components/Pill';
import { InlineWidget } from '../../_components/InlineWidget';

const TABS = ['Agent', 'Sources', 'Conversations', 'Insights', 'Usage & cost', 'Billing'] as const;
type Tab = (typeof TABS)[number];

const label = 'flex flex-col gap-[5px] text-[11.5px] font-bold text-ink2';
const input =
  'px-[11px] py-[9px] border border-line rounded-lg bg-page text-ink text-[12.5px] outline-none focus:border-accent font-sans font-normal';
const card = 'bg-surface border border-line rounded-[14px] p-5';

const SOURCE_ICONS: Record<Source['icon'], React.ReactNode> = {
  site: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c2.5 2.6 4 6.1 4 10s-1.5 7.4-4 10c-2.5-2.6-4-6.1-4-10s1.5-7.4 4-10z" />
    </svg>
  ),
  pdf: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
    </svg>
  ),
  text: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
};

export function TenantDetail({
  tenant,
  sources,
  drift,
  conversations,
  triage,
}: {
  tenant: Tenant;
  sources: Source[];
  drift: string | null;
  conversations: OpConversation[];
  triage: TriageItem[];
}) {
  const [tab, setTab] = useState<Tab>('Agent');
  const [paused, setPaused] = useState(tenant.status === 'paused');
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [triageState, setTriageState] = useState<Record<string, 'rev' | 'add' | 'dis'>>({});

  const status = paused ? 'paused' : tenant.status === 'paused' ? 'active' : tenant.status;
  const pill = tenantPill[status];

  return (
    <section className="fade-up">
      <header className="pt-[26px]">
        <Link href="/operator" className="inline-block text-[12.5px] font-bold text-accent no-underline mb-3">
          ← Tenants
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.02em]">{tenant.name}</h1>
          <Pill tone={pill.tone}>{pill.label}</Pill>
          <span className="text-xs text-ink3">{tenant.domain}</span>
          <span className="flex-1" />
          <Link
            href="/dashboard"
            className="text-xs font-bold text-ink2 no-underline border border-line rounded-[9px] px-[13px] py-2 hover:text-accent hover:border-accent"
          >
            Client view ↗
          </Link>
        </div>
        <div className="flex gap-[22px] flex-wrap py-4 text-xs text-ink2">
          <span><strong className="text-ink">{tenant.used.toLocaleString('en-GB')}</strong> messages</span>
          <span><strong className="text-ink">{tenant.cost}</strong> this month</span>
          <span><strong className="text-ink">{sources.length}</strong> sources</span>
          <span>last activity <strong className="text-ink">{tenant.last}</strong></span>
        </div>
        <div className="flex gap-0.5 border-b border-line overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="bg-transparent text-[12.5px] font-bold px-3.5 py-[9px] cursor-pointer whitespace-nowrap border-0"
              style={{
                borderBottom: `2px solid ${tab === t ? 'var(--a)' : 'transparent'}`,
                color: tab === t ? 'var(--a)' : 'var(--t2)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* ── Agent tab ── */}
      {tab === 'Agent' && (
        <div className="pt-[18px] grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className={`${card} flex flex-col gap-[13px]`}>
            <div className="text-[13.5px] font-bold">Agent configuration</div>
            <label className={label}>Agent name<input className={input} defaultValue={tenant.agentName} /></label>
            <label className={label}>
              System prompt
              <textarea rows={6} className={`${input} font-mono text-[11px] leading-[1.6] resize-y`} defaultValue={tenant.systemPrompt} />
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[11.5px] font-bold text-ink2">Model</span>
              <span className="text-[11.5px] font-bold rounded-full px-[11px] py-1" style={{ border: '1px solid var(--a)', color: 'var(--a)', background: 'var(--asf)' }}>
                {tenant.model} ✓
              </span>
              <span className="text-[11.5px] font-bold border border-line text-ink2 rounded-full px-[11px] py-1">
                {tenant.model === 'Haiku' ? 'Sonnet' : 'Haiku'}
              </span>
              <span className="w-px h-[18px] bg-line" />
              <span className="text-[11.5px] font-bold text-ink2">Accent</span>
              <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: tenant.accent, border: '2px solid var(--t)' }} />
              <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: '#1F3A5F' }} />
              <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: '#6E3B2A' }} />
            </div>
            <label className={label}>Disclaimer<input className={input} defaultValue={tenant.disclaimer} /></label>
            <div className="grid grid-cols-3 gap-2">
              {[['MONTHLY CAP', tenant.caps.monthly], ['DAILY', tenant.caps.daily], ['PER SESSION', tenant.caps.session]].map(([capLabel, v]) => (
                <label key={capLabel} className="flex flex-col gap-1 text-[10px] font-bold text-ink3">
                  {capLabel}
                  <input className={`${input} px-2.5 py-2 text-xs`} defaultValue={v} />
                </label>
              ))}
            </div>
            <button className="self-start px-4 py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110">
              Save changes
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {!paused ? (
              <div className="bg-surface rounded-[14px] p-5" style={{ border: '1px solid color-mix(in srgb, var(--rd) 34%, transparent)' }}>
                <div className="text-[13.5px] font-bold text-bad mb-1.5">Kill switch</div>
                <div className="text-[12.5px] text-ink2 leading-relaxed mb-3.5">
                  Pausing flips every widget on {tenant.domain} to contact-form mode immediately.
                  Visitors see a polite message, never an error.
                </div>
                <button
                  onClick={() => setConfirming(true)}
                  className="px-4 py-[9px] rounded-[9px] bg-transparent text-bad text-[12.5px] font-bold cursor-pointer"
                  style={{ border: '1px solid var(--rd)' }}
                >
                  Pause agent
                </button>
              </div>
            ) : (
              <div
                className="rounded-[14px] p-5 fade-up"
                style={{
                  background: 'color-mix(in srgb, var(--rd) 9%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--rd) 34%, transparent)',
                }}
              >
                <div className="text-[13.5px] font-bold text-bad mb-1.5">Agent paused</div>
                <div className="text-[12.5px] text-ink2 leading-relaxed mb-3.5">
                  All widgets are in contact-form mode. Enquiries still land in the client&rsquo;s dashboard.
                </div>
                <button
                  onClick={() => setPaused(false)}
                  className="px-4 py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110"
                >
                  Resume agent
                </button>
              </div>
            )}
            <div className={card}>
              <div className="text-[13.5px] font-bold mb-2.5">Live widget preview</div>
              <InlineWidget accent={tenant.accent} />
              <div className="text-[10.5px] text-ink3 mt-2">
                Previewing against the live demo agent — per-tenant preview arrives with the v2 backend.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sources tab ── */}
      {tab === 'Sources' && (
        <div className="pt-[18px]">
          <div className="flex justify-end mb-3">
            <button className="px-[15px] py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110">
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
                        onClick={() => setRefreshing((r) => ({ ...r, [src.id]: true }))}
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
      )}

      {/* ── Conversations tab ── */}
      {tab === 'Conversations' && (
        <div className="pt-[18px]">
          {conversations.length > 0 ? (
            <div className="bg-surface border border-line rounded-[14px] px-[18px]">
              {conversations.map((c) => (
                <div key={c.question + c.time} className="py-[13px] border-b border-line">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[12.5px] font-bold flex-1 min-w-[200px]">&ldquo;{c.question}&rdquo;</span>
                    <span className="text-[11px] text-ink3">{c.time}</span>
                    <Pill tone={c.status === 'answered' ? 'good' : 'bad'}>
                      {c.status === 'answered' ? 'Answered' : 'Escalated'}
                    </Pill>
                  </div>
                  <div className="font-mono text-[10.5px] text-ink3 mt-1.5">{c.telemetry}</div>
                </div>
              ))}
              <div className="py-3 text-[11.5px] text-ink3">
                Retrieval telemetry per message — full transcripts open in the client view.
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-dashed border-line-strong rounded-[14px] px-5 py-11 text-center">
              <div className="text-[13.5px] font-bold mb-1">No conversations yet</div>
              <div className="text-[12.5px] text-ink2">The agent isn&rsquo;t live — it goes live when the payment link is paid.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Insights tab ── */}
      {tab === 'Insights' && (
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
                    <button onClick={() => setTriageState((s) => ({ ...s, [t.id]: 'rev' }))} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-accent hover:border-accent">Reviewed</button>
                    <button onClick={() => setTriageState((s) => ({ ...s, [t.id]: 'add' }))} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-good hover:border-good">Content added</button>
                    <button onClick={() => setTriageState((s) => ({ ...s, [t.id]: 'dis' }))} className="border border-line rounded-lg bg-transparent text-ink2 text-[11px] font-bold px-2.5 py-[5px] cursor-pointer hover:text-bad hover:border-bad">Dismiss</button>
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
      )}

      {/* ── Usage tab ── */}
      {tab === 'Usage & cost' && (
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
                <div className="text-[10.5px] text-ink3">2.4M tokens</div>
              </div>
              <div>
                <div className="text-[11px] text-ink3">Avg / conversation</div>
                <div className="font-serif font-semibold text-2xl">£0.011</div>
              </div>
              <div>
                <div className="text-[11px] text-ink3">Answer rate</div>
                <div className="font-serif font-semibold text-2xl text-good">91%</div>
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
              {demoUsageBars.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-[3px] bg-accent opacity-85" style={{ height: `${v}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-ink3 mt-1.5">
              <span>6 Jul</span><span>19 Jul</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === 'Billing' && (
        <div className="pt-[18px] grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className={`${card} flex flex-col gap-[11px]`}>
            <div className="flex justify-between items-center">
              <span className="text-[13.5px] font-bold">Stripe subscription</span>
              <Pill tone="good">Active</Pill>
            </div>
            <div className="flex justify-between text-[12.5px]"><span className="text-ink2">Monthly</span><strong>£99 / month</strong></div>
            <div className="flex justify-between text-[12.5px]"><span className="text-ink2">Next invoice</span><strong>1 Aug 2026</strong></div>
            <div className="flex justify-between text-[12.5px]"><span className="text-ink2">Card</span><strong>Visa •••• 4242</strong></div>
            <button className="self-start mt-1 px-3.5 py-2 border border-line-strong rounded-[9px] bg-transparent text-ink text-xs font-bold cursor-pointer hover:text-accent hover:border-accent">
              Open in Stripe ↗
            </button>
          </div>
          <div className="bg-surface border border-line rounded-[14px] px-5 py-1.5">
            <div className="py-[13px] text-[13.5px] font-bold">Payment history</div>
            {[
              ['1 Jul 2026 — monthly', '£99 paid'],
              ['1 Jun 2026 — monthly', '£99 paid'],
              ['12 Mar 2026 — setup', '£500 paid'],
            ].map(([row, amount]) => (
              <div key={row} className="flex justify-between gap-2.5 py-2.5 border-t border-line text-[12.5px]">
                <span>{row}</span>
                <span className="text-good font-bold">{amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pause confirmation modal ── */}
      {confirming && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: 'rgba(16,20,15,.5)' }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-[min(430px,100%)] bg-surface border border-line rounded-2xl p-[26px] fade-up"
            style={{ boxShadow: '0 30px 80px -20px rgba(10,14,10,.5)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Pause ${tenant.name}?`}
          >
            <div className="text-base font-bold tracking-[-.015em] mb-2">Pause {tenant.name}?</div>
            <div className="text-[13px] text-ink2 leading-relaxed mb-5">
              Every widget flips to contact-form mode immediately. Visitors can still leave their
              details; nothing errors. You can resume at any time.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2.5 border border-line rounded-[10px] bg-transparent text-ink text-[13px] font-bold cursor-pointer hover:border-line-strong"
              >
                Keep running
              </button>
              <button
                onClick={() => { setConfirming(false); setPaused(true); }}
                className="px-4 py-2.5 border-none rounded-[10px] text-[13px] font-bold cursor-pointer hover:brightness-110"
                style={{ background: 'var(--rd)', color: '#FBF6EE' }}
              >
                Pause agent
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
