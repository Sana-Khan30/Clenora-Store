const path = require('path');
const { z } = require('zod');

require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'is required')
    .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
      message: 'must start with mongodb:// or mongodb+srv://',
    }),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CLIENT_URL: z.string().default('https://clenora-store-1.onrender.com,http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
const problems = [];

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    problems.push(`${issue.path.join('.')}: ${issue.message}`);
  }
}

let clientOrigins = [];
if (parsed.success) {
  const rawOrigins = parsed.data.CLIENT_URL.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  for (const raw of rawOrigins) {
    try {
      const url = new URL(raw);
      clientOrigins.push(url.origin);
    } catch {
      problems.push(`CLIENT_URL: "${raw}" is not a valid URL`);
    }
  }

  // Ensure known deployed frontend origin is always accepted
  if (!clientOrigins.includes('https://clenora-store-1.onrender.com')) {
    clientOrigins.push('https://clenora-store-1.onrender.com');
  }
}

if (problems.length > 0) {
  console.error('Invalid environment configuration (values are not shown):');
  problems.forEach((p) => console.error(`  - ${p}`));
  console.error('Check backend/.env against backend/.env.example');
  process.exit(1);
}

const data = parsed.data;

module.exports = {
  ...data,
  clientOrigins,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  cloudinary: {
    cloudName: data.CLOUDINARY_CLOUD_NAME,
    apiKey: data.CLOUDINARY_API_KEY,
    apiSecret: data.CLOUDINARY_API_SECRET,
  },
};
