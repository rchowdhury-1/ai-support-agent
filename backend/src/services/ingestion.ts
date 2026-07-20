/**
 * Ingestion pipeline: raw text → chunk → embed (OpenAI) → chunks table,
 * with source status tracking (processing → synced | error) and drift
 * detection for site sources. Re-ingest is idempotent: chunks for the
 * source are replaced atomically within the transaction.
 */
import { createHash } from 'node:crypto';
import { toSql } from 'pgvector';
import { withSystem } from '../db/tenant.js';
import { chunkText } from './chunker.js';
import { embedTexts } from './embeddings.js';
import { extractText } from './crawler.js';

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

const EMBED_BATCH = 64;

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export interface NewSource {
  tenantId: string;
  agentId: string;
  kind: 'site' | 'pdf' | 'text';
  name: string;
  url?: string | null;
}

/** Create the source row in `processing` state; returns its id. */
export async function createSource(input: NewSource): Promise<string> {
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO sources (tenant_id, agent_id, kind, name, url, status)
       VALUES ($1, $2, $3, $4, $5, 'processing') RETURNING id`,
      [input.tenantId, input.agentId, input.kind, input.name, input.url ?? null]
    )
  );
  return rows[0].id;
}

/**
 * Chunk + embed rawText and store it for the given source. Fail-safe: any
 * error lands the source in `error` with a message, never stuck in processing.
 */
export async function processSource(
  sourceId: string,
  rawText: string,
  embed: EmbedFn = embedTexts
): Promise<void> {
  try {
    const cleaned = rawText.trim();
    if (!cleaned) throw new Error('No text content found');

    const chunks = chunkText(cleaned);
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      embeddings.push(...(await embed(chunks.slice(i, i + EMBED_BATCH))));
    }
    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count mismatch');
    }

    await withSystem(async (db) => {
      const { rows } = await db.query(
        'SELECT tenant_id, agent_id FROM sources WHERE id = $1',
        [sourceId]
      );
      const src = rows[0];
      if (!src) throw new Error('Source not found');

      await db.query('DELETE FROM chunks WHERE source_id = $1', [sourceId]);
      for (let i = 0; i < chunks.length; i++) {
        await db.query(
          `INSERT INTO chunks (tenant_id, agent_id, source_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [src.tenant_id, src.agent_id, sourceId, i, chunks[i], toSql(embeddings[i]!)]
        );
      }
      await db.query(
        `UPDATE sources
         SET status = 'synced', error_message = NULL, content_hash = $2,
             size_bytes = $3, last_synced_at = NOW()
         WHERE id = $1`,
        [sourceId, sha256(cleaned), Buffer.byteLength(cleaned)]
      );
    });
  } catch (err) {
    await withSystem((db) =>
      db.query(`UPDATE sources SET status = 'error', error_message = $2 WHERE id = $1`, [
        sourceId,
        (err as Error).message.slice(0, 500),
      ])
    ).catch(() => undefined);
    throw err;
  }
}

/** Extract text from a text-layer PDF; reject scanned/image-only PDFs. */
export async function pdfToText(buf: Buffer): Promise<string> {
  // pdf-parse's index.js runs debug code when imported without a CJS parent —
  // import the implementation directly.
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const parsed = await pdfParse(buf);
  const text = (parsed.text || '').trim();
  const pages = parsed.numpages || 1;
  if (text.length < pages * 100) {
    throw new Error(
      'This PDF appears to contain scanned images. Please upload a text-based PDF or paste the text instead.'
    );
  }
  return text;
}

/** Re-fetch a site source and compare content; mark drift when it changed. */
export async function checkDrift(source: {
  id: string;
  url: string | null;
  content_hash: string | null;
}): Promise<boolean> {
  if (!source.url || !source.content_hash) return false;
  try {
    const res = await fetch(source.url, { redirect: 'follow' });
    if (!res.ok) return false;
    const { text } = extractText(await res.text());
    const drifted = sha256(text.trim()) !== source.content_hash;
    if (drifted) {
      await withSystem((db) =>
        db.query(`UPDATE sources SET status = 'drift' WHERE id = $1 AND status = 'synced'`, [
          source.id,
        ])
      );
    }
    return drifted;
  } catch {
    return false;
  }
}

/** Refresh a site source: re-fetch its URL and re-run the pipeline. */
export async function refreshSource(sourceId: string, embed: EmbedFn = embedTexts): Promise<void> {
  const { rows } = await withSystem((db) =>
    db.query('SELECT id, url FROM sources WHERE id = $1', [sourceId])
  );
  const src = rows[0];
  if (!src) throw new Error('Source not found');
  if (!src.url) throw new Error('Source has no URL to refresh from');

  await withSystem((db) =>
    db.query(`UPDATE sources SET status = 'processing' WHERE id = $1`, [sourceId])
  );
  const res = await fetch(src.url, { redirect: 'follow' });
  if (!res.ok) {
    await withSystem((db) =>
      db.query(`UPDATE sources SET status = 'error', error_message = $2 WHERE id = $1`, [
        sourceId,
        `Fetch failed: HTTP ${res.status}`,
      ])
    );
    throw new Error(`Fetch failed: HTTP ${res.status}`);
  }
  const { text } = extractText(await res.text());
  await processSource(sourceId, text, embed);
}
