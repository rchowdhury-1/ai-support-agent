'use client';

/** Shared loading / error states for client-fetched pages. */

export function Loading() {
  return (
    <div className="py-24 text-center text-[13px] text-ink3" role="status">
      Loading…
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="py-24 text-center">
      <div className="text-[14px] font-bold text-ink mb-1">Couldn&rsquo;t load this page</div>
      <div className="text-[13px] text-ink3">{message}</div>
    </div>
  );
}
