'use client';

import Link from 'next/link';
import { useData } from '@/lib/use-data';
import { LoadError, Loading } from '@/lib/ui-state';
import { listConversations } from '@/lib/api';
import { conversationPill, Pill } from '../../_components/Pill';

export default function ConversationsPage() {
  const { data: convos, error } = useData(listConversations);
  if (error) return <LoadError message={error} />;
  if (!convos) return <Loading />;

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
        {convos.length === 0 ? (
          <div className="py-11 text-center">
            <div className="text-[13.5px] font-bold mb-1">No conversations yet</div>
            <div className="text-[12.5px] text-ink2">Visitor chats appear here the moment the widget answers its first question.</div>
          </div>
        ) : null}
        <div className="py-[13px] text-xs text-ink3">
          Showing the most recent {convos.length} conversation{convos.length === 1 ? '' : 's'}
        </div>
      </div>
    </section>
  );
}
