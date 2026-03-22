'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { startScheduler } = require('./services/escalationService');
const notificationStore = require('./notifications/notificationStore');

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ──────────────────────────────────────────────────────────
const allowed = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(null, true); // allow all in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Request logger (dev) ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── WhatsApp Webhook (Twilio hits this — no /api prefix, no auth) ─
const { handleIncoming } = require('./services/whatsappWebhook');
app.post('/webhook/whatsapp', express.urlencoded({ extended: false }), handleIncoming);

// ── Routes ────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'JanSamadhan API', ts: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

notificationStore.initialize()
  .then(() => {
    console.log('[Notifications] SQLite store initialized');
  })
  .catch((err) => {
    console.error('[Notifications] SQLite initialization failed:', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════╗');
      console.log(`║  🏛️  JanSamadhan API — Port ${PORT}      ║`);
      console.log(`║  ENV: ${(process.env.NODE_ENV||'development').padEnd(29)}║`);
      console.log('╚══════════════════════════════════════╝\n');
      startScheduler();
    });
  });

module.exports = app;
