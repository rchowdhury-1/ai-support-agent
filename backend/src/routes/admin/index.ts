/**
 * Operator API (/api/admin/*) — one user: the operator (system context
 * throughout). Split into cohesive sub-routers; every route requires the
 * operator role. Shapes match web/lib/operator-types.ts.
 */
import { Router } from 'express';
import { requireOperator } from '../../middleware/auth.js';
import tenantsRouter from './tenants.js';
import sourcesRouter from './sources.js';
import insightsReviewRouter from './insights-review.js';
import usageRouter from './usage.js';

const router = Router();
router.use(requireOperator);
router.use(tenantsRouter);
router.use(sourcesRouter);
router.use(insightsReviewRouter);
router.use(usageRouter);

export default router;
