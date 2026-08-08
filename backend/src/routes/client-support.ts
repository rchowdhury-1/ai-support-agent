import { type AuthedRequest } from '../middleware/auth.js';

/** The authenticated client's tenant — RLS scope for every /api/* query. */
export function tenantId(req: AuthedRequest): string {
  return req.auth!.tenantId!;
}
