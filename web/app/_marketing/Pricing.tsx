import { Reveal } from './Reveal';

const FEATURES = [
  'Full setup done for you — your content ingested, your agent tuned, the widget installed on your site',
  'Every enquiry captured and emailed to you the moment it happens',
  'Monthly insight report showing what your customers asked that your site couldn’t answer',
  'Ongoing updates and model improvements included, at no extra cost, for the life of your subscription',
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

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-line">
      <div className="container-site py-[88px]">
        <Reveal index={0} className="w-[min(560px,100%)] mx-auto">
          <div className="text-center mb-[36px]">
            <div className="eyebrow mb-5">Simple pricing</div>
            <h2 className="display-h text-[clamp(28px,3.2vw,38px)] [text-wrap:balance]">
              One offer. <em className="accent-em">Every client.</em>
            </h2>
          </div>

          <div className="card rounded-[20px] py-10 px-[clamp(24px,5vw,48px)] flex flex-col text-left shadow-[0_24px_60px_-30px_rgba(24,33,28,.28)]">
            <div className="flex items-baseline gap-2 flex-wrap justify-center text-center">
              <span className="font-serif font-semibold text-[clamp(32px,4.4vw,44px)] tracking-[-.02em] leading-[1.15] text-ink">
                $699
              </span>
              <span className="text-[15px] text-ink2 font-semibold">setup</span>
              <span className="font-serif italic text-[22px] text-ink3">+</span>
              <span className="font-serif font-semibold text-[clamp(32px,4.4vw,44px)] tracking-[-.02em] leading-[1.15] text-ink">
                $129
              </span>
              <span className="text-[15px] text-ink2 font-semibold">/month</span>
            </div>

            <div className="flex flex-col gap-3 mt-[30px] mb-[34px]">
              {FEATURES.map((line) => (
                <div key={line} className="flex gap-2.5 items-start">
                  <Check />
                  <span className="text-[14.5px] text-ink leading-snug">{line}</span>
                </div>
              ))}
            </div>

            <a
              href="#maker"
              className="btn-primary text-[15.5px] px-[26px] py-3.5 rounded-xl text-center"
            >
              Book a 15-minute call
            </a>
          </div>

          <p className="text-[13.5px] text-ink2 leading-relaxed max-w-[480px] mx-auto text-center mt-[26px]">
            One flat price for everyone. No tiers, no upsells — just book a call and
            we&rsquo;ll get you live.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
