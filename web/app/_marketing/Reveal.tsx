'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll reveal with staggered delay (index * 110ms), matching the design's
 * data-rv behaviour. The hidden state is applied on mount (never in SSR), so
 * content is always visible without JavaScript; reduced-motion skips entirely.
 */
export function Reveal({
  index = 0,
  className = '',
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    if (!('IntersectionObserver' in window) || document.hidden) return;

    node.classList.add('rv');
    node.style.transitionDelay = `${index * 110}ms`;

    const show = () => {
      node.classList.add('in');
      io.disconnect();
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) show();
      },
      { threshold: 0.12 }
    );
    io.observe(node);

    // Safety nets from the design: reveal on tab-hide and after a grace period.
    const onHide = () => document.hidden && show();
    document.addEventListener('visibilitychange', onHide);
    const t = setTimeout(show, 2500);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(t);
    };
  }, [index]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
