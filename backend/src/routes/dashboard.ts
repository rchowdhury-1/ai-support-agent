import { Router, Response } from 'express';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statsResult = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM agents WHERE user_id = $1) as agents_count,
        (SELECT COUNT(*) FROM conversations c JOIN agents a ON a.id = c.agent_id WHERE a.user_id = $1) as total_conversations,
        (SELECT COUNT(*) FROM conversations c JOIN agents a ON a.id = c.agent_id WHERE a.user_id = $1 AND c.status = 'open') as open_conversations,
        (SELECT COUNT(*) FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          JOIN agents a ON a.id = c.agent_id
          WHERE a.user_id = $1 AND DATE(m.created_at) = CURRENT_DATE) as messages_today`,
      [req.userId]
    );

    const recentResult = await pool.query(
      `SELECT c.id, c.session_id, c.visitor_name, c.visitor_email, c.status, c.created_at,
              a.name as agent_name,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
       FROM conversations c
       JOIN agents a ON a.id = c.agent_id
       WHERE a.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [req.userId]
    );

    res.json({
      stats: statsResult.rows[0],
      recentConversations: recentResult.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
