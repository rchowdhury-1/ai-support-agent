import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pool from '../db/pool.js';
import { callClaude } from '../services/claude.js';

const router = Router();

const startSchema = z.object({
  agentId: z.string().uuid(),
  visitorName: z.string().max(100).optional(),
  visitorEmail: z.string().email().optional().or(z.literal('')),
});

const messageSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1).max(4000),
});

router.post('/start', async (req: Request, res: Response): Promise<void> => {
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { agentId, visitorName, visitorEmail } = result.data;

  try {
    const agentResult = await pool.query(
      'SELECT id, welcome_message, color, name FROM agents WHERE id = $1',
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const agent = agentResult.rows[0];
    const sessionId = uuidv4();

    const convResult = await pool.query(
      'INSERT INTO conversations (agent_id, session_id, visitor_name, visitor_email) VALUES ($1, $2, $3, $4) RETURNING *',
      [agentId, sessionId, visitorName || null, visitorEmail || null]
    );

    res.json({
      sessionId,
      conversationId: convResult.rows[0].id,
      welcomeMessage: agent.welcome_message,
      agentName: agent.name,
      color: agent.color,
    });
  } catch (err) {
    console.error('Chat start error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/message', async (req: Request, res: Response): Promise<void> => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { sessionId, content } = result.data;

  try {
    const convResult = await pool.query(
      `SELECT c.id, c.agent_id, a.system_prompt, a.name as agent_name
       FROM conversations c
       JOIN agents a ON a.id = c.agent_id
       WHERE c.session_id = $1`,
      [sessionId]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const conv = convResult.rows[0];

    const historyResult = await pool.query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conv.id]
    );

    const history = historyResult.rows;

    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conv.id, 'user', content]
    );

    const messages = [
      ...history.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content },
    ];

    const aiResponse = await callClaude(conv.system_prompt, messages);

    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conv.id, 'assistant', aiResponse]
    );

    res.json({ response: aiResponse, agentName: conv.agent_name });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

router.get('/:sessionId/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const convResult = await pool.query(
      `SELECT c.id, c.visitor_name, c.visitor_email, c.status, c.created_at,
              a.name as agent_name, a.color, a.welcome_message
       FROM conversations c
       JOIN agents a ON a.id = c.agent_id
       WHERE c.session_id = $1`,
      [req.params.sessionId]
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

    res.json({
      conversation: conv,
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
