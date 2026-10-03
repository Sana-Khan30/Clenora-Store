// Must be required BEFORE anything from src/. Sets safe values for tests.
// Database tests only run when TEST_MONGODB_URI is set (in backend/.env or the shell).
// It must point at a database whose name ends with "_test" (it gets wiped between tests).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

const testUri = process.env.TEST_MONGODB_URI;

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = testUri || 'mongodb://127.0.0.1:27017/cleany_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.CLIENT_URL = 'http://localhost:5173';
// Tests must never talk to the real Cloudinary account, even if backend/.env has real keys.
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

module.exports = { hasTestDb: Boolean(testUri) };
