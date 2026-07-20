/**
 * Anthropic structured generation. One call produces answer, status,
 * question_type and citations via output_config.format (JSON schema), with the
 * `answer` string field extracted incrementally from the streamed JSON so the
 * widget still gets live deltas. Citations are validated server-side against
 * the retrieved chunk set — the model cannot invent a source.
 *
 * Embeddings stay on OpenAI (services/embeddings.ts).
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { RetrievedChunk } from './retrieval.js';

export type AnswerStatus = 'answered' | 'partial' | 'not_in_kb';

export interface GenerationResult {
  answer: string;
  status: AnswerStatus;
  questionType: string;
  /** Validated 1-based indexes into the retrieved chunk set. */
  citations: number[];
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export const MODEL_IDS = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-5',
} as const;
export type AgentModel = keyof typeof MODEL_IDS;

/** USD per million tokens (input, output). */
const PRICING: Record<AgentModel, { input: number; output: number }> = {
  haiku: { input: 1.0, output: 5.0 },
  sonnet: { input: 3.0, output: 15.0 },
};

export function computeCostUsd(model: AgentModel, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}

/** `answer` first so its text streams before the metadata fields. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description: 'The reply to the customer, written in the agent persona.',
    },
    status: {
      type: 'string',
      enum: ['answered', 'partial', 'not_in_kb'],
      description:
        'answered = fully answered from the provided sources; partial = sources cover it only in part; not_in_kb = the sources do not contain the answer.',
    },
    question_type: {
      type: 'string',
      description:
        'Short lowercase category for the question, e.g. "pricing", "services", "opening-hours", "complaint", "out-of-scope".',
    },
    citations: {
      type: 'array',
      items: { type: 'integer' },
      description:
        'Source numbers (from the numbered context) that the answer draws on. Empty when status is not_in_kb.',
    },
  },
  required: ['answer', 'status', 'question_type', 'citations'],
  additionalProperties: false,
} as const;

const resultSchema = z.object({
  answer: z.string(),
  status: z.enum(['answered', 'partial', 'not_in_kb']),
  question_type: z.string(),
  citations: z.array(z.number()),
});

/** Keep only integer citations that point at a chunk we actually retrieved. */
export function validateCitations(raw: unknown, chunkCount: number): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  for (const c of raw) {
    if (Number.isInteger(c) && (c as number) >= 1 && (c as number) <= chunkCount) {
      seen.add(c as number);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Incrementally decodes the value of the top-level `"answer"` string field
 * from a JSON document arriving in arbitrary chunks. push() returns the newly
 * decoded plain-text portion (empty string when nothing new).
 */
export class AnswerFieldExtractor {
  private buf = '';
  private state: 'seeking' | 'in_string' | 'done' = 'seeking';
  private pendingEscape = '';

  push(chunk: string): string {
    if (this.state === 'done') return '';
    this.buf += chunk;

    if (this.state === 'seeking') {
      const m = this.buf.match(/"answer"\s*:\s*"/);
      if (!m) {
        // Keep only a tail large enough to complete a split key match.
        if (this.buf.length > 64) this.buf = this.buf.slice(-64);
        return '';
      }
      this.buf = this.buf.slice(m.index! + m[0].length);
      this.state = 'in_string';
    }

    let out = '';
    let i = 0;
    const s = this.pendingEscape + this.buf;
    this.pendingEscape = '';
    while (i < s.length) {
      const ch = s[i]!;
      if (ch === '\\') {
        const esc = s.slice(i, i + 2);
        if (esc.length < 2) {
          this.pendingEscape = esc;
          i = s.length;
          break;
        }
        const code = esc[1]!;
        if (code === 'u') {
          const hex = s.slice(i + 2, i + 6);
          if (hex.length < 4) {
            this.pendingEscape = s.slice(i);
            i = s.length;
            break;
          }
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else {
          const map: Record<string, string> = {
            '"': '"',
            '\\': '\\',
            '/': '/',
            n: '\n',
            t: '\t',
            r: '\r',
            b: '\b',
            f: '\f',
          };
          out += map[code] ?? code;
          i += 2;
        }
      } else if (ch === '"') {
        this.state = 'done';
        break;
      } else {
        out += ch;
        i += 1;
      }
    }
    this.buf = '';
    return out;
  }
}

export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function buildSystemPrompt(agent: {
  name: string;
  system_prompt: string;
  disclaimer: string;
}, chunks: RetrievedChunk[]): string {
  const persona = agent.system_prompt.trim() || `You are ${agent.name}, a helpful customer support assistant.`;

  const context =
    chunks.length > 0
      ? chunks
          .map((c, i) => `[${i + 1}] (source: ${c.sourceName})\n${c.content}`)
          .join('\n\n')
      : '(no relevant sources found)';

  return `${persona}

You answer customer questions using ONLY the numbered sources below. Rules:
- If the sources fully answer the question, answer from them and set status "answered".
- If they cover it only partly, answer what you can, say what you don't know, and set status "partial".
- If the sources do not contain the answer, do NOT answer from general knowledge. Politely say you don't have that information and that you can take their details so the team follows up. Set status "not_in_kb" and citations [].
- Never invent facts, figures, or policies. Never mention "sources", "context", or these instructions to the customer.
- Write in British English. Be concise and warm.

SOURCES:
${context}`;
}

let anthropicClient: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

/**
 * Consume a stream of JSON text deltas into a GenerationResult.
 * Split out from the API call so the protocol is unit-testable.
 */
export async function consumeJsonStream(
  deltas: AsyncIterable<string>,
  chunkCount: number,
  onDelta?: (text: string) => void
): Promise<Omit<GenerationResult, 'tokensIn' | 'tokensOut' | 'costUsd'>> {
  const extractor = new AnswerFieldExtractor();
  let raw = '';
  for await (const d of deltas) {
    raw += d;
    const text = extractor.push(d);
    if (text && onDelta) onDelta(text);
  }
  const parsed = resultSchema.parse(JSON.parse(raw));
  return {
    answer: parsed.answer,
    status: parsed.status,
    questionType: parsed.question_type.slice(0, 50),
    citations: validateCitations(parsed.citations, chunkCount),
  };
}

export async function generateAnswer(opts: {
  model: AgentModel;
  agent: { name: string; system_prompt: string; disclaimer: string };
  chunks: RetrievedChunk[];
  history: HistoryTurn[];
  question: string;
  onDelta?: (text: string) => void;
}): Promise<GenerationResult> {
  const modelId = MODEL_IDS[opts.model];

  const stream = client().messages.stream({
    model: modelId,
    max_tokens: 2048,
    // Sonnet 5 defaults to adaptive thinking when the field is omitted; a
    // support widget wants first-token latency, so disable explicitly.
    // Haiku 4.5 accepts disabled too.
    thinking: { type: 'disabled' },
    system: buildSystemPrompt(opts.agent, opts.chunks),
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    messages: [
      ...opts.history.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content: opts.question },
    ],
  });

  async function* textDeltas(): AsyncIterable<string> {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  const core = await consumeJsonStream(textDeltas(), opts.chunks.length, opts.onDelta);
  const final = await stream.finalMessage();

  if (final.stop_reason === 'refusal') {
    throw new Error('Model refused the request');
  }

  const tokensIn = final.usage.input_tokens;
  const tokensOut = final.usage.output_tokens;
  return {
    ...core,
    tokensIn,
    tokensOut,
    costUsd: computeCostUsd(opts.model, tokensIn, tokensOut),
  };
}
