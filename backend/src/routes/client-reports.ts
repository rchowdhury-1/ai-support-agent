/**
 * Client-dashboard API — insights, enquiries, and billing routes. Mounted by
 * client.ts under the same requireClient guard; split out to keep each file
 * focused. All queries run withTenant(tenantId): RLS is the isolation.
 */
import { Router, type Response } from 'express';
import { z } from 'zod';
import { type AuthedRequest } from '../middleware/auth.js';
import { withTenant } from '../db/tenant.js';
import { asyncHandler } from '../lib/http.js';
import { dayMonth, initials, longDate, monthKey, monthLabel, pence, relTime } from '../lib/format.js';
import { tenantId } from './client-support.js';

const router = Router();

// ── GET /api/insights ────────────────────────────────────────────────────

router.get(
  '/insights',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const months = await withTenant(tenantId(req), async (db) => {
      const { rows: monthRows } = await db.query(
        `SELECT DISTINCT month FROM insights ORDER BY month ASC`
      );
      const keys: string[] = monthRows.map((r) => r.month);
      const current = monthKey();
      if (!keys.includes(current)) keys.push(current);

      const result = [];
      for (const key of keys.slice(-6)) {
        const { rows } = await db.query(
          `SELECT id, question, count, status, first_asked_at, last_asked_at
           FROM insights WHERE month = $1 ORDER BY count DESC, last_asked_at DESC`,
          [key]
        );
        const answered = await db.query(
          `SELECT count(*)::int AS n FROM messages
           WHERE role = 'assistant' AND answer_status IN ('answered','partial')
             AND to_char(created_at, 'YYYY-MM') = $1`,
          [key]
        );
        const topics = await db.query(
          `SELECT question_type, count(*)::int AS n FROM messages
           WHERE role = 'assistant' AND question_type IS NOT NULL
             AND to_char(created_at, 'YYYY-MM') = $1
           GROUP BY question_type ORDER BY n DESC LIMIT 3`,
          [key]
        );
        const added = rows.filter((r) => r.status === 'added').length;
        result.push({
          key,
          label: monthLabel(key),
          empty: rows.length === 0,
          ...(rows.length > 0
            ? {
                summary: {
                  found: rows.length,
                  foundSub: 'questions your site couldn′t answer',
                  added,
                  addedSub: added === 1 ? 'answer added' : 'answers added',
                  answeredSince: answered.rows[0].n,
                  topics: topics.rows.map((t) => t.question_type),
                },
              }
            : { emptyStats: { answered: answered.rows[0].n } }),
          rows: rows.map((r) => ({
            id: r.id,
            question: r.question,
            count: r.count,
            meta: `asked ${r.count} time${r.count === 1 ? '' : 's'} · last ${dayMonth(r.last_asked_at)}`,
            status: r.status,
          })),
        });
      }
      return result;
    });
    res.json(months);
  })
);

// ── Enquiries ────────────────────────────────────────────────────────────

router.get(
  '/enquiries',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const rows = await withTenant(tenantId(req), (db) =>
      db.query(
        `SELECT id, name, contact, question, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 100`
      )
    );
    res.json(
      rows.rows.map((e) => ({
        id: e.id,
        name: e.name,
        initials: initials(e.name),
        email: e.contact,
        question: e.question,
        time: relTime(e.created_at),
        status: e.status,
      }))
    );
  })
);

const enquiryStatusSchema = z.object({ status: z.enum(['new', 'contacted', 'closed']) });

router.put(
  '/enquiries/:id/status',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = enquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const result = await withTenant(tenantId(req), (db) =>
      db.query(`UPDATE enquiries SET status = $2 WHERE id = $1`, [req.params.id, parsed.data.status])
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Enquiry not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ── GET /api/billing ─────────────────────────────────────────────────────

router.get(
  '/billing',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withTenant(tenantId(req), (db) =>
      db.query(
        `SELECT setup_fee_pence, monthly_amount_pence, created_at, stripe_customer_id FROM tenants WHERE id = $1`,
        [tenantId(req)]
      )
    );
    const t = rows[0];
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    res.json({
      planStatus: 'active',
      setupLine: t.setup_fee_pence > 0 ? `${pence(t.setup_fee_pence)} set-up — paid` : 'Set-up complete',
      monthlyLine: `${pence(t.monthly_amount_pence)} / month`,
      renewalLine: `Renews ${longDate(next)}`,
      cardLine: t.stripe_customer_id ? 'Payment method stored securely with Stripe' : 'No payment method on file',
      invoices: [],
    });
  })
);

export default router;
