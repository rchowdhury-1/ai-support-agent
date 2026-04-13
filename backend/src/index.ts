import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import agentsRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';
import conversationsRoutes from './routes/conversations.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const REQUIRED_ENV = ['JWT_SECRET', 'REFRESH_SECRET', 'DATABASE_URL', 'GROQ_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Allow all origins for public chat routes (widget can be embedded anywhere)
app.use('/chat', cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));

// Handle preflight for chat routes
app.options('/chat/*', cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(cors({
  origin: [
    process.env.CLIENT_URL || '',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const isDev = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/agents', agentsRoutes);
app.use('/chat', chatLimiter, chatRoutes);
app.use('/conversations', conversationsRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
