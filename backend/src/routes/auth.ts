/**
 * v2 auth. No self-serve registration — users are provisioned by the operator.
 * Access token: 15m JWT, held in memory by the client only.
 * Refresh token: opaque random value in an httpOnly Secure SameSite=Lax cookie
 * scoped to /auth; stored server-side as a SHA-256 hash; rotated on every use,
 * with reuse detection revoking the whole family.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { withSystem } from '../db/tenant.js';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

export const REFRESH_COOKIE = 'sai_refresh';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccessClaims {
  sub: string;
  tenantId: string | null;
  role: 'operator' | 'client';
}

interface AuthUser {
  id: string;
  tenant_id: string | null;
  role: 'operator' | 'client';
  name: string;
  business_name: string | null;
}

function signAccessToken(user: AuthUser): string {
  const claims: Omit<AccessClaims, 'sub'> = { tenantId: user.tenant_id, role: user.role };
  return jwt.sign(claims, process.env.JWT_SECRET!, { subject: user.id, expiresIn: '15m' });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

function sessionUser(user: AuthUser) {
  return {
    name: user.name,
    initials: initials(user.name),
    businessName: user.business_name ?? 'SupportAI',
    role: user.role,
  };
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(48).toString('base64url');
  await withSystem((db) =>
    db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
      userId,
      hashToken(token),
      new Date(Date.now() + REFRESH_TTL_MS),
    ])
  );
  return token;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/auth',
    maxAge: REFRESH_TTL_MS,
  });
}

const USER_QUERY = `
  SELECT u.id, u.tenant_id, u.role, u.name, u.password_hash, t.name AS business_name
  FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
`;

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const { rows } = await withSystem((db) =>
      db.query(`${USER_QUERY} WHERE u.email = $1`, [email.toLowerCase()])
    );
    const user = rows[0] as (AuthUser & { password_hash: string }) | undefined;
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    setRefreshCookie(res, await issueRefreshToken(user.id));
    res.json({ accessToken: signAccessToken(user), user: sessionUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const result = await withSystem(async (db) => {
      const { rows } = await db.query(
        'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
        [hashToken(token)]
      );
      const stored = rows[0];
      if (!stored) return null;
      if (stored.revoked_at || new Date(stored.expires_at) < new Date()) {
        // Reuse of a rotated/expired token — revoke everything for this user.
        await db.query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
          [stored.user_id]
        );
        return null;
      }
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [stored.id]);
      const userRows = await db.query(`${USER_QUERY} WHERE u.id = $1`, [stored.user_id]);
      return (userRows.rows[0] as AuthUser | undefined) ?? null;
    });

    if (!result) {
      res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    setRefreshCookie(res, await issueRefreshToken(result.id));
    res.json({ accessToken: signAccessToken(result), user: sessionUser(result) });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await withSystem((db) =>
      db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [
        hashToken(token),
      ])
    ).catch(() => undefined);
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  res.json({ ok: true });
});

export default router;
