/**
 * Text chunker for knowledge-base documents.
 * Strategy: ~500 tokens per chunk, 50-token overlap.
 * Split order: paragraph boundaries → sentence boundaries → hard split.
 * Rough heuristic: 1 token ≈ 4 characters.
 */

const CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN; // 2000
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN; // 200

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  // If the whole text fits in one chunk, return it directly
  if (cleaned.length <= TARGET_CHUNK_CHARS) {
    return [cleaned];
  }

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph would exceed the target, flush current
    if (current && (current.length + trimmed.length + 2) > TARGET_CHUNK_CHARS) {
      chunks.push(current.trim());
      // Overlap: keep the tail of current chunk
      const overlapStart = Math.max(0, current.length - OVERLAP_CHARS);
      current = current.slice(overlapStart).trim() + '\n\n' + trimmed;
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed;
    }

    // If a single paragraph is too long, split it by sentences
    if (current.length > TARGET_CHUNK_CHARS) {
      const sentenceChunks = splitLongBlock(current);
      // Add all but the last chunk (last one continues accumulating)
      for (let i = 0; i < sentenceChunks.length - 1; i++) {
        chunks.push(sentenceChunks[i].trim());
      }
      current = sentenceChunks[sentenceChunks.length - 1];
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(c => c.length > 0);
}

function splitLongBlock(text: string): string[] {
  // Split on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && (current.length + sentence.length) > TARGET_CHUNK_CHARS) {
      chunks.push(current.trim());
      const overlapStart = Math.max(0, current.length - OVERLAP_CHARS);
      current = current.slice(overlapStart).trim() + ' ' + sentence;
    } else {
      current = current ? current + sentence : sentence;
    }

    // Hard split if a single sentence is absurdly long
    if (current.length > TARGET_CHUNK_CHARS * 1.5) {
      while (current.length > TARGET_CHUNK_CHARS) {
        chunks.push(current.slice(0, TARGET_CHUNK_CHARS).trim());
        current = current.slice(TARGET_CHUNK_CHARS - OVERLAP_CHARS).trim();
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
