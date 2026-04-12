import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;

  try {
    let query = `
      SELECT c.id, c.session_id, c.visitor_name, c.visitor_email, c.status, c.created_at,
             a.name as agent_name, a.id as agent_id,
             (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      JOIN agents a ON a.id = c.agent_id
      WHERE a.user_id = $1
    `;
    const params: (string | undefined)[] = [req.userId];

    if (status && ['open', 'closed', 'escalated'].includes(status)) {
      query += ` AND c.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convResult = await pool.query(
      `SELECT c.*, a.name as agent_name, a.id as agent_id, a.color
       FROM conversations c
       JOIN agents a ON a.id = c.agent_id
       WHERE c.id = $1 AND a.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const conv = convResult.rows[0];

    const messagesResult = await pool.query(
      'SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conv.id]
    );

    res.json({ conversation: conv, messages: messagesResult.rows });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const statusSchema = z.object({ status: z.enum(['open', 'closed', 'escalated']) });
  const result = statusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid status. Must be open, closed, or escalated' });
    return;
  }

  try {
    const convResult = await pool.query(
      `UPDATE conversations c SET status = $1
       FROM agents a
       WHERE c.id = $2 AND c.agent_id = a.id AND a.user_id = $3
       RETURNING c.*`,
      [result.data.status, req.params.id, req.userId]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(convResult.rows[0]);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
