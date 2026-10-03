const express = require('express');
const c = require('../controllers/settings.controller');

// Public: the website reads the WhatsApp number and shipping rule from here.
const router = express.Router();
router.get('/public', c.getPublic);

module.exports = router;
