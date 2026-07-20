import Link from 'next/link';
import { listConversations } from '@/lib/api';
import { conversationPill, Pill } from '../../_components/Pill';

export const metadata = { title: 'Conversations — SupportAI' };

export default async function ConversationsPage() {
  const convos = await listConversations();

  return (
    <section className="fade-up">
      <header className="pt-[34px] pb-6">
        <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-[-.025em]">Conversations</h1>
        <div className="text-sm text-ink2">Every visitor chat, with the sources behind each answer.</div>
      </header>
      <div className="bg-surface border border-line rounded-[14px] px-5">
        {convos.map((c) => {
          const pill = conversationPill[c.status];
          return (
            <Link
              key={c.id}
              href={`/dashboard/conversations/${c.id}`}
              className="flex items-center gap-3.5 w-full py-[15px] border-b border-line no-underline text-ink hover:opacity-75 flex-wrap"
            >
              <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-none">
                {c.initials}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-[13.5px] font-semibold">{c.who}</div>
                <div className="text-[12.5px] text-ink2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[52ch]">
                  &ldquo;{c.firstQuestion}&rdquo;
                </div>
              </div>
              <div className="text-[11.5px] text-ink3 flex-none">{c.time}</div>
              <Pill tone={pill.tone}>{pill.label}</Pill>
            </Link>
          );
        })}
        <div className="py-[13px] text-xs text-ink3">Showing this week · 42 conversations in July so far</div>
      </div>
    </section>
  );
}
