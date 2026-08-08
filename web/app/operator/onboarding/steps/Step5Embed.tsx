import type { Dispatch, SetStateAction } from 'react';
import { card, primaryBtn, type EmbedSnippets } from '../onboarding-ui';

export function Step5Embed({
  snippets,
  embedTab,
  setEmbedTab,
  copied,
  setCopied,
  setStep,
}: {
  snippets: EmbedSnippets;
  embedTab: 'html' | 'next' | 'wp';
  setEmbedTab: Dispatch<SetStateAction<'html' | 'next' | 'wp'>>;
  copied: boolean;
  setCopied: Dispatch<SetStateAction<boolean>>;
  setStep: (n: number) => void;
}) {
  return (
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
  );
}
