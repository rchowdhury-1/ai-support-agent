import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List leads across user's agents
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT l.*, a.name as agent_name
       FROM leads l
       JOIN agents a ON a.id = l.agent_id
       WHERE a.user_id = $1
       ORDER BY l.created_at DESC
       LIMIT 100`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
});

// Update lead status
router.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE leads l
       SET status = $1
       FROM agents a
       WHERE l.agent_id = a.id
         AND a.user_id = $2
         AND l.id = $3
       RETURNING l.*`,
      [parsed.data.status, req.userId, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
