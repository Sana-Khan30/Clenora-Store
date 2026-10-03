const express = require('express');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { authenticate } = require('../middleware/auth');
const schemas = require('../validators/auth.validator');
const c = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: schemas.register }), c.register);
router.post('/login', authLimiter, validate({ body: schemas.login }), c.login);
router.post('/admin/login', authLimiter, validate({ body: schemas.login }), c.adminLogin);
router.post('/logout', authenticate, c.logout);

router.get('/me', authenticate, c.getMe);
router.patch('/me', authenticate, validate({ body: schemas.updateProfile }), c.updateMe);
router.patch(
  '/me/password',
  authenticate,
  authLimiter,
  validate({ body: schemas.changePassword }),
  c.changePassword
);

module.exports = router;
