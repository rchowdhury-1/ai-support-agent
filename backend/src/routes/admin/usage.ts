import { Router, type Response } from 'express';
import { type AuthedRequest } from '../../middleware/auth.js';
import { withSystem } from '../../db/tenant.js';
import { asyncHandler } from '../../lib/http.js';
import { tokensShort, usdToGbp } from '../../lib/format.js';

const router = Router();

router.get(
  '/usage',
  asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const data = await withSystem(async (db) => {
      const rows = await db.query(
        `SELECT t.name, a.monthly_cap,
                COALESCE(SUM(u.messages), 0)::int AS msgs,
                COALESCE(SUM(u.tokens_in + u.tokens_out), 0)::bigint AS tokens,
                COALESCE(SUM(u.cost_usd), 0)::float AS cost_usd
         FROM tenants t
         LEFT JOIN LATERAL (SELECT * FROM agents WHERE tenant_id = t.id ORDER BY created_at ASC LIMIT 1) a ON TRUE
         LEFT JOIN usage_daily u ON u.tenant_id = t.id AND u.day >= date_trunc('month', CURRENT_DATE)
         GROUP BY t.id, t.name, a.monthly_cap
         ORDER BY cost_usd DESC`
      );
      const bars = await db.query(
        `SELECT d::date AS day, COALESCE(SUM(u.messages), 0)::int AS n
         FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
         LEFT JOIN usage_daily u ON u.day = d::date
         GROUP BY d ORDER BY d`
      );
      return { rows: rows.rows, bars: bars.rows };
    });
    res.json({
      rows: data.rows.map((r) => {
        const cap = r.monthly_cap ?? 0;
        const pct = cap > 0 ? r.msgs / cap : 0;
        return {
          name: r.name,
          msgs: r.msgs,
          cap,
          tokens: tokensShort(Number(r.tokens)),
          cost: Number(usdToGbp(r.cost_usd).toFixed(2)),
          alert: pct >= 1 ? 'At cap' : pct >= 0.8 ? `${Math.round(pct * 100)}% of cap` : '',
        };
      }),
      bars: data.bars.map((b: { n: number }) => b.n),
    });
  })
);

export default router;
