import { getBilling } from '@/lib/api';
import { Pill } from '../../_components/Pill';

export const metadata = { title: 'Billing — SupportAI' };

export default async function BillingPage() {
  const b = await getBilling();

  return (
    <section className="fade-up max-w-[760px]">
      <header className="pt-[34px] pb-6">
        <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-[-.025em]">Billing</h1>
        <div className="text-sm text-ink2">
          Your plan, handled through Stripe — nothing to manage here day to day.
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        <div className="bg-surface border border-line rounded-[14px] p-[22px]">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[13px] font-bold">Your plan</div>
            <Pill tone="good">Active</Pill>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between gap-2.5">
              <span className="text-[13.5px] text-ink2">Setup fee</span>
              <span className="text-[13.5px] font-bold text-right">{b.setupLine}</span>
            </div>
            <div className="flex justify-between gap-2.5">
              <span className="text-[13.5px] text-ink2">Monthly</span>
              <span className="text-[13.5px] font-bold">{b.monthlyLine}</span>
            </div>
            <div className="flex justify-between gap-2.5">
              <span className="text-[13.5px] text-ink2">Next renewal</span>
              <span className="text-[13.5px] font-bold">{b.renewalLine}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-[14px] p-[22px] flex flex-col gap-3">
          <div className="text-[13px] font-bold">Payment method</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-[27px] rounded-[5px] bg-accent-soft border border-line flex items-center justify-center text-[9px] font-extrabold text-accent tracking-[.06em]">
              VISA
            </div>
            <span className="text-[13.5px] font-semibold">{b.cardLine}</span>
          </div>
          {/* v2: POST /billing/portal → redirect to the Stripe customer portal */}
          <button className="self-start mt-0.5 px-[15px] py-2.5 border border-line-strong rounded-[10px] bg-transparent text-[13px] font-bold text-ink cursor-pointer hover:text-accent hover:border-accent">
            Manage payment method ↗
          </button>
          <div className="text-[11.5px] text-ink3">Opens the secure Stripe portal.</div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-[14px] px-5">
        <div className="py-[15px] text-[13px] font-bold">Invoices</div>
        {b.invoices.map((iv) => (
          <div key={iv.label} className="flex items-center gap-3.5 py-[13px] border-t border-line">
            <span className="text-[13px] font-semibold flex-1">{iv.label}</span>
            <span className="text-[12.5px] text-ink3">{iv.amount}</span>
            <Pill tone="good">Paid</Pill>
          </div>
        ))}
      </div>
    </section>
  );
}
