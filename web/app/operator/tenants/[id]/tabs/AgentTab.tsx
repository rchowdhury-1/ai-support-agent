import type { Dispatch, SetStateAction } from 'react';
import { resumeAgent } from '@/lib/operator-api';
import type { Tenant } from '@/lib/operator-types';
import { InlineWidget } from '../../../_components/InlineWidget';
import { card, label, input } from '../detail-ui';

export function AgentTab({
  tenant,
  agentName,
  setAgentName,
  systemPrompt,
  setSystemPrompt,
  disclaimer,
  setDisclaimer,
  model,
  setModel,
  capMonthly,
  setCapMonthly,
  capDaily,
  setCapDaily,
  capSession,
  setCapSession,
  saving,
  save,
  paused,
  setPaused,
  setConfirming,
}: {
  tenant: Tenant;
  agentName: string;
  setAgentName: Dispatch<SetStateAction<string>>;
  systemPrompt: string;
  setSystemPrompt: Dispatch<SetStateAction<string>>;
  disclaimer: string;
  setDisclaimer: Dispatch<SetStateAction<string>>;
  model: 'haiku' | 'sonnet';
  setModel: Dispatch<SetStateAction<'haiku' | 'sonnet'>>;
  capMonthly: string;
  setCapMonthly: Dispatch<SetStateAction<string>>;
  capDaily: string;
  setCapDaily: Dispatch<SetStateAction<string>>;
  capSession: string;
  setCapSession: Dispatch<SetStateAction<string>>;
  saving: 'idle' | 'saving' | 'saved';
  save: () => void;
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
  setConfirming: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="pt-[18px] grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className={`${card} flex flex-col gap-[13px]`}>
        <div className="text-[13.5px] font-bold">Agent configuration</div>
        <label className={label}>Agent name<input className={input} value={agentName} onChange={(e) => setAgentName(e.target.value)} /></label>
        <label className={label}>
          System prompt
          <textarea rows={6} className={`${input} font-mono text-[11px] leading-[1.6] resize-y`} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </label>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[11.5px] font-bold text-ink2">Model</span>
          {(['haiku', 'sonnet'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModel(m)}
              className="text-[11.5px] font-bold rounded-full px-[11px] py-1 cursor-pointer bg-transparent"
              style={
                model === m
                  ? { border: '1px solid var(--a)', color: 'var(--a)', background: 'var(--asf)' }
                  : { border: '1px solid var(--b)', color: 'var(--t2)' }
              }
            >
              {m === 'haiku' ? 'Haiku' : 'Sonnet'}
              {model === m ? ' ✓' : ''}
            </button>
          ))}
          <span className="w-px h-[18px] bg-line" />
          <span className="text-[11.5px] font-bold text-ink2">Accent</span>
          <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: tenant.accent, border: '2px solid var(--t)' }} />
          <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: '#1F3A5F' }} />
          <span className="w-[22px] h-[22px] rounded-[7px]" style={{ background: '#6E3B2A' }} />
        </div>
        <label className={label}>Disclaimer<input className={input} value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-2">
          {([['MONTHLY CAP', capMonthly, setCapMonthly], ['DAILY', capDaily, setCapDaily], ['PER SESSION', capSession, setCapSession]] as const).map(([capLabel, v, set]) => (
            <label key={capLabel} className="flex flex-col gap-1 text-[10px] font-bold text-ink3">
              {capLabel}
              <input className={`${input} px-2.5 py-2 text-xs`} value={v} onChange={(e) => set(e.target.value)} />
            </label>
          ))}
        </div>
        <button onClick={save} className="self-start px-4 py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110">
          {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved ✓' : 'Save changes'}
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
              onClick={async () => {
                setPaused(false);
                await resumeAgent(tenant.id).catch(() => setPaused(true));
              }}
              className="px-4 py-[9px] border-none rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-bold cursor-pointer hover:brightness-110"
            >
              Resume agent
            </button>
          </div>
        )}
        <div className={card}>
          <div className="text-[13.5px] font-bold mb-2.5">Live widget preview</div>
          <InlineWidget accent={tenant.accent} agentId={tenant.agentId ?? undefined} />
          <div className="text-[10.5px] text-ink3 mt-2">
            Live preview against this tenant&rsquo;s own agent.
          </div>
        </div>
      </div>
    </div>
  );
}
