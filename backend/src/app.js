const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const sanitize = require('./middleware/sanitize');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');
// Hosting providers put the app behind one reverse proxy; needed so rate limiting sees real client IPs.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = non-browser client (curl, health checks): allowed.
      if (!origin) return callback(null, true);

      // Explicitly allowed client origins from env (e.g. CLIENT_URL)
      if (env.clientOrigins.includes(origin)) return callback(null, true);

      // Automatically allow frontend deployed on render (e.g. https://clenora-store-1.onrender.com)
      if (/^https:\/\/clenora-[a-z0-9-]+\.onrender\.com$/.test(origin)) {
        return callback(null, true);
      }

      // Automatically allow frontend deployed on Vercel
      if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow localhost in non-production environments
      if (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  })
);

app.use(globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(sanitize);

// Mount routes under both /api and root so requests succeed even if /api is omitted in frontend config
app.use('/api', routes);
app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
