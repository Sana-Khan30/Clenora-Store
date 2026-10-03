// Creates the first admin account. Run once from the backend folder:  npm run create-admin
// Reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from backend/.env (never from the command line,
// never printed). Only someone with access to the server's .env and database can run it.
// Delete the three ADMIN_* lines from .env afterwards.
//   --promote  turns an existing CUSTOMER with that email into an admin (their password is unchanged).
require('../config/env');
const { z } = require('zod');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { hashPassword } = require('../services/auth.service');
const { email } = require('../validators/auth.validator');

const schema = z.object({
  ADMIN_NAME: z.string().trim().min(2).max(60),
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'must be at least 12 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'must contain a letter')
    .regex(/[0-9]/, 'must contain a number'),
});

async function main() {
  const promote = process.argv.includes('--promote');

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Admin settings in .env are missing or invalid:');
    parsed.error.issues.forEach((i) => console.error(`  - ${i.path.join('.')}: ${i.message}`));
    return 1;
  }
  const { ADMIN_NAME: name, ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: password } = parsed.data;

  await connectDB();
  await User.init();

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`An admin with email ${adminEmail} already exists. Nothing was changed.`);
      return 0;
    }
    if (!promote) {
      console.error(`${adminEmail} already exists as a customer. Run "npm run create-admin -- --promote" to make it an admin.`);
      return 1;
    }
    existing.role = 'admin';
    existing.tokenVersion = (existing.tokenVersion || 0) + 1;
    await existing.save();
    console.log(`${adminEmail} was promoted to admin. Its password was not changed.`);
    return 0;
  }

  await User.create({
    name,
    email: adminEmail,
    password: await hashPassword(password),
    role: 'admin',
  });
  console.log(`Admin created: ${adminEmail}`);
  console.log('Now delete ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD from your .env file.');
  return 0;
}

main()
  .then(async (code) => {
    await disconnectDB().catch(() => {});
    process.exit(code);
  })
  .catch(async (err) => {
    console.error('Failed to create admin:', err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
