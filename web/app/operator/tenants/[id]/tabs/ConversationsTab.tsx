import type { OpConversation } from '@/lib/operator-types';
import { Pill } from '../../../../_components/Pill';

export function ConversationsTab({ conversations }: { conversations: OpConversation[] }) {
  return (
    <div className="pt-[18px]">
      {conversations.length > 0 ? (
        <div className="bg-surface border border-line rounded-[14px] px-[18px]">
          {conversations.map((c) => (
            <div key={c.question + c.time} className="py-[13px] border-b border-line">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12.5px] font-bold flex-1 min-w-[200px]">&ldquo;{c.question}&rdquo;</span>
                <span className="text-[11px] text-ink3">{c.time}</span>
                <Pill tone={c.status === 'answered' ? 'good' : 'bad'}>
                  {c.status === 'answered' ? 'Answered' : 'Escalated'}
                </Pill>
              </div>
              <div className="font-mono text-[10.5px] text-ink3 mt-1.5">{c.telemetry}</div>
            </div>
          ))}
          <div className="py-3 text-[11.5px] text-ink3">
            Retrieval telemetry per message — full transcripts open in the client view.
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-dashed border-line-strong rounded-[14px] px-5 py-11 text-center">
          <div className="text-[13.5px] font-bold mb-1">No conversations yet</div>
          <div className="text-[12.5px] text-ink2">The agent isn&rsquo;t live — it goes live when the payment link is paid.</div>
        </div>
      )}
    </div>
  );
}
