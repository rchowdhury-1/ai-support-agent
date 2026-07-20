'use client';

/**
 * Client-side API layer. The access token lives in module memory only; the
 * refresh token is an httpOnly SameSite=Lax cookie scoped to /auth on this
 * origin (the backend is reached through Next rewrites, so cookies are
 * first-party). On 401 we silently refresh once and retry.
 */

export interface SessionUser {
  name: string;
  initials: string;
  businessName: string;
  role?: 'operator' | 'client';
}

let accessToken: string | null = null;
let currentUser: SessionUser | null = null;

export class AuthError extends Error {}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const d = await res.json();
    accessToken = d.accessToken;
    currentUser = d.user;
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? 'Sign in failed');
  }
  const d = await res.json();
  accessToken = d.accessToken;
  currentUser = d.user;
  return d.user;
}

export async function logout(): Promise<void> {
  accessToken = null;
  currentUser = null;
  await fetch('/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
}

/** Resolve the signed-in user, silently refreshing on first load. */
export async function ensureSession(): Promise<SessionUser> {
  if (currentUser && accessToken) return currentUser;
  const ok = await tryRefresh();
  if (!ok || !currentUser) throw new AuthError('Not signed in');
  return currentUser;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!accessToken) {
    const ok = await tryRefresh();
    if (!ok) throw new AuthError('Not signed in');
  }
  const doFetch = () =>
    fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        // FormData bodies set their own multipart boundary — only JSON strings
        // get an explicit content type.
        ...(typeof init?.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) throw new AuthError('Session expired');
    res = await doFetch();
  }
  if (res.status === 401 || res.status === 403) throw new AuthError('Not authorised');
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
