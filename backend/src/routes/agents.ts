import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const agentSchema = z.object({
  name: z.string().min(1).max(100),
  system_prompt: z.string().min(1).max(5000),
  welcome_message: z.string().min(1).max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

const updateAgentSchema = agentSchema.partial();

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = a.id) as conversation_count
       FROM agents a
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get agents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = agentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, system_prompt, welcome_message, color } = result.data;

  try {
    const agentResult = await pool.query(
      'INSERT INTO agents (user_id, name, system_prompt, welcome_message, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, name, system_prompt, welcome_message, color]
    );
    res.status(201).json(agentResult.rows[0]);
  } catch (err) {
    console.error('Create agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = updateAgentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const updates = result.data;
  const fields = Object.keys(updates);

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  try {
    const owned = await pool.query(
      'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (owned.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => updates[f as keyof typeof updates]);
    values.push(req.params.id);

    const agentResult = await pool.query(
      `UPDATE agents SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );
    res.json(agentResult.rows[0]);
  } catch (err) {
    console.error('Update agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM agents WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    console.error('Delete agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/embed', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM agents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const agent = result.rows[0];
    const widgetUrl = `${process.env.CLIENT_URL}/widget.js`;
    const embedCode = `<script src="${widgetUrl}" data-agent-id="${agent.id}" defer></script>`;

    res.json({ embedCode, agentId: agent.id, widgetUrl });
  } catch (err) {
    console.error('Embed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
