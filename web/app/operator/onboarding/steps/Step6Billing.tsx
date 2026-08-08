import type { Dispatch, SetStateAction } from 'react';
import { provisionClientUser } from '@/lib/operator-api';
import { card, input, label, primaryBtn } from '../onboarding-ui';

export function Step6Billing({
  setupFee,
  setSetupFee,
  monthly,
  setMonthly,
  contactName,
  contactEmail,
  tenantId,
  linkUrl,
  sendLink,
  sendingLink,
}: {
  setupFee: string;
  setSetupFee: Dispatch<SetStateAction<string>>;
  monthly: string;
  setMonthly: Dispatch<SetStateAction<string>>;
  contactName: string;
  contactEmail: string;
  tenantId: string | null;
  linkUrl: string | null;
  sendLink: () => void;
  sendingLink: boolean;
}) {
  return (
    <div className={`${card} gap-4 max-w-[560px]`}>
      <div className="text-[15px] font-bold">Billing &amp; go-live</div>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Setup fee (£)
          <input className={input} value={setupFee} onChange={(e) => setSetupFee(e.target.value)} />
        </label>
        <label className={label}>
          Monthly (£)
          <input className={input} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </label>
      </div>
      <button
        onClick={() => {
          const name = window.prompt('Client login — name:', contactName);
          if (!name) return;
          const email = window.prompt('Client login — email:', contactEmail);
          if (!email) return;
          const password = window.prompt('Client login — password (10+ chars):');
          if (!password || !tenantId) return;
          provisionClientUser(tenantId, { name, email, password })
            .then(() => window.alert('Client login created.'))
            .catch((err) => window.alert(err instanceof Error ? err.message : 'Failed'));
        }}
        className="self-start px-3.5 py-2 border border-line-strong rounded-[9px] bg-transparent text-ink text-xs font-bold cursor-pointer hover:border-accent"
      >
        Create client dashboard login
      </button>
      {!linkUrl ? (
        <button onClick={sendLink} disabled={sendingLink} className={primaryBtn}>
          {sendingLink ? 'Creating link…' : 'Create payment link'}
        </button>
      ) : (
        <div
          className="flex gap-[9px] items-start rounded-[11px] px-[15px] py-[13px] fade-up"
          style={{
            background: 'color-mix(in srgb, var(--g) 11%, transparent)',
            border: '1px solid color-mix(in srgb, var(--g) 30%, transparent)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <div className="text-[12.5px] leading-relaxed min-w-0">
            <strong>Payment link ready — send it to {contactEmail || 'the client'}:</strong>
            <br />
            <a href={linkUrl} target="_blank" rel="noreferrer" className="text-accent break-all">{linkUrl}</a>
            <br />
            Tenant flips to Active the moment it&rsquo;s paid — widget stays in contact-form mode until then.
          </div>
        </div>
      )}
      <div className="text-xs text-ink3 border-t border-line pt-3.5">
        Started today — live the same day. That&rsquo;s the whole point.
      </div>
    </div>
  );
}
