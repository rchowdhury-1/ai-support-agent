import type { Request, Response, RequestHandler } from 'express';

/**
 * Wraps an async route handler so a thrown or rejected error is logged with
 * request context and answered with a 500 — replacing the identical
 * `try { … } catch (err) { console.error(…); res.status(500)… }` block that
 * every generic handler used to repeat.
 *
 * Handlers that need a non-500 error response (validation 400s, upstream
 * 502s, SSE streams) keep their own try/catch and are intentionally not
 * wrapped with this.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res) => {
    Promise.resolve(handler(req as unknown as Req, res)).catch((err) => {
      console.error(`${req.method} ${req.originalUrl} error:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  };
}
