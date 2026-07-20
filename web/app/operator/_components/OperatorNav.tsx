'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../../_components/ThemeToggle';

const items = [
  { key: 'tenants', label: 'Tenants', href: '/operator', also: ['/operator/tenants', '/operator/onboarding'] },
  { key: 'review', label: 'Review queue', href: '/operator/review', also: [] as string[] },
  { key: 'usage', label: 'Usage', href: '/operator/usage', also: [] as string[] },
];

export function OperatorNav({ reviewBadge }: { reviewBadge: number }) {
  const pathname = usePathname();
  const isActive = (item: (typeof items)[number]) =>
    item.href === '/operator'
      ? pathname === '/operator' || item.also.some((a) => pathname.startsWith(a))
      : pathname.startsWith(item.href);

  return (
    <nav
      className="sticky top-0 z-40 border-b border-line backdrop-blur-[12px]"
      style={{ background: 'color-mix(in srgb, var(--p) 88%, transparent)' }}
    >
      <div className="max-w-[1360px] mx-auto px-[22px] py-2.5 flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-[9px]">
          <span className="w-6 h-6 rounded-[7px] bg-accent text-accent-ink flex items-center justify-center font-serif italic text-[15px]">
            S
          </span>
          <span className="text-sm font-extrabold tracking-[-.02em]">SupportAI</span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-ink3 border border-line rounded-full px-2 py-[3px]">
            Operator
          </span>
        </span>
        <div className="flex gap-1">
          {items.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.key}
                href={n.href}
                className={`flex items-center gap-[7px] rounded-[9px] text-[12.5px] font-bold px-[13px] py-2 no-underline hover:bg-accent-soft ${
                  active ? 'bg-accent-soft text-accent' : 'text-ink2'
                }`}
              >
                {n.label}
                {n.key === 'review' && reviewBadge > 0 ? (
                  <span
                    className="text-[10px] font-extrabold rounded-full px-1.5 py-0.5"
                    style={{ background: 'color-mix(in srgb, var(--rd) 14%, transparent)', color: 'var(--rd)' }}
                  >
                    {reviewBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        <span className="flex-1" />
        <ThemeToggle size={30} />
        <Link href="/operator/onboarding" className="btn-primary text-[12.5px] px-[15px] py-[9px] rounded-[9px]">
          + New tenant
        </Link>
      </div>
    </nav>
  );
}
