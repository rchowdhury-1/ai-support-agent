import { sendPaymentLink } from '@/lib/operator-api';
import type { Tenant } from '@/lib/operator-types';
import { Pill } from '../../../../_components/Pill';
import { card } from '../detail-ui';

export function BillingTab({ tenant }: { tenant: Tenant }) {
  return (
    <div className="pt-[18px] grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className={`${card} flex flex-col gap-[11px]`}>
        <div className="flex justify-between items-center">
          <span className="text-[13.5px] font-bold">Stripe subscription</span>
          <Pill tone={tenant.status === 'active' ? 'good' : tenant.status === 'past_due' ? 'bad' : 'warn'}>
            {tenant.status === 'active' ? 'Active' : tenant.status === 'past_due' ? 'Past due' : tenant.status === 'pending' ? 'Awaiting payment' : 'Paused'}
          </Pill>
        </div>
        <div className="flex justify-between text-[12.5px]">
          <span className="text-ink2">Monthly</span>
          <strong>{tenant.monthlyAmountPence ? `£${(tenant.monthlyAmountPence / 100).toFixed(0)} / month` : 'Not set'}</strong>
        </div>
        <div className="flex justify-between text-[12.5px]">
          <span className="text-ink2">Set-up fee</span>
          <strong>{tenant.setupFeePence ? `£${(tenant.setupFeePence / 100).toFixed(0)}` : '—'}</strong>
        </div>
        <button
          onClick={async () => {
            const monthly = window.prompt('Monthly amount in £:', tenant.monthlyAmountPence ? String(tenant.monthlyAmountPence / 100) : '99');
            if (!monthly) return;
            const setup = window.prompt('One-off set-up fee in £ (0 for none):', tenant.setupFeePence ? String(tenant.setupFeePence / 100) : '500');
            if (setup === null) return;
            try {
              const url = await sendPaymentLink(tenant.id, Math.round(Number(monthly) * 100), Math.round(Number(setup) * 100));
              window.prompt('Payment link (send this to the client):', url);
            } catch (err) {
              window.alert(err instanceof Error ? err.message : 'Could not create the link');
            }
          }}
          className="self-start mt-1 px-3.5 py-2 border border-line-strong rounded-[9px] bg-transparent text-ink text-xs font-bold cursor-pointer hover:text-accent hover:border-accent"
        >
          {tenant.status === 'pending' ? 'Create payment link' : 'New payment link'} ↗
        </button>
      </div>
      <div className="bg-surface border border-line rounded-[14px] px-5 py-4 text-[12.5px] text-ink2 leading-relaxed">
        Invoices and payment history live in the Stripe dashboard — the subscription status
        here updates automatically from Stripe webhooks.
      </div>
    </div>
  );
}
