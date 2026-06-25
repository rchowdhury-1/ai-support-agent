import { Response, NextFunction } from 'express';
import pool from '../db/pool.js';
import { AuthRequest } from './auth.js';

interface PlanConfig {
  maxAgents: number;
  maxDocsPerAgent: number;
  maxMessagesPerMonth: number;
  leadsEnabled: boolean;
}

const PLAN_LIMITS: Record<string, PlanConfig> = {
  free:     { maxAgents: 1,        maxDocsPerAgent: 2,        maxMessagesPerMonth: 100,     leadsEnabled: false },
  starter:  { maxAgents: 3,        maxDocsPerAgent: 10,       maxMessagesPerMonth: 1000,    leadsEnabled: true },
  pro:      { maxAgents: 10,       maxDocsPerAgent: 50,       maxMessagesPerMonth: 10000,   leadsEnabled: true },
  business: { maxAgents: Infinity, maxDocsPerAgent: Infinity,  maxMessagesPerMonth: 100000,  leadsEnabled: true },
};

async function getUserPlan(userId: string): Promise<{ plan: string; monthly_message_count: number; message_count_reset_at: string }> {
  const result = await pool.query(
    'SELECT plan, monthly_message_count, message_count_reset_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}

export function checkAgentLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await getUserPlan(req.userId!);
      const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
        [req.userId]
      );
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= limits.maxAgents) {
        res.status(403).json({
          error: `Your ${user.plan} plan allows up to ${limits.maxAgents} agent(s). Please upgrade to add more.`,
        });
        return;
      }
      next();
    } catch (err) {
      console.error('Plan limit check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function checkDocumentLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await getUserPlan(req.userId!);
      const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM knowledge_documents WHERE agent_id = $1',
        [req.params.agentId]
      );
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= limits.maxDocsPerAgent) {
        res.status(403).json({
          error: `Your ${user.plan} plan allows up to ${limits.maxDocsPerAgent} document(s) per agent. Please upgrade to add more.`,
        });
        return;
      }
      next();
    } catch (err) {
      console.error('Plan limit check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function checkMessageLimit() {
  return async (agentId: string): Promise<{ allowed: boolean; message?: string }> => {
    try {
      // Get the user who owns this agent
      const agentResult = await pool.query(
        'SELECT a.user_id FROM agents a WHERE a.id = $1',
        [agentId]
      );
      if (agentResult.rows.length === 0) return { allowed: true };

      const userId = agentResult.rows[0].user_id;
      const user = await getUserPlan(userId);
      const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

      // Reset monthly count if needed
      const resetDate = new Date(user.message_count_reset_at);
      const now = new Date();
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        await pool.query(
          'UPDATE users SET monthly_message_count = 0, message_count_reset_at = NOW() WHERE id = $1',
          [userId]
        );
        return { allowed: true };
      }

      if (user.monthly_message_count >= limits.maxMessagesPerMonth) {
        return {
          allowed: false,
          message: `This business has reached its monthly message limit. Please try again next month or contact the business directly.`,
        };
      }

      // Increment counter
      await pool.query(
        'UPDATE users SET monthly_message_count = monthly_message_count + 1 WHERE id = $1',
        [userId]
      );

      return { allowed: true };
    } catch (err) {
      console.error('Message limit check error:', err);
      return { allowed: true }; // Fail open to avoid blocking customers
    }
  };
}

export { PLAN_LIMITS };
