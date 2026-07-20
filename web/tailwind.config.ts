import type { Config } from 'tailwindcss';

/**
 * Design tokens live as CSS variables in globals.css ([data-sai='light'|'dark']);
 * Tailwind colors alias them so utilities stay theme-aware.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--p)',
        surface: 'var(--s)',
        line: 'var(--b)',
        'line-strong': 'var(--bs)',
        ink: 'var(--t)',
        ink2: 'var(--t2)',
        ink3: 'var(--t3)',
        accent: 'var(--a)',
        'accent-ink': 'var(--ai)',
        'accent-soft': 'var(--asf)',
        good: 'var(--g)',
        warn: 'var(--am)',
        bad: 'var(--rd)',
        sunken: 'var(--sk)',
        code: 'var(--code)',
        codet: 'var(--codet)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: { site: '1140px' },
    },
  },
  plugins: [],
};

export default config;
