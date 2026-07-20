import { beforeAll, describe, expect, it } from 'vitest';
import { toSql } from 'pgvector';
import { withSystem, withTenant } from '../db/tenant.js';
import { createAgent, createTenant, truncateAll } from '../test/factories.js';
import { isWeakRetrieval, retrieveChunks, SIMILARITY_THRESHOLD } from './retrieval.js';

/** Unit vector along one of 1536 axes — cosine similarity is exactly the dot product. */
function axis(i: number, weight = 1): number[] {
  const v = new Array(1536).fill(0);
  v[i] = weight;
  return v;
}

/** Normalised blend of two axes. */
function blend(i: number, j: number, wi: number, wj: number): number[] {
  const norm = Math.sqrt(wi * wi + wj * wj);
  const v = new Array(1536).fill(0);
  v[i] = wi / norm;
  v[j] = wj / norm;
  return v;
}

let tenantA: { id: string };
let tenantB: { id: string };
let agentA: { id: string };
let agentB: { id: string };

async function insertChunk(
  tenantId: string,
  agentId: string,
  sourceId: string,
  content: string,
  embedding: number[]
): Promise<void> {
  await withSystem((db) =>
    db.query(
      `INSERT INTO chunks (tenant_id, agent_id, source_id, chunk_index, content, embedding)
       VALUES ($1, $2, $3, 0, $4, $5::vector)`,
      [tenantId, agentId, sourceId, content, toSql(embedding)]
    )
  );
}

async function insertSource(tenantId: string, agentId: string, name: string, status = 'synced'): Promise<string> {
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO sources (tenant_id, agent_id, kind, name, status, last_synced_at)
       VALUES ($1, $2, 'text', $3, $4, NOW()) RETURNING id`,
      [tenantId, agentId, name, status]
    )
  );
  return rows[0].id;
}

beforeAll(async () => {
  await truncateAll();
  tenantA = await createTenant({ name: 'Brampton & Hale' });
  tenantB = await createTenant({ name: 'Aldergate Solicitors' });
  agentA = await createAgent(tenantA.id);
  agentB = await createAgent(tenantB.id);

  const feesA = await insertSource(tenantA.id, agentA.id, 'Services & Fees');
  const hoursA = await insertSource(tenantA.id, agentA.id, 'Opening Hours');
  const processingA = await insertSource(tenantA.id, agentA.id, 'Draft doc', 'processing');
  const feesB = await insertSource(tenantB.id, agentB.id, 'Aldergate Fees');

  await insertChunk(tenantA.id, agentA.id, feesA, 'Self-assessment costs £180.', axis(0));
  await insertChunk(tenantA.id, agentA.id, hoursA, 'Open 9am to 5pm weekdays.', axis(1));
  await insertChunk(tenantA.id, agentA.id, processingA, 'Not yet ready content.', axis(0));
  await insertChunk(tenantB.id, agentB.id, feesB, 'Aldergate secret pricing.', axis(0));
});

describe('retrieveChunks', () => {
  it('ranks by cosine similarity and joins source names', async () => {
    // Query mostly along axis 0 with a little axis 1.
    const q = blend(0, 1, 0.9, 0.3);
    const chunks = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentA.id, q));
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]!.content).toContain('£180');
    expect(chunks[0]!.sourceName).toBe('Services & Fees');
    expect(chunks[0]!.similarity).toBeGreaterThan(chunks[1]!.similarity);
  });

  it('applies the similarity threshold', async () => {
    // Orthogonal query — nothing should pass.
    const chunks = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentA.id, axis(100)));
    expect(chunks).toEqual([]);
    expect(SIMILARITY_THRESHOLD).toBeGreaterThan(0);
  });

  it('excludes sources that are not synced/drift', async () => {
    const chunks = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentA.id, axis(0)));
    expect(chunks.some((c) => c.content.includes('Not yet ready'))).toBe(false);
  });

  it('never returns another tenant′s chunks — even when asked for their agent id', async () => {
    // Correct usage: tenant A context + tenant B's agent id → RLS yields nothing.
    const cross = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentB.id, axis(0)));
    expect(cross).toEqual([]);
    // Sanity: B sees its own.
    const own = await withTenant(tenantB.id, (db) => retrieveChunks(db, agentB.id, axis(0)));
    expect(own.map((c) => c.content)).toEqual(['Aldergate secret pricing.']);
  });
});

describe('isWeakRetrieval', () => {
  it('flags weak best matches, not empty or strong ones', async () => {
    const strong = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentA.id, axis(0)));
    expect(isWeakRetrieval(strong)).toBe(false);

    const weakQuery = blend(0, 200, 0.3, 0.95); // similarity ≈ 0.30 — above threshold, below weak line
    const weak = await withTenant(tenantA.id, (db) => retrieveChunks(db, agentA.id, weakQuery));
    expect(weak.length).toBeGreaterThan(0);
    expect(isWeakRetrieval(weak)).toBe(true);

    expect(isWeakRetrieval([])).toBe(false);
  });
});
