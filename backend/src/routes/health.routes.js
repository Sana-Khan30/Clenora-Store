const express = require('express');
const mongoose = require('mongoose');
const { ok } = require('../utils/response');

const router = express.Router();
const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const connected = state === 1;
  const payload = {
    status: connected ? 'ok' : 'unavailable',
    database: STATES[state] || 'unknown',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  if (connected) return ok(res, payload);
  return res.status(503).json({ success: false, message: 'Database not connected', data: payload });
});

module.exports = router;
