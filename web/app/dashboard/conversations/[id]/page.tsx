import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getConversation } from '@/lib/api';
import { conversationPill, Pill } from '../../../_components/Pill';
import { FlagButton } from './FlagButton';

export const metadata = { title: 'Conversation — SupportAI' };

const DocIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const ThumbDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 0 0)">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h9.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14z" />
  </svg>
);

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
  const convo = await getConversation(params.id);
  if (!convo) notFound();
  const pill = conversationPill[convo.status];

  return (
    <section className="fade-up max-w-[760px]">
      <header className="pt-[34px] pb-5">
        <Link href="/dashboard/conversations" className="inline-block text-[13px] font-bold text-accent no-underline mb-3.5">
          ← All conversations
        </Link>
        <div className="flex items-center gap-3.5 flex-wrap">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.02em] flex-1 min-w-[220px]">{convo.who}</h1>
          <Pill tone={pill.tone}>{pill.label}</Pill>
        </div>
        <div className="text-[12.5px] text-ink3 mt-1.5">{convo.time} · via bramptonhale.co.uk</div>
      </header>

      <div className="bg-surface border border-line rounded-2xl p-[22px] flex flex-col gap-3.5">
        {convo.messages.map((m, i) =>
          m.role === 'user' ? (
            <div
              key={i}
              className="self-end max-w-[78%] bg-accent text-accent-ink px-3.5 py-2.5 text-[13.5px] leading-normal"
              style={{ borderRadius: '14px 14px 4px 14px' }}
            >
              {m.text}
            </div>
          ) : (
            <div key={i} className="self-start max-w-[84%] flex flex-col gap-[7px]">
              <div
                className="bg-page border border-line px-3.5 py-[11px] text-[13.5px] leading-relaxed"
                style={{ borderRadius: '14px 14px 14px 4px' }}
              >
                {m.text}
              </div>
              <div className="flex items-center gap-2 px-[3px] flex-wrap">
                {m.source ? (
                  <span className="inline-flex items-center gap-[5px] text-[11px] text-ink3">
                    <DocIcon />
                    From: {m.source}
                  </span>
                ) : null}
                {m.noSource ? (
                  <span className="text-[11px] text-ink3 italic">Not answered from knowledge base</span>
                ) : null}
                {m.visitorThumbDown ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bad">
                    <ThumbDownIcon />
                    Visitor marked unhelpful
                  </span>
                ) : null}
                <span className="flex-1" />
                <FlagButton />
              </div>
            </div>
          )
        )}
      </div>
      <div className="text-xs text-ink3 mt-3 leading-normal">
        Flagging sends the full conversation to Raz — you&rsquo;ll hear back within a working day.
      </div>
    </section>
  );
}
