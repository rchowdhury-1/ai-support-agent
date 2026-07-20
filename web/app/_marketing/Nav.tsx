import Link from 'next/link';
import { ThemeToggle } from '../_components/ThemeToggle';

const links = [
  ['#how', 'How it works'],
  ['#report', 'The report'],
  ['#who', "Who it's for"],
  ['#pricing', 'Pricing'],
] as const;

export function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-line backdrop-blur-[14px]"
      style={{ background: 'color-mix(in srgb, var(--p) 86%, transparent)' }}
    >
      <div className="max-w-site mx-auto px-6 py-3.5 flex items-center gap-7">
        <a href="#top" className="flex items-center gap-2.5 no-underline text-ink">
          <span className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center font-serif italic font-semibold text-[17px]">
            S
          </span>
          <span className="text-[16.5px] font-extrabold tracking-[-.02em]">SupportAI</span>
        </a>
        <div className="hidden lg:flex gap-[22px] flex-1">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="text-[13.5px] font-semibold text-ink2 no-underline whitespace-nowrap hover:text-ink">
              {label}
            </a>
          ))}
        </div>
        <span className="flex-1 lg:hidden" />
        <ThemeToggle />
        <Link href="/login" className="hidden lg:block text-[13.5px] font-semibold text-ink2 no-underline hover:text-ink">
          Log in
        </Link>
        <a href="#pricing" className="btn-primary text-[13.5px] px-4 py-2.5 rounded-[10px]">
          Book a call
        </a>
      </div>
    </nav>
  );
}
