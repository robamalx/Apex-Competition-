'use server';

import { sql } from '@/lib/db';

export interface DbVersionResult {
  success: boolean;
  version?: string;
  error?: string;
}

export async function testDatabaseConnection(): Promise<DbVersionResult> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not configured.');
    }

    const response = await sql`SELECT version();`;
    const version = response[0]?.version as string;

    return {
      success: true,
      version,
    };
  } catch (error: any) {
    console.error('[Neon Database Test Error]:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to query database version.',
    };
  }
}
