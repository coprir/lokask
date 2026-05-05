// ================================================================
// LOKASK Backend — src/index.ts
// Node.js + Express API Server
// ================================================================

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { notFoundHandler } from './middleware/notFound';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import serviceRoutes from './routes/services';
import bookingRoutes from './routes/bookings';
import messageRoutes from './routes/messages';
import paymentRoutes from './routes/payments';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import webhookRoutes from './routes/webhooks';

const app = express();

// ─── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.ALLOWED_ORIGINS.split(','),
  credentials: true,
}));

// ─── Webhook route MUST come before JSON parser ───────────────
// Stripe webhooks need raw body
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);

// ─── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Rate limiting ────────────────────────────────────────────
app.use('/api/', rateLimiter);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────
const v1 = '/api/v1';

app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/services`, serviceRoutes);
app.use(`${v1}/bookings`, bookingRoutes);
app.use(`${v1}/messages`, messageRoutes);
app.use(`${v1}/payments`, paymentRoutes);
app.use(`${v1}/reviews`, reviewRoutes);
app.use(`${v1}/notifications`, notificationRoutes);

// ─── 404 + Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info(`🚀 LOKASK API running on port ${PORT} [${config.NODE_ENV}]`);
});

export default app;
