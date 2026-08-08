/**
 * Client-dashboard API (/api/*) — read-only temperament, per the contract in
 * web/lib/types.ts. All queries run withTenant(auth.tenantId): RLS is the
 * isolation, the WHERE clauses are just shape.
 */
import { Router, type Response } from 'express';
import { requireClient, type AuthedRequest } from '../middleware/auth.js';
import { withSystem, withTenant } from '../db/tenant.js';
import { asyncHandler } from '../lib/http.js';
import { initials, monthKey, monthLabel, relTime } from '../lib/format.js';
import { tenantId } from './client-support.js';
import reportsRouter from './client-reports.js';

const router = Router();
router.use(requireClient);

// The overview sparkline's fixed vertical ceiling (see /overview).
const SPARKLINE_CEILING = 16;

// ── GET /api/me ──────────────────────────────────────────────────────────

router.get(
  '/me',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT u.name, t.name AS business FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`,
        [req.auth!.userId]
      )
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ name: rows[0].name, initials: initials(rows[0].name), businessName: rows[0].business });
  })
);

// ── GET /api/overview ────────────────────────────────────────────────────

router.get(
  '/overview',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const data = await withTenant(tenantId(req), async (db) => {
      const conv = await db.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'escalated')::int AS escalated
         FROM conversations WHERE created_at >= date_trunc('month', CURRENT_DATE)`
      );
      const msgs = await db.query(
        `SELECT count(*) FILTER (WHERE answer_status IN ('answered','partial'))::int AS answered,
                count(*) FILTER (WHERE answer_status IS NOT NULL)::int AS total
         FROM messages WHERE role = 'assistant' AND created_at >= date_trunc('month', CURRENT_DATE)`
      );
      const enq = await db.query(
        `SELECT count(*)::int AS waiting FROM enquiries WHERE status = 'new'`
      );
      const spark = await db.query(
        `SELECT d::date AS day, count(c.id)::int AS n
         FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
         LEFT JOIN conversations c ON c.created_at::date = d::date
         GROUP BY d ORDER BY d`
      );
      const month = monthKey();
      const ins = await db.query(
        `SELECT count(*)::int AS found, count(*) FILTER (WHERE status = 'added')::int AS added
         FROM insights WHERE month = $1`,
        [month]
      );
      const waitingRows = await db.query(
        `SELECT name, question, created_at FROM enquiries WHERE status = 'new' ORDER BY created_at DESC LIMIT 3`
      );
      return { conv: conv.rows[0], msgs: msgs.rows[0], enq: enq.rows[0], spark: spark.rows, ins: ins.rows[0], waitingRows: waitingRows.rows };
    });

    const rate = data.msgs.total > 0 ? Math.round((data.msgs.answered / data.msgs.total) * 100) : 100;
    // The overview sparkline renders against a fixed ceiling — scale busier
    // days down rather than letting the path clip.
    const rawSpark: number[] = data.spark.map((r: { n: number }) => r.n);
    const sparkMax = Math.max(...rawSpark, 0);
    const spark =
      sparkMax > SPARKLINE_CEILING
        ? rawSpark.map((n) => Math.round((n / sparkMax) * SPARKLINE_CEILING))
        : rawSpark;

    res.json({
      rangeLabel: monthLabel(monthKey()),
      stats: [
        {
          label: 'Conversations',
          value: String(data.conv.total),
          sub: 'this month',
          tone: 'ink',
        },
        {
          label: 'Questions answered',
          value: String(data.msgs.answered),
          sub: `${rate}% answer rate`,
          tone: 'good',
        },
        {
          label: 'Answer rate',
          value: `${rate}%`,
          sub: 'answered from your content',
          tone: rate >= 80 ? 'good' : 'warn',
        },
        {
          label: 'Enquiries waiting',
          value: String(data.enq.waiting),
          sub: data.enq.waiting > 0 ? 'awaiting your reply' : 'all handled',
          tone: data.enq.waiting > 0 ? 'warn' : 'good',
        },
      ],
      spark,
      reportTeaser: {
        headline:
          data.ins.found > 0
            ? `${data.ins.found} question${data.ins.found === 1 ? '' : 's'} your website couldn't answer this month`
            : 'Nothing unanswered this month — good sign',
        body:
          data.ins.found > 0
            ? `${data.ins.added} already fixed with new answers. See what your customers are asking for in the ${monthLabel(monthKey())} report.`
            : 'Your assistant answered everything it was asked from your content.',
      },
      waiting: data.waitingRows.map((w: { name: string; question: string; created_at: string }) => ({
        initials: initials(w.name),
        name: w.name,
        question: w.question,
        time: relTime(w.created_at),
      })),
    });
  })
);

// ── Conversations ────────────────────────────────────────────────────────

interface MessageRow {
  role: 'user' | 'assistant';
  content: string;
  citations: { title: string; url?: string }[] | null;
  answer_status: string | null;
  feedback: string | null;
}

function toClientMessages(rows: MessageRow[]) {
  return rows.map((m) => ({
    role: m.role,
    text: m.content,
    ...(m.role === 'assistant' && m.citations?.length
      ? { source: m.citations.map((c) => c.title).join(' · ') }
      : {}),
    ...(m.role === 'assistant' && m.answer_status === 'not_in_kb' ? { noSource: true } : {}),
    ...(m.feedback === 'down' ? { visitorThumbDown: true } : {}),
  }));
}

router.get(
  '/conversations',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const rows = await withTenant(tenantId(req), async (db) => {
      const { rows } = await db.query(
        `SELECT c.id, c.visitor_name, c.status, c.created_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                 ORDER BY m.created_at ASC LIMIT 1) AS first_question
         FROM conversations c
         WHERE c.messages_count > 0
         ORDER BY c.last_message_at DESC
         LIMIT 100`
      );
      return rows;
    });
    res.json(
      rows.map((c) => ({
        id: c.id,
        who: c.visitor_name || 'Website visitor',
        initials: c.visitor_name ? initials(c.visitor_name) : 'V',
        firstQuestion: c.first_question ?? '',
        time: relTime(c.created_at),
        status: c.status,
        messages: [],
      }))
    );
  })
);

router.get(
  '/conversations/:id',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const data = await withTenant(tenantId(req), async (db) => {
      const conv = await db.query(
        `SELECT id, visitor_name, status, created_at FROM conversations WHERE id = $1`,
        [req.params.id]
      );
      if (!conv.rows[0]) return null;
      const msgs = await db.query(
        `SELECT role, content, citations, answer_status, feedback
         FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      return { conv: conv.rows[0], msgs: msgs.rows as MessageRow[] };
    });
    if (!data) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const c = data.conv;
    const firstQuestion = data.msgs.find((m) => m.role === 'user')?.content ?? '';
    res.json({
      id: c.id,
      who: c.visitor_name || 'Website visitor',
      initials: c.visitor_name ? initials(c.visitor_name) : 'V',
      firstQuestion,
      time: relTime(c.created_at),
      status: c.status,
      messages: toClientMessages(data.msgs),
    });
  })
);

/** The client's safety-valve write: flag an answer for operator review. */
router.post(
  '/conversations/:id/messages/:idx/flag',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const idx = Number(req.params.idx);
    if (!Number.isInteger(idx) || idx < 0) {
      res.status(400).json({ error: 'Invalid message index' });
      return;
    }
    const ok = await withTenant(tenantId(req), async (db) => {
      const { rows } = await db.query(
        `SELECT id, tenant_id FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC OFFSET $2 LIMIT 1`,
        [req.params.id, idx]
      );
      if (!rows[0]) return false;
      await db.query(`UPDATE messages SET flagged = TRUE WHERE id = $1`, [rows[0].id]);
      await db.query(
        `INSERT INTO review_items (tenant_id, type, message_id) VALUES ($1, 'flag', $2)`,
        [rows[0].tenant_id, rows[0].id]
      );
      return true;
    });
    if (!ok) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// Insights, enquiries, and billing routes live in ./client-reports.
router.use(reportsRouter);

export default router;
