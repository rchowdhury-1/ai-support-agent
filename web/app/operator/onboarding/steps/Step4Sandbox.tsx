import type { Dispatch, SetStateAction } from 'react';
import { ChunkPanel } from '../../_components/ChunkPanel';
import { card, input, primaryBtn, type SandboxTurn } from '../onboarding-ui';

export function Step4Sandbox({
  turns,
  sandboxInput,
  setSandboxInput,
  ask,
  setStep,
}: {
  turns: SandboxTurn[];
  sandboxInput: string;
  setSandboxInput: Dispatch<SetStateAction<string>>;
  ask: (q: string) => void;
  setStep: (n: number) => void;
}) {
  return (
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
  );
}
