'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '../../_components/ThemeToggle';
import { logout } from '@/lib/client';
import type { SessionUser } from '@/lib/types';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string; // single SVG path, from the design
  badge?: number;
}

export function navIsActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(item.href);
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span
      className="text-[10.5px] font-bold rounded-full px-[7px] py-0.5"
      style={{ background: 'color-mix(in srgb, var(--am) 15%, transparent)', color: 'var(--am)' }}
    >
      {n}
    </span>
  );
}

export function Sidebar({ items, user }: { items: NavItem[]; user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden md:flex w-[236px] flex-none border-r border-line bg-surface flex-col px-3.5 py-5 sticky top-0 h-screen box-border">
      <div className="flex items-center gap-[9px] px-2 mb-1.5">
        <span className="w-[26px] h-[26px] rounded-lg bg-accent text-accent-ink flex items-center justify-center font-serif italic text-base">
          S
        </span>
        <span className="text-[15px] font-extrabold tracking-[-.02em]">SupportAI</span>
      </div>
      <div className="mx-2 mb-[18px] text-[11.5px] text-ink3 pl-[35px]">{user.businessName}</div>

      <nav className="flex flex-col gap-0.5">
        {items.map((n) => {
          const active = navIsActive(pathname, n);
          return (
            <Link
              key={n.key}
              href={n.href}
              className={`flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] no-underline text-[13.5px] hover:bg-accent-soft ${
                active ? 'bg-accent-soft text-accent font-bold' : 'text-ink2 font-semibold'
              }`}
            >
              <span className={`flex w-4 ${active ? 'text-accent' : 'text-ink3'}`}>
                <NavIcon d={n.icon} />
              </span>
              <span className="flex-1">{n.label}</span>
              {n.badge ? <Badge n={n.badge} /> : null}
            </Link>
          );
        })}
      </nav>

      <span className="flex-1" />

      <div className="mx-1 mb-3 bg-accent-soft rounded-xl px-3.5 py-[13px]">
        <div className="text-[12.5px] font-bold text-ink mb-[3px]">Need a hand?</div>
        <div className="text-xs text-ink2 leading-normal">Message Raz directly — replies same day.</div>
        <a href="mailto:razwanulchowdhury@gmail.com" className="inline-block mt-2 text-[12.5px] font-bold text-accent no-underline">
          Contact Raz →
        </a>
      </div>

      <div className="flex items-center gap-2 px-1">
        <div className="w-[30px] h-[30px] rounded-full bg-accent text-accent-ink flex items-center justify-center text-xs font-bold flex-none">
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</div>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="border-none bg-transparent p-0 text-[11px] text-ink3 hover:text-ink cursor-pointer"
          >
            Sign out
          </button>
        </div>
        <ThemeToggle size={28} />
      </div>
    </aside>
  );
}

/** Mobile fallback: chip nav across the top (design's data-topnav). */
export function NavChips({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="flex md:hidden gap-1.5 flex-wrap pt-3.5">
      {items.map((n) => {
        const active = navIsActive(pathname, n);
        return (
          <Link
            key={n.key}
            href={n.href}
            className={`border border-line rounded-full text-[12.5px] font-semibold px-[13px] py-[7px] no-underline ${
              active ? 'bg-accent-soft text-accent' : 'bg-surface text-ink2'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </div>
  );
}
