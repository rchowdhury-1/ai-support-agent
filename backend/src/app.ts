import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const REQUIRED_ENV = ['JWT_SECRET', 'REFRESH_SECRET', 'DATABASE_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// Dashboard/auth traffic arrives same-origin through the Next.js proxy in
// production; CORS here covers direct local development only. The public
// /chat routes get per-agent origin binding in their own router — no CORS *.
const dashboardCors = cors({
  origin: [process.env.CLIENT_URL || '', 'http://localhost:3141'].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
app.use((req, res, next) => {
  if (req.path.startsWith('/chat')) return next();
  return dashboardCors(req, res, next);
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth', authRoutes);
app.use('/chat', chatLimiter, chatRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: 2, timestamp: new Date().toISOString() });
});

export default app;
