import pool from '../db/pool.js';
import { embedQuery } from './embeddings.js';
import { toSql } from 'pgvector';

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.25;

export interface RetrievedChunk {
  content: string;
  filename: string;
  similarity: number;
}

/**
 * Retrieve relevant document chunks for a given agent and query.
 * Returns chunks above the similarity threshold, or an empty array if none match.
 */
export async function retrieveChunks(agentId: string, query: string): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedQuery(query);

  const result = await pool.query(
    `SELECT dc.content,
            kd.filename,
            1 - (dc.embedding <=> $1::vector) AS similarity
     FROM document_chunks dc
     JOIN knowledge_documents kd ON kd.id = dc.document_id
     WHERE kd.agent_id = $2
       AND kd.status = 'ready'
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3`,
    [toSql(queryEmbedding), agentId, TOP_K]
  );

  return result.rows.filter((row: { similarity: number }) => row.similarity >= SIMILARITY_THRESHOLD);
}

/**
 * Build the RAG context block to inject into the system prompt.
 */
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';

  const contextLines = chunks.map(
    (c, i) => `[${i + 1}] ${c.content}  (source: ${c.filename})`
  );

  return `\n=== RELEVANT CONTEXT ===\n${contextLines.join('\n\n')}\n========================\n`;
}
