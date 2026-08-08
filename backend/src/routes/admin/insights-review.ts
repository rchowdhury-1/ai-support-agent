import { Router, type Response } from 'express';
import { z } from 'zod';
import { type AuthedRequest } from '../../middleware/auth.js';
import { withSystem } from '../../db/tenant.js';
import { asyncHandler } from '../../lib/http.js';
import { dayMonth, relTime } from '../../lib/format.js';

const router = Router();

// ── Insights triage ──────────────────────────────────────────────────────

router.get(
  '/tenants/:id/insights',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT id, question, count, status, last_asked_at FROM insights
         WHERE tenant_id = $1 AND status IN ('new','fixing')
         ORDER BY count DESC, last_asked_at DESC`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        question: r.question,
        count: r.count,
        meta: `asked ${r.count} time${r.count === 1 ? '' : 's'} · last ${dayMonth(r.last_asked_at)}`,
      }))
    );
  })
);

const triageSchema = z.object({ action: z.enum(['reviewed', 'added', 'dismissed']) });
/** What the operator sets here is exactly what the client sees. */
const TRIAGE_TO_STATUS = { reviewed: 'fixing', added: 'added', dismissed: 'not_relevant' } as const;

router.post(
  '/insights/:id/triage',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = triageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }
    const status = TRIAGE_TO_STATUS[parsed.data.action];
    const result = await withSystem(async (db) => {
      const r = await db.query(
        `UPDATE insights SET status = $2, updated_at = NOW() WHERE id = $1`,
        [req.params.id, status]
      );
      await db.query(
        `UPDATE review_items SET status = 'resolved', resolved_at = NOW()
         WHERE insight_id = $1 AND status = 'open'`,
        [req.params.id]
      );
      return r;
    });
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Insight not found' });
      return;
    }
    res.json({ ok: true, status });
  })
);

// ── Conversations (operator view) ────────────────────────────────────────

router.get(
  '/tenants/:id/conversations',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT c.id, c.status, c.last_message_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                 ORDER BY m.created_at ASC LIMIT 1) AS question,
                (SELECT retrieval FROM messages m WHERE m.conversation_id = c.id AND m.role = 'assistant'
                 ORDER BY m.created_at DESC LIMIT 1) AS retrieval
         FROM conversations c
         WHERE c.tenant_id = $1 AND c.messages_count > 0
         ORDER BY c.last_message_at DESC LIMIT 100`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((c) => {
        const retrieval = (c.retrieval ?? []) as { sim: number }[];
        const top = retrieval[0]?.sim;
        return {
          question: c.question ?? '',
          time: relTime(c.last_message_at),
          status: c.status === 'escalated' ? 'escalated' : 'answered',
          telemetry:
            retrieval.length > 0
              ? `${retrieval.length} chunks · top ${top?.toFixed(2)}`
              : 'no retrieval',
        };
      })
    );
  })
);

// ── Review queue (cross-tenant) ──────────────────────────────────────────

router.get(
  '/review',
  asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT r.id, r.type, r.created_at, t.name AS tenant,
                m.content AS answer, m.citations, m.retrieval, m.conversation_id,
                i.question AS insight_question, i.count AS insight_count,
                (SELECT content FROM messages um
                 WHERE um.conversation_id = m.conversation_id AND um.role = 'user'
                   AND um.created_at < m.created_at
                 ORDER BY um.created_at DESC LIMIT 1) AS question
         FROM review_items r
         JOIN tenants t ON t.id = r.tenant_id
         LEFT JOIN messages m ON m.id = r.message_id
         LEFT JOIN insights i ON i.id = r.insight_id
         WHERE r.status = 'open'
         ORDER BY r.created_at DESC LIMIT 100`
      )
    );
    res.json(
      rows.map((r) => {
        const citations = (r.citations ?? []) as { title: string }[];
        return {
          id: r.id,
          type: r.type,
          tenant: r.tenant,
          question: r.question ?? r.insight_question ?? '',
          time: relTime(r.created_at),
          context:
            r.type === 'insight'
              ? `Asked ${r.insight_count} time${r.insight_count === 1 ? '' : 's'} — no answer in the knowledge base`
              : (r.question ?? ''),
          answer: r.answer ?? '(no answer given — question was unanswerable)',
          cite: citations.length ? `From: ${citations.map((c) => c.title).join(' · ')}` : '—',
          chunks: ((r.retrieval ?? []) as { src: string; sim: number; excerpt?: string }[]).map(
            (c) => ({ src: c.src, sim: c.sim, excerpt: c.excerpt })
          ),
        };
      })
    );
  })
);

const resolveSchema = z.object({ resolution: z.enum(['resolved', 'content_fix', 'dismissed']) });

router.post(
  '/review/:id/resolve',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid resolution' });
      return;
    }
    const result = await withSystem((db) =>
      db.query(
        `UPDATE review_items SET status = $2, resolved_at = NOW() WHERE id = $1 AND status = 'open'`,
        [req.params.id, parsed.data.resolution]
      )
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Review item not found or already resolved' });
      return;
    }
    res.json({ ok: true });
  })
);

export default router;
