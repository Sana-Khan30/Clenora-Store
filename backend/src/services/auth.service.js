const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ROUNDS = env.isTest ? 4 : 12;
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', ROUNDS);

function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash || DUMMY_HASH).then((match) => Boolean(hash) && match);
}

function signToken(user) {
  return jwt.sign({ role: user.role, tv: user.tokenVersion || 0 }, env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
