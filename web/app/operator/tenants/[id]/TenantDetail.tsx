'use client';

import Link from 'next/link';
import { useState } from 'react';
import { addSiteSources, addTextSource, pauseAgent, updateAgent } from '@/lib/operator-api';
import type { OpConversation, Source, Tenant, TriageItem } from '@/lib/operator-types';
import { Pill, tenantPill } from '../../../_components/Pill';
import { TABS, type Tab } from './detail-ui';
import { AgentTab } from './tabs/AgentTab';
import { SourcesTab } from './tabs/SourcesTab';
import { ConversationsTab } from './tabs/ConversationsTab';
import { InsightsTab } from './tabs/InsightsTab';
import { UsageTab } from './tabs/UsageTab';
import { BillingTab } from './tabs/BillingTab';

export function TenantDetail({
  tenant,
  sources,
  drift,
  conversations,
  triage,
  onChanged,
}: {
  tenant: Tenant;
  sources: Source[];
  drift: string | null;
  conversations: OpConversation[];
  triage: TriageItem[];
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>('Agent');
  const [paused, setPaused] = useState(tenant.agentStatus === 'paused');
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [triageState, setTriageState] = useState<Record<string, 'rev' | 'add' | 'dis'>>({});
  const [agentName, setAgentName] = useState(tenant.agentName);
  const [systemPrompt, setSystemPrompt] = useState(tenant.systemPrompt);
  const [disclaimer, setDisclaimer] = useState(tenant.disclaimer);
  const [model, setModel] = useState<'haiku' | 'sonnet'>(tenant.model === 'Sonnet' ? 'sonnet' : 'haiku');
  const [capMonthly, setCapMonthly] = useState(tenant.caps.monthly.replace(/,/g, ''));
  const [capDaily, setCapDaily] = useState(tenant.caps.daily.replace(/,/g, ''));
  const [capSession, setCapSession] = useState(tenant.caps.session.replace(/,/g, ''));
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = async () => {
    setSaving('saving');
    try {
      await updateAgent(tenant.id, {
        agentName,
        systemPrompt,
        disclaimer,
        model,
        monthlyCap: parseInt(capMonthly, 10) || 0,
        dailyCap: parseInt(capDaily, 10) || 0,
        sessionCap: parseInt(capSession, 10) || 0,
      });
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1500);
    } catch {
      setSaving('idle');
    }
  };

  const addSource = async () => {
    const url = window.prompt('Page URL to ingest (or leave blank to paste text):');
    if (url) {
      await addSiteSources(tenant.id, [url]).catch(() => undefined);
    } else {
      const name = window.prompt('Name for the pasted text source:');
      if (!name) return;
      const text = window.prompt('Paste the text content:');
      if (!text) return;
      await addTextSource(tenant.id, name, text).catch(() => undefined);
    }
    onChanged();
  };

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

      {tab === 'Agent' && (
        <AgentTab
          tenant={tenant}
          agentName={agentName}
          setAgentName={setAgentName}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          disclaimer={disclaimer}
          setDisclaimer={setDisclaimer}
          model={model}
          setModel={setModel}
          capMonthly={capMonthly}
          setCapMonthly={setCapMonthly}
          capDaily={capDaily}
          setCapDaily={setCapDaily}
          capSession={capSession}
          setCapSession={setCapSession}
          saving={saving}
          save={save}
          paused={paused}
          setPaused={setPaused}
          setConfirming={setConfirming}
        />
      )}

      {tab === 'Sources' && (
        <SourcesTab
          sources={sources}
          drift={drift}
          refreshing={refreshing}
          setRefreshing={setRefreshing}
          addSource={addSource}
          onChanged={onChanged}
        />
      )}

      {tab === 'Conversations' && <ConversationsTab conversations={conversations} />}

      {tab === 'Insights' && (
        <InsightsTab triage={triage} triageState={triageState} setTriageState={setTriageState} />
      )}

      {tab === 'Usage & cost' && <UsageTab tenant={tenant} />}

      {tab === 'Billing' && <BillingTab tenant={tenant} />}

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
                onClick={async () => {
                  setConfirming(false);
                  setPaused(true);
                  await pauseAgent(tenant.id).catch(() => setPaused(false));
                }}
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
