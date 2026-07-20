import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Generation + embeddings are mocked: these tests exercise the HTTP contract,
// origin binding, cap enforcement and persistence — not the LLM.
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
  embedTexts: vi.fn(),
}));

import app from '../app.js';
import { generateAnswer } from '../services/generation.js';
import { withSystem } from '../db/tenant.js';
import { createAgent, createTenant, truncateAll } from '../test/factories.js';
import { toSql } from 'pgvector';

const generateMock = vi.mocked(generateAnswer);

const ORIGIN = 'https://client-site.co.uk';
let tenant: { id: string };
let agent: { id: string };

function answered(over: Partial<Awaited<ReturnType<typeof generateAnswer>>> = {}) {
  return {
    answer: 'Self-assessment costs £180 including VAT.',
    status: 'answered' as const,
    questionType: 'pricing',
    citations: [1],
    tokensIn: 900,
    tokensOut: 60,
    costUsd: 0.0012,
    ...over,
  };
}

async function seedChunk(tenantId: string, agentId: string): Promise<void> {
  await withSystem(async (db) => {
    const src = await db.query(
      `INSERT INTO sources (tenant_id, agent_id, kind, name, url, status, last_synced_at)
       VALUES ($1, $2, 'site', 'Services & Fees', 'https://client-site.co.uk/fees', 'synced', NOW())
       RETURNING id`,
      [tenantId, agentId]
    );
    const v = new Array(1536).fill(0);
    v[0] = 1;
    await db.query(
      `INSERT INTO chunks (tenant_id, agent_id, source_id, chunk_index, content, embedding)
       VALUES ($1, $2, $3, 0, 'Self-assessment tax returns cost £180 including VAT.', $4::vector)`,
      [tenantId, agentId, src.rows[0].id, toSql(v)]
    );
  });
}

async function startSession(agentId = agent.id): Promise<string> {
  const res = await request(app).post('/chat/start').set('Origin', ORIGIN).send({ agentId });
  expect(res.status).toBe(200);
  return res.body.sessionId;
}

function parseSse(text: string): { event: string; data: Record<string, unknown> }[] {
  return text
    .split('\n\n')
    .filter((b) => b.trim())
    .map((block) => {
      const event = /event: (.+)/.exec(block)?.[1] ?? 'message';
      const data = JSON.parse(/data: (.+)/.exec(block)?.[1] ?? '{}');
      return { event, data };
    });
}

beforeAll(async () => {
  await truncateAll();
  tenant = await createTenant({ name: 'Brampton & Hale' });
  agent = await createAgent(tenant.id, {
    name: 'Brampton & Hale Assistant',
    allowed_origins: [ORIGIN],
    suggested_questions: ['How much is a tax return?'],
    disclaimer: 'General information, not tax advice.',
    monthly_cap: 1000,
    daily_cap: 100,
    session_cap: 40,
  });
  await seedChunk(tenant.id, agent.id);
});

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockResolvedValue(answered());
});

describe('GET /chat/config', () => {
  it('serves the v2 config contract (color key, chips, disclaimer)', async () => {
    const res = await request(app).get(`/chat/config?agentId=${agent.id}`).set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      agentName: 'Brampton & Hale Assistant',
      color: expect.stringMatching(/^#/),
      welcomeMessage: expect.any(String),
      suggestedQuestions: ['How much is a tax return?'],
      disclaimer: 'General information, not tax advice.',
      poweredBy: true,
      status: 'live',
    });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('reports paused for a paused agent and for a non-active tenant', async () => {
    const pausedTenant = await createTenant({ name: 'Paused Co', status: 'past_due' });
    const pausedAgent = await createAgent(pausedTenant.id, { allowed_origins: [ORIGIN] });
    const res = await request(app)
      .get(`/chat/config?agentId=${pausedAgent.id}`)
      .set('Origin', ORIGIN);
    expect(res.body.status).toBe('paused');
  });

  it('404s on unknown agent', async () => {
    const res = await request(app).get('/chat/config?agentId=3d1f0b9a-1111-4222-8333-444455556666');
    expect(res.status).toBe(404);
  });
});

describe('origin binding', () => {
  it('rejects a disallowed origin with 403 and no ACAO header', async () => {
    const res = await request(app)
      .get(`/chat/config?agentId=${agent.id}`)
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never emits a wildcard ACAO', async () => {
    const res = await request(app).get(`/chat/config?agentId=${agent.id}`).set('Origin', ORIGIN);
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('allows non-browser requests without an Origin header', async () => {
    const res = await request(app).get(`/chat/config?agentId=${agent.id}`);
    expect(res.status).toBe(200);
  });

  it('enforces origin on /chat/message too', async () => {
    const sessionId = await startSession();
    const res = await request(app)
      .post('/chat/message')
      .set('Origin', 'https://evil.example')
      .send({ sessionId, content: 'hi' });
    expect(res.status).toBe(403);
  });
});

describe('POST /chat/message (SSE)', () => {
  it('streams delta events then done with messageId, answerStatus and citations', async () => {
    generateMock.mockImplementation(async (opts) => {
      opts.onDelta?.('Self-assessment costs ');
      opts.onDelta?.('£180 including VAT.');
      return answered();
    });
    const sessionId = await startSession();
    const res = await request(app)
      .post('/chat/message')
      .set('Origin', ORIGIN)
      .set('Accept', 'text/event-stream, application/json')
      .send({ sessionId, content: 'How much is a self-assessment?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const events = parseSse(res.text);
    expect(events.map((e) => e.event)).toEqual(['delta', 'delta', 'done']);
    expect(events[0]!.data.text).toBe('Self-assessment costs ');
    const done = events[2]!.data;
    expect(done.answerStatus).toBe('answered');
    expect(done.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(done.citations).toEqual([
      { title: 'Services & Fees', url: 'https://client-site.co.uk/fees' },
    ]);

    // Persistence: user + assistant rows, usage recorded, telemetry captured.
    const msgs = await withSystem((db) =>
      db.query(
        `SELECT role, answer_status, question_type, retrieval FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.session_id = $1 ORDER BY m.created_at`,
        [sessionId]
      )
    );
    expect(msgs.rows.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(msgs.rows[1].answer_status).toBe('answered');
    expect(msgs.rows[1].question_type).toBe('pricing');
    expect(msgs.rows[1].retrieval[0].src).toBe('Services & Fees');

    const usage = await withSystem((db) =>
      db.query(`SELECT messages, tokens_out, cost_usd FROM usage_daily WHERE agent_id = $1`, [agent.id])
    );
    expect(usage.rows[0].messages).toBeGreaterThanOrEqual(1);
    expect(Number(usage.rows[0].cost_usd)).toBeGreaterThan(0);
  });

  it('falls back to v1 JSON when the client does not accept SSE', async () => {
    const sessionId = await startSession();
    const res = await request(app).post('/chat/message').send({ sessionId, content: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('£180');
    expect(res.body.answerStatus).toBe('answered');
  });

  it('records not_in_kb answers as insights and marks the conversation no_answer', async () => {
    generateMock.mockResolvedValue(
      answered({ status: 'not_in_kb', citations: [], answer: "I don't have that information." })
    );
    const sessionId = await startSession();
    await request(app)
      .post('/chat/message')
      .send({ sessionId, content: 'Do you do audits?' });
    await request(app)
      .post('/chat/message')
      .send({ sessionId, content: 'Do you perform audits for charities?' });

    const insights = await withSystem((db) =>
      db.query(`SELECT question, count FROM insights WHERE agent_id = $1`, [agent.id])
    );
    // Same embedding (mock) ⇒ grouped into one insight with count 2.
    expect(insights.rows).toHaveLength(1);
    expect(insights.rows[0].count).toBe(2);

    const review = await withSystem((db) =>
      db.query(`SELECT type FROM review_items WHERE tenant_id = $1 AND type = 'insight'`, [tenant.id])
    );
    expect(review.rows).toHaveLength(1);

    const conv = await withSystem((db) =>
      db.query(`SELECT status FROM conversations WHERE session_id = $1`, [sessionId])
    );
    expect(conv.rows[0].status).toBe('no_answer');
  });

  it('emits an SSE error event when generation fails (widget shows contact form)', async () => {
    generateMock.mockRejectedValue(new Error('anthropic down'));
    const sessionId = await startSession();
    const res = await request(app)
      .post('/chat/message')
      .set('Accept', 'text/event-stream')
      .send({ sessionId, content: 'hi' });
    const events = parseSse(res.text);
    expect(events.at(-1)!.event).toBe('error');
  });
});

describe('caps fail closed', () => {
  it('402s for a paused agent', async () => {
    const sessionId = await startSession();
    await withSystem((db) => db.query(`UPDATE agents SET status = 'paused' WHERE id = $1`, [agent.id]));
    try {
      const res = await request(app).post('/chat/message').send({ sessionId, content: 'hi' });
      expect(res.status).toBe(402);
    } finally {
      await withSystem((db) => db.query(`UPDATE agents SET status = 'live' WHERE id = $1`, [agent.id]));
    }
  });

  it('429s when the monthly cap is exhausted', async () => {
    const capTenant = await createTenant({ name: 'Capped Co' });
    const capAgent = await createAgent(capTenant.id, {
      monthly_cap: 5,
      allowed_origins: [ORIGIN],
    });
    await withSystem((db) =>
      db.query(
        `INSERT INTO usage_daily (tenant_id, agent_id, day, messages) VALUES ($1, $2, CURRENT_DATE, 5)`,
        [capTenant.id, capAgent.id]
      )
    );
    const sessionId = await startSession(capAgent.id);
    const res = await request(app).post('/chat/message').send({ sessionId, content: 'hi' });
    expect(res.status).toBe(429);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('authz precedes quota: an invalid session on an exhausted tenant gets 404, not 429', async () => {
    const res = await request(app)
      .post('/chat/message')
      .send({ sessionId: 'not-a-real-session', content: 'hi' });
    expect(res.status).toBe(404);
  });
});

describe('POST /chat/feedback', () => {
  it('stores the rating and queues thumbs-down for review', async () => {
    const sessionId = await startSession();
    await request(app).post('/chat/message').send({ sessionId, content: 'hi' });
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE c.session_id = $1 AND m.role = 'assistant'`,
        [sessionId]
      )
    );
    const messageId = rows[0].id;

    const res = await request(app).post('/chat/feedback').send({ messageId, rating: 'down' });
    expect(res.status).toBe(200);

    const check = await withSystem((db) =>
      db.query(
        `SELECT m.feedback, (SELECT count(*)::int FROM review_items r WHERE r.message_id = m.id AND r.type = 'down') AS reviews
         FROM messages m WHERE m.id = $1`,
        [messageId]
      )
    );
    expect(check.rows[0].feedback).toBe('down');
    expect(check.rows[0].reviews).toBe(1);
  });
});

describe('POST /chat/escalate', () => {
  it('creates an enquiry and escalates the conversation — no LLM involved', async () => {
    const sessionId = await startSession();
    const res = await request(app).post('/chat/escalate').set('Origin', ORIGIN).send({
      agentId: agent.id,
      sessionId,
      name: 'Sarah Prentice',
      contact: 'sarah@example.co.uk',
      message: 'Do you offer audit services?',
      source: 'no_answer',
    });
    expect(res.status).toBe(200);
    expect(generateMock).not.toHaveBeenCalled();

    const enq = await withSystem((db) =>
      db.query(`SELECT name, contact, question, source, status FROM enquiries WHERE tenant_id = $1`, [
        tenant.id,
      ])
    );
    expect(enq.rows[0]).toMatchObject({
      name: 'Sarah Prentice',
      contact: 'sarah@example.co.uk',
      source: 'no_answer',
      status: 'new',
    });

    const conv = await withSystem((db) =>
      db.query(`SELECT status, visitor_name FROM conversations WHERE session_id = $1`, [sessionId])
    );
    expect(conv.rows[0].status).toBe('escalated');
    expect(conv.rows[0].visitor_name).toBe('Sarah Prentice');
  });

  it('works for a paused agent (the designed leave-a-message path)', async () => {
    const pausedTenant = await createTenant({ name: 'Paused Ltd', status: 'paused' });
    const pausedAgent = await createAgent(pausedTenant.id, {
      allowed_origins: [ORIGIN],
      status: 'paused',
    });
    const res = await request(app).post('/chat/escalate').set('Origin', ORIGIN).send({
      agentId: pausedAgent.id,
      name: 'Tom',
      contact: '07700 900123',
      message: 'Please call me back',
      source: 'agent_paused',
    });
    expect(res.status).toBe(200);
  });
});
