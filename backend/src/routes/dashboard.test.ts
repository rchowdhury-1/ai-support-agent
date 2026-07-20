import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../services/generation.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, generateAnswer: vi.fn() };
});
vi.mock('../services/embeddings.js', () => ({
  embedQuery: vi.fn(async () => {
    const v = new Array(1536).fill(0);
    v[0] = 1;
    return v;
  }),
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map(() => {
      const v = new Array(1536).fill(0);
      v[0] = 1;
      return v;
    })
  ),
}));

import app from '../app.js';
import { generateAnswer } from '../services/generation.js';
import { withSystem } from '../db/tenant.js';
import {
  createAgent,
  createConversation,
  createMessage,
  createTenant,
  createUser,
  truncateAll,
} from '../test/factories.js';

const generateMock = vi.mocked(generateAnswer);

let tenantA: { id: string };
let tenantB: { id: string };
let agentA: { id: string };
let clientToken: string;
let operatorToken: string;
let convA: { id: string };

function tokenFor(userId: string, tenantId: string | null, role: 'client' | 'operator'): string {
  return jwt.sign({ tenantId, role }, process.env.JWT_SECRET!, { subject: userId, expiresIn: '5m' });
}

beforeAll(async () => {
  await truncateAll();
  tenantA = await createTenant({ name: 'Brampton & Hale', monthly_amount_pence: 9900 });
  tenantB = await createTenant({ name: 'Aldergate Solicitors' });
  agentA = await createAgent(tenantA.id, { name: 'Brampton & Hale assistant' });
  await createAgent(tenantB.id);

  const clientUser = await createUser({ tenantId: tenantA.id, role: 'client', name: 'Sarah Hale' });
  const operator = await createUser({ tenantId: null, role: 'operator', name: 'Raz C' });
  clientToken = tokenFor(clientUser.id, tenantA.id, 'client');
  operatorToken = tokenFor(operator.id, null, 'operator');

  convA = await createConversation(tenantA.id, agentA.id, { visitor_name: 'Tom Vale' });
  await createMessage(tenantA.id, convA.id, { role: 'user', content: 'How much is a tax return?' });
  await createMessage(tenantA.id, convA.id, {
    role: 'assistant',
    content: 'Self-assessment costs £180.',
    answer_status: 'answered',
    citations: [{ title: 'Services & Fees' }],
  });
  await withSystem((db) =>
    db.query(`UPDATE conversations SET messages_count = 2 WHERE id = $1`, [convA.id])
  );

  // Cross-tenant data that must never leak into tenant A responses.
  const convB = await createConversation(tenantB.id, (await createAgent(tenantB.id)).id);
  await createMessage(tenantB.id, convB.id, { role: 'user', content: 'Aldergate privileged matter' });

  await withSystem((db) =>
    db.query(
      `INSERT INTO enquiries (tenant_id, agent_id, name, contact, question)
       VALUES ($1, $2, 'Priya N', 'priya@example.co.uk', 'Do you handle probate?')`,
      [tenantA.id, agentA.id]
    )
  );
});

describe('auth gates', () => {
  it('rejects anonymous and cross-role access', async () => {
    expect((await request(app).get('/api/overview')).status).toBe(401);
    expect(
      (await request(app).get('/api/admin/tenants').set('Authorization', `Bearer ${clientToken}`))
        .status
    ).toBe(403);
    expect(
      (await request(app).get('/api/overview').set('Authorization', `Bearer ${operatorToken}`))
        .status
    ).toBe(403);
  });
});

describe('client dashboard', () => {
  const auth = () => `Bearer ${clientToken}`;

  it('GET /api/me returns the session user', async () => {
    const res = await request(app).get('/api/me').set('Authorization', auth());
    expect(res.body).toEqual({
      name: 'Sarah Hale',
      initials: 'SH',
      businessName: 'Brampton & Hale',
    });
  });

  it('GET /api/overview returns stats, spark and waiting enquiries', async () => {
    const res = await request(app).get('/api/overview').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveLength(4);
    expect(res.body.stats[0]).toMatchObject({ label: 'Conversations', value: '1' });
    expect(res.body.spark).toHaveLength(14);
    expect(res.body.waiting[0]).toMatchObject({ name: 'Priya N', initials: 'PN' });
  });

  it('GET /api/conversations lists only this tenant′s conversations', async () => {
    const res = await request(app).get('/api/conversations').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      who: 'Tom Vale',
      initials: 'TV',
      firstQuestion: 'How much is a tax return?',
      status: 'answered',
    });
    expect(JSON.stringify(res.body)).not.toContain('Aldergate');
  });

  it('GET /api/conversations/:id returns the transcript with citations', async () => {
    const res = await request(app)
      .get(`/api/conversations/${convA.id}`)
      .set('Authorization', auth());
    expect(res.body.messages).toEqual([
      { role: 'user', text: 'How much is a tax return?' },
      { role: 'assistant', text: 'Self-assessment costs £180.', source: 'Services & Fees' },
    ]);
  });

  it('flagging a message creates a review item', async () => {
    const res = await request(app)
      .post(`/api/conversations/${convA.id}/messages/1/flag`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    const items = await withSystem((db) =>
      db.query(`SELECT type FROM review_items WHERE tenant_id = $1 AND type = 'flag'`, [tenantA.id])
    );
    expect(items.rows).toHaveLength(1);
  });

  it('GET /api/insights always includes the current month', async () => {
    const res = await request(app).get('/api/insights').set('Authorization', auth());
    expect(res.status).toBe(200);
    const latest = res.body.at(-1);
    expect(latest.key).toBe(new Date().toISOString().slice(0, 7));
    expect(latest.empty).toBe(true);
    expect(latest.emptyStats.answered).toBeGreaterThanOrEqual(1);
  });

  it('enquiry status advances New → Contacted', async () => {
    const list = await request(app).get('/api/enquiries').set('Authorization', auth());
    const id = list.body[0].id;
    const res = await request(app)
      .put(`/api/enquiries/${id}/status`)
      .set('Authorization', auth())
      .send({ status: 'contacted' });
    expect(res.status).toBe(200);
    const after = await request(app).get('/api/enquiries').set('Authorization', auth());
    expect(after.body[0].status).toBe('contacted');
  });

  it('GET /api/billing formats the plan summary', async () => {
    const res = await request(app).get('/api/billing').set('Authorization', auth());
    expect(res.body.monthlyLine).toBe('£99 / month');
    expect(res.body.planStatus).toBe('active');
  });
});

describe('operator dashboard', () => {
  const auth = () => `Bearer ${operatorToken}`;

  it('GET /api/admin/tenants lists every tenant with display fields', async () => {
    const res = await request(app).get('/api/admin/tenants').set('Authorization', auth());
    expect(res.status).toBe(200);
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('Brampton & Hale');
    expect(names).toContain('Aldergate Solicitors');
    const bh = res.body.find((t: { name: string }) => t.name === 'Brampton & Hale');
    expect(bh).toMatchObject({ model: 'Haiku', status: 'active' });
    expect(bh.cost).toMatch(/^£\d+\.\d{2}$/);
    expect(bh.caps.monthly).toBe('1,000');
  });

  it('creates a tenant with a default agent, then updates agent config', async () => {
    const created = await request(app)
      .post('/api/admin/tenants')
      .set('Authorization', auth())
      .send({ name: 'Kentish Heating Co', domain: 'kentishheating.co.uk' });
    expect(created.status).toBe(201);
    const { tenantId } = created.body;

    const update = await request(app)
      .put(`/api/admin/tenants/${tenantId}/agent`)
      .set('Authorization', auth())
      .send({
        model: 'sonnet',
        accent: '#B3552E',
        allowedOrigins: ['https://kentishheating.co.uk'],
        monthlyCap: 1000,
        onboardingStep: 3,
      });
    expect(update.status).toBe(200);

    const got = await request(app).get(`/api/admin/tenants/${tenantId}`).set('Authorization', auth());
    expect(got.body).toMatchObject({
      model: 'Sonnet',
      accent: '#B3552E',
      status: 'pending',
      onboardingStep: 3,
      allowedOrigins: ['https://kentishheating.co.uk'],
    });
  });

  it('pause flips the agent to paused and the widget config follows', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${tenantA.id}/pause`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    const cfg = await request(app).get(`/chat/config?agentId=${agentA.id}`);
    expect(cfg.body.status).toBe('paused');
    await request(app).post(`/api/admin/tenants/${tenantA.id}/resume`).set('Authorization', auth());
    const cfg2 = await request(app).get(`/chat/config?agentId=${agentA.id}`);
    expect(cfg2.body.status).toBe('live');
  });

  it('provisions a client login for a tenant', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${tenantB.id}/client-user`)
      .set('Authorization', auth())
      .send({ name: 'Ana Aldergate', email: 'ana@aldergatelaw.co.uk', password: 'long-password-1' });
    expect(res.status).toBe(201);
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@aldergatelaw.co.uk', password: 'long-password-1' });
    expect(login.status).toBe(200);
    expect(login.body.user.businessName).toBe('Aldergate Solicitors');
  });

  it('text source ingestion lands in the sources list', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${tenantA.id}/sources`)
      .set('Authorization', auth())
      .send({ kind: 'text', name: 'Onboarding FAQ', text: 'We onboard new clients within one week.' });
    expect(res.status).toBe(202);

    // Ingestion runs async — wait for it to settle.
    await vi.waitFor(async () => {
      const list = await request(app)
        .get(`/api/admin/tenants/${tenantA.id}/sources`)
        .set('Authorization', auth());
      const src = list.body.find((s: { name: string }) => s.name === 'Onboarding FAQ');
      expect(src?.status).toBe('synced');
      expect(src?.type).toBe('Text');
      expect(src?.size).toContain('chunks');
    });
  });

  it('sandbox runs retrieval + generation with telemetry', async () => {
    generateMock.mockResolvedValue({
      answer: 'We onboard new clients within one week.',
      status: 'answered',
      questionType: 'onboarding',
      citations: [1],
      tokensIn: 500,
      tokensOut: 40,
      costUsd: 0.0007,
    });
    const res = await request(app)
      .post(`/api/admin/tenants/${tenantA.id}/sandbox`)
      .set('Authorization', auth())
      .send({ question: 'How fast do you onboard?' });
    expect(res.status).toBe(200);
    expect(res.body.text).toContain('one week');
    expect(res.body.srcLine).toContain('From:');
    expect(res.body.chunks[0]).toMatchObject({ src: expect.any(String), sim: expect.any(Number) });
    expect(res.body.meta).toMatch(/Haiku · [\d.]+s · £/);
  });

  it('review queue surfaces flags and resolves them', async () => {
    const res = await request(app).get('/api/admin/review').set('Authorization', auth());
    expect(res.status).toBe(200);
    const flag = res.body.find((r: { type: string }) => r.type === 'flag');
    expect(flag).toBeTruthy();
    expect(flag.tenant).toBe('Brampton & Hale');
    expect(flag.answer).toContain('£180');

    const resolve = await request(app)
      .post(`/api/admin/review/${flag.id}/resolve`)
      .set('Authorization', auth())
      .send({ resolution: 'resolved' });
    expect(resolve.status).toBe(200);

    const after = await request(app).get('/api/admin/review').set('Authorization', auth());
    expect(after.body.find((r: { id: string }) => r.id === flag.id)).toBeUndefined();
  });

  it('usage reports per-tenant rows and 14 daily bars', async () => {
    await withSystem((db) =>
      db.query(
        `INSERT INTO usage_daily (tenant_id, agent_id, day, messages, tokens_in, tokens_out, cost_usd)
         VALUES ($1, $2, CURRENT_DATE, 900, 100000, 20000, 1.5)
         ON CONFLICT (tenant_id, agent_id, day) DO UPDATE SET messages = 900`,
        [tenantA.id, agentA.id]
      )
    );
    const res = await request(app).get('/api/admin/usage').set('Authorization', auth());
    const row = res.body.rows.find((r: { name: string }) => r.name === 'Brampton & Hale');
    expect(row.msgs).toBeGreaterThanOrEqual(900);
    expect(row.alert).toContain('% of cap');
    expect(res.body.bars).toHaveLength(14);
  });

  it('insight triage maps operator actions to client-visible statuses', async () => {
    const { rows } = await withSystem((db) =>
      db.query(
        `INSERT INTO insights (tenant_id, agent_id, month, question)
         VALUES ($1, $2, to_char(CURRENT_DATE, 'YYYY-MM'), 'Do you offer payroll services?')
         RETURNING id`,
        [tenantA.id, agentA.id]
      )
    );
    const res = await request(app)
      .post(`/api/admin/insights/${rows[0].id}/triage`)
      .set('Authorization', auth())
      .send({ action: 'added' });
    expect(res.body.status).toBe('added');

    const client = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${clientToken}`);
    const month = client.body.at(-1);
    expect(month.rows[0]).toMatchObject({ question: 'Do you offer payroll services?', status: 'added' });
  });
});
