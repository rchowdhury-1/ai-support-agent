/**
 * Public widget API — the exact contract the deployed v2 widget speaks
 * (see vault doc "08 - v2 API Contract"). Origin-bound per agent via
 * agents.allowed_origins; no CORS wildcard. Caps and billing-state checks
 * fail closed into 402/429, which the widget renders as the polite
 * contact-form fallback — never a broken state. Ownership/authz resolution
 * always precedes any quota lookup. Support helpers live in ./chat-support.
 */
import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withSystem, withTenant } from '../db/tenant.js';
import { asyncHandler } from '../lib/http.js';
import { messageHandler } from './chat-message.js';
import { assertOrigin, loadAgent, resolveSession } from './chat-support.js';

const router = Router();

/**
 * Preflight: echo the requesting origin so the browser proceeds to the real
 * request, where the per-agent allowlist is enforced (the agent id lives in
 * the body, which preflights don't carry). Preflight itself exposes no data.
 */
router.options(/.*/, (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

// ── GET /chat/config ─────────────────────────────────────────────────────

router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const agent = await loadAgent(String(req.query.agentId ?? ''));
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    const paused = agent.status === 'paused' || agent.tenant_status !== 'active';
    res.json({
      agentName: agent.name,
      color: agent.color,
      theme: agent.theme,
      welcomeMessage: agent.welcome_message,
      suggestedQuestions: agent.suggested_questions,
      disclaimer: agent.disclaimer,
      poweredBy: agent.powered_by,
      status: paused ? 'paused' : 'live',
    });
  })
);

// ── POST /chat/start ─────────────────────────────────────────────────────

const startSchema = z.object({ agentId: z.string().uuid() });

router.post(
  '/start',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'agentId is required' });
      return;
    }
    const agent = await loadAgent(parsed.data.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    const sessionId = randomUUID();
    const { rows } = await withTenant(agent.tenant_id, (db) =>
      db.query(
        `INSERT INTO conversations (tenant_id, agent_id, session_id) VALUES ($1, $2, $3) RETURNING id`,
        [agent.tenant_id, agent.id, sessionId]
      )
    );
    res.json({
      sessionId,
      conversationId: rows[0].id,
      welcomeMessage: agent.welcome_message,
      agentName: agent.name,
      color: agent.color,
    });
  })
);

// ── GET /chat/:sessionId/history ─────────────────────────────────────────

router.get(
  '/:sessionId/history',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conv = await resolveSession(req.params.sessionId!);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    if (!assertOrigin(req, res, conv.agent)) return;

    const { rows } = await withTenant(conv.agent.tenant_id, (db) =>
      db.query(
        `SELECT id, role, content, citations, answer_status
         FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conv.id]
      )
    );
    res.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ?? undefined,
        answer_status: m.answer_status ?? undefined,
      })),
    });
  })
);

// ── POST /chat/message (streaming RAG turn — see chat-message.ts) ─────────

router.post('/message', messageHandler);

// ── POST /chat/feedback ──────────────────────────────────────────────────

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  rating: z.enum(['up', 'down']),
});

router.post(
  '/feedback',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'messageId and rating are required' });
      return;
    }
    const { messageId, rating } = parsed.data;
    await withSystem(async (db) => {
      const { rows } = await db.query(
        `UPDATE messages SET feedback = $2 WHERE id = $1 AND role = 'assistant' RETURNING tenant_id`,
        [messageId, rating]
      );
      if (rows[0] && rating === 'down') {
        await db.query(
          `INSERT INTO review_items (tenant_id, type, message_id) VALUES ($1, 'down', $2)`,
          [rows[0].tenant_id, messageId]
        );
      }
    });
    res.json({ ok: true });
  })
);

// ── POST /chat/escalate ──────────────────────────────────────────────────

const escalateSchema = z.object({
  agentId: z.string().uuid(),
  sessionId: z.string().optional(),
  name: z.string().min(1).max(255),
  contact: z.string().min(1).max(255),
  message: z.string().min(1).max(4000),
  source: z.enum(['no_answer', 'quota_fallback', 'agent_paused', 'error']),
});

/** Plain DB write — designed to keep working when the LLM is down. */
router.post(
  '/escalate',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = escalateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid escalation payload' });
      return;
    }
    const p = parsed.data;
    const agent = await loadAgent(p.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    await withTenant(agent.tenant_id, async (db) => {
      let conversationId: string | null = null;
      if (p.sessionId) {
        const { rows } = await db.query(
          `SELECT id FROM conversations WHERE session_id = $1 AND agent_id = $2`,
          [p.sessionId, agent.id]
        );
        conversationId = rows[0]?.id ?? null;
        if (conversationId) {
          await db.query(`UPDATE conversations SET status = 'escalated', visitor_name = $2 WHERE id = $1`, [
            conversationId,
            p.name,
          ]);
        }
      }
      await db.query(
        `INSERT INTO enquiries (tenant_id, agent_id, conversation_id, name, contact, question, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [agent.tenant_id, agent.id, conversationId, p.name, p.contact, p.message, p.source]
      );
    });
    res.json({ ok: true });
  })
);

export default router;
