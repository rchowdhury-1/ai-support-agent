import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createTenant, createUser, TEST_PASSWORD } from '../test/factories.js';

let email: string;

beforeAll(async () => {
  const tenant = await createTenant({ name: 'Brampton & Hale' });
  const user = await createUser({ tenantId: tenant.id, role: 'client', name: 'Sarah Hale' });
  email = user.email;
});

function refreshCookie(res: request.Response): string | undefined {
  const header = res.get('set-cookie') ?? [];
  const cookies = Array.isArray(header) ? header : [header];
  return cookies.find((c: string) => c.startsWith('sai_refresh='));
}

describe('POST /auth/login', () => {
  it('rejects bad credentials with 401', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(refreshCookie(res)).toBeUndefined();
  });

  it('returns an access token and sets an httpOnly SameSite=Lax refresh cookie', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({
      name: 'Sarah Hale',
      initials: 'SH',
      businessName: 'Brampton & Hale',
      role: 'client',
    });
    // Refresh token never appears in the body — cookie only.
    expect(JSON.stringify(res.body)).not.toContain('sai_refresh');

    const cookie = refreshCookie(res)!;
    expect(cookie).toBeTruthy();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/auth/i);
    // Secure is production-only (tests run with NODE_ENV=test over http).
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const login = await request(app).post('/auth/login').send({ email, password: TEST_PASSWORD });
    const oldCookie = refreshCookie(login)!;

    const first = await request(app).post('/auth/refresh').set('Cookie', oldCookie);
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toBeTruthy();
    const newCookie = refreshCookie(first)!;
    expect(newCookie).not.toBe(oldCookie);

    // The rotated-out token is dead; reusing it revokes the family.
    const replay = await request(app).post('/auth/refresh').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);

    // Reuse detection revoked everything, including the newest token.
    const afterReuse = await request(app).post('/auth/refresh').set('Cookie', newCookie);
    expect(afterReuse.status).toBe(401);
  });

  it('401s without a cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    const login = await request(app).post('/auth/login').send({ email, password: TEST_PASSWORD });
    const cookie = refreshCookie(login)!;

    const out = await request(app).post('/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);

    const res = await request(app).post('/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('no self-serve registration', () => {
  it('POST /auth/register does not exist', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'X', email: 'x@x.com', password: 'password123' });
    expect(res.status).toBe(404);
  });
});
