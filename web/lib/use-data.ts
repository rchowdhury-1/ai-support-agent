'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthError } from './client';

/**
 * Minimal client data hook: fetch on mount, redirect to /login on auth
 * failure, expose reload() for after mutations.
 */
export function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): {
  data: T | undefined;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let live = true;
    fetcherRef
      .current()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((err) => {
        if (!live) return;
        if (err instanceof AuthError) {
          window.location.href = '/login';
          return;
        }
        setError(err instanceof Error ? err.message : 'Something went wrong');
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}

