import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface Auth {
  userId: string;
  tenantId: string | null;
  role: 'operator' | 'client';
}

export interface AuthedRequest extends Request {
  auth?: Auth;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      tenantId: string | null;
      role: 'operator' | 'client';
    };
    req.auth = { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Client-dashboard routes: a client user scoped to their tenant. */
export function requireClient(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'client' || !req.auth.tenantId) {
      res.status(403).json({ error: 'Client access required' });
      return;
    }
    next();
  });
}

/** Operator routes: the operator role only. */
export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'operator') {
      res.status(403).json({ error: 'Operator access required' });
      return;
    }
    next();
  });
}
