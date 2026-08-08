import type { Dispatch, SetStateAction } from 'react';
import { ACCENTS, card, input, label, primaryBtn } from '../onboarding-ui';

export function Step3Agent({
  bizName,
  agentName,
  setAgentName,
  systemPrompt,
  setSystemPrompt,
  model,
  setModel,
  accent,
  setAccent,
  theme,
  setTheme,
  domains,
  setDomains,
  disclaimer,
  setDisclaimer,
  capMonthly,
  setCapMonthly,
  capDaily,
  setCapDaily,
  capSession,
  setCapSession,
  savingAgent,
  saveAgent,
}: {
  bizName: string;
  agentName: string;
  setAgentName: Dispatch<SetStateAction<string>>;
  systemPrompt: string;
  setSystemPrompt: Dispatch<SetStateAction<string>>;
  model: 'haiku' | 'sonnet';
  setModel: Dispatch<SetStateAction<'haiku' | 'sonnet'>>;
  accent: string;
  setAccent: Dispatch<SetStateAction<string>>;
  theme: 'light' | 'dark';
  setTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  domains: string[];
  setDomains: Dispatch<SetStateAction<string[]>>;
  disclaimer: string;
  setDisclaimer: Dispatch<SetStateAction<string>>;
  capMonthly: string;
  setCapMonthly: Dispatch<SetStateAction<string>>;
  capDaily: string;
  setCapDaily: Dispatch<SetStateAction<string>>;
  capSession: string;
  setCapSession: Dispatch<SetStateAction<string>>;
  savingAgent: boolean;
  saveAgent: () => void;
}) {
  return (
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
  );
}
