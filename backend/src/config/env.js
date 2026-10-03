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
  CLIENT_URL: z.string().min(1, 'is required'),
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
  clientOrigins = parsed.data.CLIENT_URL.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  for (const origin of clientOrigins) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      problems.push(`CLIENT_URL: "${origin}" is not a valid URL`);
      continue;
    }
    if (url.origin !== origin) {
      problems.push(`CLIENT_URL: "${origin}" must be an origin only (no path), e.g. https://example.com`);
    }
    if (parsed.data.NODE_ENV === 'production' && url.protocol !== 'https:') {
      problems.push(`CLIENT_URL: "${origin}" must use https in production`);
    }
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
