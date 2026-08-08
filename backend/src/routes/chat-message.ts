/**
 * POST /chat/message — the streaming RAG turn. Kept in its own module because
 * the SSE orchestration (authz → quota → retrieve → generate → persist →
 * signals) is the widget API's most involved endpoint. Supports SSE streaming
 * and a v1-compat JSON fallback for the old widget.
 */
import { type Request, type Response } from 'express';
import { z } from 'zod';
import { withTenant } from '../db/tenant.js';
import { embedQuery } from '../services/embeddings.js';
import { generateAnswer, type GenerationResult } from '../services/generation.js';
import { retrieveChunks } from '../services/retrieval.js';
import {
  assertOrigin,
  buildCitations,
  buildRetrievalTelemetry,
  checkCaps,
  persistAssistantTurn,
  recordSignals,
  resolveSession,
} from './chat-support.js';

const messageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

export async function messageHandler(req: Request, res: Response): Promise<void> {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'sessionId and content are required' });
    return;
  }
  const { sessionId, content } = parsed.data;
  const wantsSse = (req.headers.accept ?? '').includes('text/event-stream');

  try {
    // 1. Authz: resolve the session to its conversation/agent/tenant. This
    //    MUST come before any quota work — a quota check first would leak
    //    tenant state to holders of invalid sessions.
    const ctx = await resolveSession(sessionId);
    if (!ctx) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    if (!assertOrigin(req, res, ctx.agent)) return;

    // 2. Quota — fails closed.
    const caps = await checkCaps(ctx);
    if (!caps.ok) {
      res.status(caps.status).json({ error: 'Message limit reached' });
      return;
    }

    const agent = ctx.agent;
    const tenantId = agent.tenant_id;

    const history = await withTenant(tenantId, async (db) => {
      const { rows } = await db.query(
        `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 30`,
        [ctx.id]
      );
      await db.query(
        `INSERT INTO messages (tenant_id, conversation_id, role, content) VALUES ($1, $2, 'user', $3)`,
        [tenantId, ctx.id, content]
      );
      return rows as { role: 'user' | 'assistant'; content: string }[];
    });

    const queryEmbedding = await embedQuery(content);
    const chunks = await withTenant(tenantId, (db) => retrieveChunks(db, agent.id, queryEmbedding));

    let sse: ((event: string, data: unknown) => void) | null = null;
    if (wantsSse) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      sse = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
    }

    let result: GenerationResult;
    try {
      result = await generateAnswer({
        model: agent.model,
        agent,
        chunks,
        history,
        question: content,
        onDelta: sse ? (text) => sse!('delta', { text }) : undefined,
      });
    } catch (err) {
      console.error('generation error:', err);
      if (sse) {
        sse('error', { message: 'generation failed' });
        res.end();
      } else {
        res.status(502).json({ error: 'Failed to generate a response' });
      }
      return;
    }

    const dedupedCitations = buildCitations(result, chunks);
    const messageId = await persistAssistantTurn({
      tenantId,
      conversationId: ctx.id,
      agent,
      result,
      citations: dedupedCitations,
      telemetry: buildRetrievalTelemetry(chunks),
    });
    await recordSignals({
      tenantId,
      agent,
      question: content,
      embedding: queryEmbedding,
      chunks,
      result,
      messageId,
    });

    const meta = {
      messageId,
      answerStatus: result.status,
      citations: dedupedCitations,
    };
    if (sse) {
      sse('done', meta);
      res.end();
    } else {
      // v1-compat JSON shape (old widget.js sends no Accept header).
      res.json({ response: result.answer, agentName: agent.name, ...meta });
    }
  } catch (err) {
    console.error('message error:', err);
    if (res.headersSent) {
      res.write(`event: error\ndata: {}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
