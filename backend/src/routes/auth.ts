import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db/pool.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, email, password } = result.data;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, plan, created_at',
      [name, email, password_hash]
    );
    const user = userResult.rows[0];

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [refreshToken, user.id, expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user, accessToken });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { email, password } = result.data;

  try {
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, plan, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userResult.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [refreshToken, user.id, expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET!) as { userId: string };

    const stored = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [token, payload.userId]
    );

    if (stored.rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const userResult = await pool.query(
      'SELECT id, name, email, plan, created_at FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user.id);
    res.json({ user, accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

export default router;
