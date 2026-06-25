import { Router, Response } from 'express';
import multer from 'multer';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { chunkText } from '../services/chunker.js';
import { embedTexts } from '../services/embeddings.js';
import { toSql } from 'pgvector';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/plain', 'text/markdown', 'text/x-markdown'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .md files are supported'));
    }
  },
});

// Verify agent belongs to authenticated user
async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
    [agentId, userId]
  );
  return result.rows.length > 0;
}

// List documents for an agent
router.get('/:agentId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!await verifyAgentOwnership(req.params.agentId, req.userId!)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const result = await pool.query(
      `SELECT id, filename, file_size, chunk_count, status, error_message, created_at, updated_at
       FROM knowledge_documents
       WHERE agent_id = $1
       ORDER BY created_at DESC`,
      [req.params.agentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a document
router.post('/:agentId/upload', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!await verifyAgentOwnership(req.params.agentId, req.userId!)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const text = req.file.buffer.toString('utf-8');
    if (!text.trim()) {
      res.status(400).json({ error: 'File is empty' });
      return;
    }

    // Create document record
    const docResult = await pool.query(
      `INSERT INTO knowledge_documents (agent_id, filename, file_size, status)
       VALUES ($1, $2, $3, 'processing')
       RETURNING *`,
      [req.params.agentId, req.file.originalname, req.file.size]
    );
    const doc = docResult.rows[0];

    // Return immediately, process async
    res.status(201).json(doc);

    // Process in background (no await)
    processDocument(doc.id, text).catch(err => {
      console.error(`Document processing failed for ${doc.id}:`, err);
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a document
router.delete('/:agentId/:docId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!await verifyAgentOwnership(req.params.agentId, req.userId!)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM knowledge_documents WHERE id = $1 AND agent_id = $2 RETURNING id',
      [req.params.docId, req.params.agentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry processing a stuck/errored document
router.post('/:agentId/:docId/retry', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!await verifyAgentOwnership(req.params.agentId, req.userId!)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const docResult = await pool.query(
      `SELECT id, status FROM knowledge_documents
       WHERE id = $1 AND agent_id = $2 AND status IN ('error', 'processing')`,
      [req.params.docId, req.params.agentId]
    );

    if (docResult.rows.length === 0) {
      res.status(404).json({ error: 'Document not found or already processed' });
      return;
    }

    // Delete existing chunks and reset status
    await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [req.params.docId]);
    await pool.query(
      `UPDATE knowledge_documents
       SET status = 'processing', error_message = NULL, chunk_count = 0, updated_at = NOW()
       WHERE id = $1`,
      [req.params.docId]
    );

    // We need the original text — since we don't store it, fetch from chunks or require re-upload
    // For retry, we'll need the user to re-upload. Mark it as needing re-upload.
    await pool.query(
      `UPDATE knowledge_documents
       SET status = 'error', error_message = 'Please re-upload this file to retry processing'
       WHERE id = $1`,
      [req.params.docId]
    );

    res.json({ message: 'Please re-upload the file to retry processing' });
  } catch (err) {
    console.error('Retry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processDocument(documentId: string, text: string): Promise<void> {
  try {
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await pool.query(
        `UPDATE knowledge_documents SET status = 'error', error_message = 'No content to process', updated_at = NOW() WHERE id = $1`,
        [documentId]
      );
      return;
    }

    // Embed in batches of 20 to stay within API limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedTexts(batch);

      // Insert chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        await pool.query(
          `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4)`,
          [documentId, i + j, batch[j], toSql(embeddings[j])]
        );
      }
    }

    await pool.query(
      `UPDATE knowledge_documents SET status = 'ready', chunk_count = $1, updated_at = NOW() WHERE id = $2`,
      [chunks.length, documentId]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during processing';
    await pool.query(
      `UPDATE knowledge_documents SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [message, documentId]
    ).catch(() => {}); // Don't throw if the error update itself fails
    throw err;
  }
}

export default router;
