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
      if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(sanitize);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
