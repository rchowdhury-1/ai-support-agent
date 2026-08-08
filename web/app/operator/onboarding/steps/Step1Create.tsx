import type { Dispatch, SetStateAction } from 'react';
import { card, input, label, primaryBtn } from '../onboarding-ui';

export function Step1Create({
  bizName,
  setBizName,
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
  creating,
  create,
}: {
  bizName: string;
  setBizName: Dispatch<SetStateAction<string>>;
  contactName: string;
  setContactName: Dispatch<SetStateAction<string>>;
  contactEmail: string;
  setContactEmail: Dispatch<SetStateAction<string>>;
  creating: boolean;
  create: () => void;
}) {
  return (
    <div className={`${card} gap-4 max-w-[560px]`}>
      <div className="text-[15px] font-bold">Create tenant</div>
      <label className={label}>
        Business name
        <input className={input} value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Kentish Heating Co" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={label}>
          Contact
          <input className={input} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Dan Kentish" />
        </label>
        <label className={label}>
          Email
          <input className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="dan@kentishheating.co.uk" />
        </label>
      </div>
      <button onClick={create} disabled={creating} className={primaryBtn}>
        {creating ? 'Creating…' : 'Create & continue →'}
      </button>
    </div>
  );
}
