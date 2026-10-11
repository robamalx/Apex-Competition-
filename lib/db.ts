import { neon, neonConfig } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // Allow fallback or warning in non-runtime environments, but throw if called
  console.warn('[Neon DB] Warning: DATABASE_URL environment variable is not defined.');
}

// Enable connection caching across serverless function invocations
neonConfig.fetchConnectionCache = true;

export const sql = neon(process.env.DATABASE_URL || '');
