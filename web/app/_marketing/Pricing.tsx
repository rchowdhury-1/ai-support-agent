'use client';

import { useId, useRef, useState } from 'react';
import { Reveal } from './Reveal';

type Volume = '5k' | '20k';

const VOLUMES: { id: Volume; label: string; spoken: string }[] = [
  { id: '5k', label: '5,000 / month', spoken: '5,000' },
  { id: '20k', label: '20,000 / month', spoken: '20,000' },
];

type Tier = {
  name: string;
  model: string;
  monthly: Record<Volume, number>;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: 'Standard',
    model: 'currently Claude Haiku',
    monthly: { '5k': 99, '20k': 249 },
    features: [
      'Full setup done for you — content ingested, agent tuned, widget installed',
      'Monthly insight report showing what your customers asked that your site couldn’t answer',
      'Ongoing updates and model improvements included',
    ],
  },
  {
    name: 'Professional',
    model: 'currently Claude Sonnet',
    monthly: { '5k': 199, '20k': 349 },
    features: [
      'Everything in Standard, plus a higher-accuracy model — for practices where precision matters most (legal, medical, financial, or anywhere a wrong answer carries real cost)',
      'Priority handling of flagged answers',
    ],
  },
];

const Check = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--g)"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mt-[3px] shrink-0"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Bulletproof visually-hidden style for the live region — independent of any
// Tailwind sr-only utility being present.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function Pricing() {
  const [volume, setVolume] = useState<Volume>('5k');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const groupLabelId = useId();

  const selectedVolume = VOLUMES.find((v) => v.id === volume)!;

  function move(i: number, delta: number) {
    const next = (i + delta + VOLUMES.length) % VOLUMES.length;
    setVolume(VOLUMES[next].id);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(i, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(i, -1);
        break;
      case 'Home':
        e.preventDefault();
        setVolume(VOLUMES[0].id);
        refs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setVolume(VOLUMES[VOLUMES.length - 1].id);
        refs.current[VOLUMES.length - 1]?.focus();
        break;
    }
  }

  const announcement =
    `Showing ${selectedVolume.spoken} messages a month. ` +
    TIERS.map(
      (t) => `${t.name}, from £500 setup, then £${t.monthly[volume]} a month.`,
    ).join(' ');

  return (
    <section id="pricing" className="border-t border-line">
      <div className="container-site py-[88px]">
        <Reveal index={0} className="w-[min(940px,100%)] mx-auto">
          {/* Header + volume toggle */}
          <div className="text-center mb-[36px]">
            <div className="eyebrow mb-5">Simple pricing</div>

            <div
              className="text-[14px] text-ink2 mb-3"
              id={groupLabelId}
            >
              How many messages a month?
            </div>

            <div
              role="radiogroup"
              aria-labelledby={groupLabelId}
              className="inline-flex items-center gap-1 p-1 rounded-full border border-line bg-surface"
            >
              {VOLUMES.map((v, i) => {
                const selected = v.id === volume;
                return (
                  <button
                    key={v.id}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setVolume(v.id)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className={[
                      'font-semibold text-[14px] rounded-full px-[18px] py-2 transition-colors',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                      selected ? 'bg-accent-soft text-ink' : 'text-ink2 hover:text-ink',
                    ].join(' ')}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[13px] text-ink3 mt-3.5">
              Each question and answer counts as one message.
            </p>
          </div>

          {/* Two tiers */}
          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            {TIERS.map((tier) => (
              <TierCard key={tier.name} tier={tier} volume={volume} />
            ))}
          </div>

          {/* Allowance predictability + final-quote note */}
          <p className="text-[13.5px] text-ink2 leading-relaxed max-w-[560px] mx-auto text-center mt-[34px]">
            No surprise bills. If you go past your included messages, the assistant
            steps back to a simple contact form rather than running up a charge — and
            we’ll talk about moving you to the tier that fits.
          </p>
          <p className="text-[13px] text-ink3 leading-normal max-w-[560px] mx-auto text-center mt-3">
            Final pricing confirmed after a short call, since it depends on how much
            content needs ingesting.
          </p>

          {/* Assistive-tech announcement of price changes */}
          <div role="status" aria-live="polite" aria-atomic="true" style={srOnly}>
            {announcement}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TierCard({ tier, volume }: { tier: Tier; volume: Volume }) {
  const headingId = useId();

  return (
    <div className="card rounded-[20px] py-10 px-[clamp(22px,4vw,40px)] flex flex-col text-left shadow-[0_24px_60px_-30px_rgba(24,33,28,.28)]">
      <h3 id={headingId} className="font-serif font-semibold text-[22px] text-ink tracking-[-.01em] mb-[18px]">
        {tier.name}
      </h3>

      <div className="text-[14px] text-ink2 mb-1">From</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-serif font-semibold text-[clamp(30px,4vw,40px)] tracking-[-.02em] leading-[1.15] text-ink">
          £500
        </span>
        <span className="text-[15px] text-ink2 font-semibold">setup</span>
        <span className="font-serif italic text-[22px] text-ink3">+</span>
        <span className="font-serif font-semibold text-[clamp(30px,4vw,40px)] tracking-[-.02em] leading-[1.15] text-ink">
          £{tier.monthly[volume]}
        </span>
        <span className="text-[15px] text-ink2 font-semibold">/month</span>
      </div>
      <div className="text-[12.5px] text-ink3 mt-2">({tier.model})</div>

      <div className="flex flex-col gap-3 mt-[26px] mb-[30px]">
        {tier.features.map((line) => (
          <div key={line} className="flex gap-2.5 items-start">
            <Check />
            <span className="text-[14.5px] text-ink leading-snug">{line}</span>
          </div>
        ))}
      </div>

      <a
        href="#maker"
        aria-describedby={headingId}
        className="btn-primary text-[15.5px] px-[26px] py-3.5 rounded-xl text-center mt-auto"
      >
        Book a 15-minute call
      </a>
    </div>
  );
}
