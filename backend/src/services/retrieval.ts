/**
 * v2 retrieval: pgvector cosine similarity over the chunks table.
 * Runs on a caller-supplied client so RLS context (withTenant/withSystem)
 * is always established by the caller — this module never touches the pool.
 */
import type { PoolClient } from 'pg';
import { toSql } from 'pgvector';

export const TOP_K = 5;
/** Tuned in v1 against text-embedding-3-small: FAQ-style content scores ~0.3-0.4. */
export const SIMILARITY_THRESHOLD = 0.25;
/** Best match below this ⇒ "weak retrieval" — answer still attempted, but queued for review. */
export const WEAK_THRESHOLD = 0.35;

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
}

export async function retrieveChunks(
  db: PoolClient,
  agentId: string,
  queryEmbedding: number[],
  topK: number = TOP_K
): Promise<RetrievedChunk[]> {
  const { rows } = await db.query(
    `SELECT c.id,
            c.content,
            1 - (c.embedding <=> $1::vector) AS similarity,
            s.id  AS source_id,
            s.name AS source_name,
            s.url  AS source_url
     FROM chunks c
     JOIN sources s ON s.id = c.source_id
     WHERE c.agent_id = $2
       AND s.status IN ('synced', 'drift')
     ORDER BY c.embedding <=> $1::vector
     LIMIT $3`,
    [toSql(queryEmbedding), agentId, topK]
  );

  return rows
    .filter((r: { similarity: number }) => r.similarity >= SIMILARITY_THRESHOLD)
    .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      content: r.content as string,
      similarity: r.similarity as number,
      sourceId: r.source_id as string,
      sourceName: r.source_name as string,
      sourceUrl: (r.source_url as string) ?? null,
    }));
}

export function isWeakRetrieval(chunks: RetrievedChunk[]): boolean {
  return chunks.length > 0 && chunks[0]!.similarity < WEAK_THRESHOLD;
}
