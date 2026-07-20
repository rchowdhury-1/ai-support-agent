import { describe, expect, it } from 'vitest';
import {
  AnswerFieldExtractor,
  buildSystemPrompt,
  computeCostUsd,
  consumeJsonStream,
  validateCitations,
} from './generation.js';
import type { RetrievedChunk } from './retrieval.js';

function chunksOf(...texts: string[]): RetrievedChunk[] {
  return texts.map((content, i) => ({
    id: `c${i}`,
    content,
    similarity: 0.5,
    sourceId: `s${i}`,
    sourceName: `Source ${i + 1}`,
    sourceUrl: null,
  }));
}

async function* stream(...parts: string[]): AsyncIterable<string> {
  for (const p of parts) yield p;
}

describe('AnswerFieldExtractor', () => {
  it('extracts the answer field from a single chunk', () => {
    const e = new AnswerFieldExtractor();
    expect(e.push('{"answer":"Hello there","status":"answered"}')).toBe('Hello there');
  });

  it('streams incrementally across arbitrary chunk boundaries', () => {
    const e = new AnswerFieldExtractor();
    const parts = ['{"ans', 'wer"', ': "Del', 'ivery is £3.', '95","status'];
    const out = parts.map((p) => e.push(p)).join('');
    expect(out).toBe('Delivery is £3.95');
  });

  it('decodes escapes, including ones split across chunks', () => {
    const e = new AnswerFieldExtractor();
    const out =
      e.push('{"answer":"line1\\') +
      e.push('nline2 \\"quoted\\" \\u00a3') +
      e.push('5","citations":[]}');
    expect(out).toBe('line1\nline2 "quoted" £5');
  });

  it('stops at the closing quote and ignores later fields', () => {
    const e = new AnswerFieldExtractor();
    const out = e.push('{"answer":"done","question_type":"not the answer"}');
    expect(out).toBe('done');
    expect(e.push('more')).toBe('');
  });

  it('handles the key arriving after other fields', () => {
    const e = new AnswerFieldExtractor();
    const out = e.push('{"status":"answered",') + e.push('"answer":"late field"}');
    expect(out).toBe('late field');
  });
});

describe('validateCitations', () => {
  it('keeps only in-range integers, deduped and sorted', () => {
    expect(validateCitations([2, 1, 2, 5, 0, -1, 1.5, 'x'], 3)).toEqual([1, 2]);
  });
  it('returns [] for garbage', () => {
    expect(validateCitations('nope', 3)).toEqual([]);
    expect(validateCitations(null, 3)).toEqual([]);
  });
  it('rejects citations when nothing was retrieved', () => {
    expect(validateCitations([1, 2], 0)).toEqual([]);
  });
});

describe('consumeJsonStream', () => {
  it('parses the full result and emits answer deltas', async () => {
    const deltas: string[] = [];
    const result = await consumeJsonStream(
      stream(
        '{"answer":"UK delivery is £3.95, free over £30.",',
        '"status":"answered","question_type":"shipping","citations":[1,3,9]}'
      ),
      3,
      (t) => deltas.push(t)
    );
    expect(result.answer).toBe('UK delivery is £3.95, free over £30.');
    expect(result.status).toBe('answered');
    expect(result.questionType).toBe('shipping');
    // 9 is out of range for 3 retrieved chunks — stripped server-side.
    expect(result.citations).toEqual([1, 3]);
    expect(deltas.join('')).toBe('UK delivery is £3.95, free over £30.');
  });

  it('rejects malformed output', async () => {
    await expect(consumeJsonStream(stream('{"answer":"x"}'), 0)).rejects.toThrow();
  });
});

describe('buildSystemPrompt', () => {
  const agent = { name: 'Test', system_prompt: 'You are the Brampton & Hale assistant.', disclaimer: '' };

  it('numbers chunks with their source names', () => {
    const p = buildSystemPrompt(agent, chunksOf('Fees start at £180.', 'We open at 9am.'));
    expect(p).toContain('[1] (source: Source 1)\nFees start at £180.');
    expect(p).toContain('[2] (source: Source 2)\nWe open at 9am.');
    expect(p).toContain('Brampton & Hale');
  });

  it('marks an empty retrieval set', () => {
    expect(buildSystemPrompt(agent, [])).toContain('(no relevant sources found)');
  });
});

describe('computeCostUsd', () => {
  it('prices haiku and sonnet correctly', () => {
    expect(computeCostUsd('haiku', 1_000_000, 1_000_000)).toBeCloseTo(6.0);
    expect(computeCostUsd('sonnet', 1_000_000, 1_000_000)).toBeCloseTo(18.0);
    expect(computeCostUsd('haiku', 3000, 500)).toBeCloseTo(0.0055);
  });
});
