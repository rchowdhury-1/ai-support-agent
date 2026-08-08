import { Router, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { type AuthedRequest } from '../../middleware/auth.js';
import { withSystem, withTenant } from '../../db/tenant.js';
import { asyncHandler } from '../../lib/http.js';
import { crawlSite } from '../../services/crawler.js';
import { createSource, pdfToText, processSource, refreshSource, checkDrift } from '../../services/ingestion.js';
import { embedQuery } from '../../services/embeddings.js';
import { retrieveChunks } from '../../services/retrieval.js';
import { generateAnswer } from '../../services/generation.js';
import { bytesShort, gbp, relTime, usdToGbp } from '../../lib/format.js';
import { MODEL_LABEL, tenantAgent } from './shared.js';

const router = Router();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — PDF source uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

// Chunk-count estimate for the crawl preview: one chunk per ~2000 characters.
const CHARS_PER_CHUNK = 2000;
// Characters of each retrieved chunk shown in the sandbox telemetry panel.
const SANDBOX_EXCERPT_CHARS = 160;

const crawlSchema = z.object({ url: z.string().url() });

router.post('/tenants/:id/crawl', async (req: AuthedRequest, res: Response) => {
  const parsed = crawlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid url is required' });
    return;
  }
  try {
    const pages = await crawlSite(parsed.data.url);
    res.json(
      pages.map((p) => ({
        id: p.url,
        title: p.title,
        path: p.path,
        chunks: `~${Math.max(1, Math.ceil(p.text.length / CHARS_PER_CHUNK))} chunks`,
        status: 'queued',
      }))
    );
  } catch (err) {
    console.error('crawl error:', err);
    res.status(400).json({ error: 'Could not crawl that URL' });
  }
});

const sourcesSchema = z.union([
  z.object({ kind: z.literal('site'), urls: z.array(z.string().url()).min(1).max(50) }),
  z.object({ kind: z.literal('text'), name: z.string().min(1).max(255), text: z.string().min(1) }),
]);

router.post(
  '/tenants/:id/sources',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = sourcesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid source payload' });
      return;
    }
    const ta = await tenantAgent(req.params.id!);
    if (!ta) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    const p = parsed.data;
    // Processed synchronously: on serverless, work started after the response
    // is killed with the invocation. Sources that fail land in `error` state.
    if (p.kind === 'text') {
      const sourceId = await createSource({ ...ta, kind: 'text', name: p.name });
      await processSource(sourceId, p.text).catch((err) => console.error('ingest error:', err));
      res.status(202).json({ sourceIds: [sourceId] });
      return;
    }
    const ids: string[] = [];
    for (const url of p.urls.slice(0, 20)) {
      const u = new URL(url);
      const name = u.pathname === '/' || u.pathname === '' ? u.hostname : u.pathname;
      const sourceId = await createSource({ ...ta, kind: 'site', name, url });
      ids.push(sourceId);
      await refreshSource(sourceId).catch((err) => console.error('ingest error:', err));
    }
    res.status(202).json({ sourceIds: ids });
  })
);

router.post(
  '/tenants/:id/sources/pdf',
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'A PDF file is required' });
        return;
      }
      const ta = await tenantAgent(req.params.id!);
      if (!ta) {
        res.status(404).json({ error: 'Tenant has no agent' });
        return;
      }
      let text: string;
      try {
        text = await pdfToText(req.file.buffer);
      } catch (err) {
        res.status(422).json({ error: (err as Error).message });
        return;
      }
      const sourceId = await createSource({ ...ta, kind: 'pdf', name: req.file.originalname });
      await processSource(sourceId, text).catch((err) => console.error('ingest error:', err));
      res.status(202).json({ sourceIds: [sourceId] });
    } catch (err) {
      console.error('pdf error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

const SOURCE_TYPE_LABEL = { site: 'Web page', pdf: 'PDF', text: 'Text' } as const;

router.get(
  '/tenants/:id/sources',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT s.id, s.kind, s.name, s.status, s.size_bytes, s.last_synced_at, s.error_message,
                (SELECT count(*)::int FROM chunks c WHERE c.source_id = s.id) AS chunk_count
         FROM sources s WHERE s.tenant_id = $1 ORDER BY s.created_at ASC`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((s) => ({
        id: s.id,
        icon: s.kind,
        name: s.name,
        type: SOURCE_TYPE_LABEL[s.kind as keyof typeof SOURCE_TYPE_LABEL],
        size:
          s.status === 'processing'
            ? 'processing…'
            : s.status === 'error'
              ? (s.error_message ?? 'error')
              : `${s.chunk_count} chunks · ${bytesShort(s.size_bytes)}`,
        status: s.status,
        synced: s.last_synced_at ? relTime(s.last_synced_at) : '—',
      }))
    );
  })
);

router.post(
  '/sources/:id/refresh',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    await refreshSource(req.params.id!).catch((err) => console.error('refresh error:', err));
    res.status(202).json({ ok: true });
  })
);

router.post(
  '/tenants/:id/check-drift',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT id, url, content_hash FROM sources WHERE tenant_id = $1 AND kind = 'site' AND status = 'synced'`,
        [req.params.id]
      )
    );
    const results = await Promise.all(rows.map((s) => checkDrift(s)));
    res.json({ drifted: results.filter(Boolean).length });
  })
);

router.delete(
  '/sources/:id',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const result = await withSystem((db) => db.query(`DELETE FROM sources WHERE id = $1`, [req.params.id]));
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ── Sandbox test chat ────────────────────────────────────────────────────

const sandboxSchema = z.object({ question: z.string().min(1).max(2000) });

router.post('/tenants/:id/sandbox', async (req: AuthedRequest, res: Response) => {
  const parsed = sandboxSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A question is required' });
    return;
  }
  try {
    const { rows } = await withSystem((db) =>
      db.query(`SELECT * FROM agents WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`, [
        req.params.id,
      ])
    );
    const agent = rows[0];
    if (!agent) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    const started = Date.now();
    const embedding = await embedQuery(parsed.data.question);
    const chunks = await withTenant(agent.tenant_id, (db) =>
      retrieveChunks(db, agent.id, embedding)
    );
    const result = await generateAnswer({
      model: agent.model,
      agent,
      chunks,
      history: [],
      question: parsed.data.question,
    });
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const citedTitles = [
      ...new Set(result.citations.map((i) => chunks[i - 1]?.sourceName).filter(Boolean)),
    ];
    res.json({
      text: result.answer,
      srcLine: citedTitles.length ? `From: ${citedTitles.join(' · ')}` : 'No source — not in knowledge base',
      chunks: chunks.map((c) => ({
        src: c.sourceName,
        sim: Number(c.similarity.toFixed(2)),
        excerpt: c.content.slice(0, SANDBOX_EXCERPT_CHARS),
      })),
      meta: `${MODEL_LABEL[agent.model as 'haiku' | 'sonnet']} · ${secs}s · ${gbp(usdToGbp(result.costUsd))} · ${result.status}`,
    });
  } catch (err) {
    console.error('sandbox error:', err);
    res.status(502).json({ error: 'Sandbox generation failed' });
  }
});

export default router;
