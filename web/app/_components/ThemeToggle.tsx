'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle({ size = 34 }: { size?: number }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-sai');
    if (current === 'dark') setTheme('dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-sai', next);
    try {
      localStorage.setItem('sai-theme', next);
    } catch {
      /* private mode */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label="Switch theme"
      className="border border-line rounded-[9px] bg-surface text-ink2 hover:text-ink hover:border-line-strong flex items-center justify-center flex-none cursor-pointer"
      style={{ width: size, height: size }}
    >
      {theme === 'light' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
