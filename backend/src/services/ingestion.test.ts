import { beforeAll, describe, expect, it } from 'vitest';
import { withSystem, withTenant } from '../db/tenant.js';
import { createAgent, createTenant, truncateAll } from '../test/factories.js';
import { extractLinks, extractText } from './crawler.js';
import { createSource, processSource, sha256 } from './ingestion.js';
import { retrieveChunks } from './retrieval.js';
import { chunkText } from './chunker.js';

/** Deterministic fake embedder: axis keyed by first word, unit length. */
const fakeEmbed = async (texts: string[]): Promise<number[][]> =>
  texts.map((t) => {
    const v = new Array(1536).fill(0);
    v[Math.abs(hash(t.split(/\s+/)[0] ?? '')) % 1536] = 1;
    return v;
  });

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

let tenant: { id: string };
let agent: { id: string };

beforeAll(async () => {
  await truncateAll();
  tenant = await createTenant({ name: 'Kettle & Stone' });
  agent = await createAgent(tenant.id);
});

describe('processSource', () => {
  it('chunks, embeds and stores text; source ends up synced', async () => {
    const sourceId = await createSource({
      tenantId: tenant.id,
      agentId: agent.id,
      kind: 'text',
      name: 'shipping-policy',
    });
    const text = 'Delivery costs £3.95. Free over £30.\n\nExpress delivery is £5.95.';
    await processSource(sourceId, text, fakeEmbed);

    const { rows } = await withSystem((db) =>
      db.query('SELECT status, content_hash, size_bytes FROM sources WHERE id = $1', [sourceId])
    );
    expect(rows[0].status).toBe('synced');
    expect(rows[0].content_hash).toBe(sha256(text));
    expect(rows[0].size_bytes).toBeGreaterThan(0);

    const chunks = await withSystem((db) =>
      db.query('SELECT content, tenant_id, agent_id FROM chunks WHERE source_id = $1', [sourceId])
    );
    expect(chunks.rows.length).toBe(chunkText(text).length);
    expect(chunks.rows[0].tenant_id).toBe(tenant.id);

    // Retrievable end-to-end with the same fake embedding space.
    const [qv] = await fakeEmbed(['Delivery question']);
    const hits = await withTenant(tenant.id, (db) => retrieveChunks(db, agent.id, qv!));
    expect(hits.some((h) => h.content.includes('£3.95'))).toBe(true);
  });

  it('re-ingest replaces chunks instead of duplicating them', async () => {
    const sourceId = await createSource({
      tenantId: tenant.id,
      agentId: agent.id,
      kind: 'text',
      name: 'reingest-me',
    });
    await processSource(sourceId, 'Version one of the policy.', fakeEmbed);
    await processSource(sourceId, 'Version two of the policy, updated.', fakeEmbed);

    const { rows } = await withSystem((db) =>
      db.query('SELECT content FROM chunks WHERE source_id = $1', [sourceId])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toContain('Version two');
  });

  it('marks the source error on failure — never stuck in processing', async () => {
    const sourceId = await createSource({
      tenantId: tenant.id,
      agentId: agent.id,
      kind: 'text',
      name: 'will-fail',
    });
    const failEmbed = async (): Promise<number[][]> => {
      throw new Error('embedding API down');
    };
    await expect(processSource(sourceId, 'Some content here.', failEmbed)).rejects.toThrow();

    const { rows } = await withSystem((db) =>
      db.query('SELECT status, error_message FROM sources WHERE id = $1', [sourceId])
    );
    expect(rows[0].status).toBe('error');
    expect(rows[0].error_message).toContain('embedding API down');
  });

  it('rejects empty content', async () => {
    const sourceId = await createSource({
      tenantId: tenant.id,
      agentId: agent.id,
      kind: 'text',
      name: 'empty',
    });
    await expect(processSource(sourceId, '   ', fakeEmbed)).rejects.toThrow(/No text content/);
  });
});

describe('crawler extraction', () => {
  const html = `
    <html><head><title>Fees — Brampton &amp; Hale</title><style>.x{}</style></head>
    <body>
      <nav><a href="/">Home</a></nav>
      <main>
        <h1>Our fees</h1>
        <p>Self-assessment from £180 including VAT.</p>
        <script>track()</script>
      </main>
      <footer>© 2026</footer>
      <a href="/services">Services</a>
      <a href="/fees#section">Fees anchor</a>
      <a href="https://other-site.com/page">External</a>
      <a href="/brochure.pdf">PDF</a>
      <a href="mailto:x@y.z">Mail</a>
    </body></html>`;

  it('extracts title and main text, dropping nav/script/style/footer', () => {
    const { title, text } = extractText(html);
    expect(title).toBe('Fees — Brampton & Hale');
    expect(text).toContain('Self-assessment from £180');
    expect(text).not.toContain('track()');
    expect(text).not.toContain('Home');
    expect(text).not.toContain('© 2026');
  });

  it('extracts same-origin html links only, normalising fragments', () => {
    const links = extractLinks(html, 'https://bramptonhale.co.uk/about');
    expect(links).toContain('https://bramptonhale.co.uk/services');
    expect(links).toContain('https://bramptonhale.co.uk/fees');
    expect(links).toContain('https://bramptonhale.co.uk/');
    expect(links.some((l) => l.includes('other-site'))).toBe(false);
    expect(links.some((l) => l.endsWith('.pdf'))).toBe(false);
    expect(links.some((l) => l.startsWith('mailto'))).toBe(false);
  });
});
