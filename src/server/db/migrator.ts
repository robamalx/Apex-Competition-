import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { dbPool } from './pool.js';

export interface MigrationRecord {
  version: string;
  name: string;
  applied_at: Date;
  checksum: string;
}

export class DatabaseMigrator {
  private static migrationsDir = path.join(process.cwd(), 'src', 'server', 'db', 'migrations');

  public static async initializeMigrationTable(client: pg.PoolClient): Promise<void> {
    const checkRes = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations'");
    if (checkRes.rows.length === 0) {
      await client.query(`
        CREATE TABLE schema_migrations (
          version VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          checksum VARCHAR(64) NOT NULL
        );
      `);
    }
  }

  public static async getAppliedMigrations(client: pg.PoolClient): Promise<Map<string, MigrationRecord>> {
    await this.initializeMigrationTable(client);
    const res = await client.query<MigrationRecord>('SELECT * FROM schema_migrations ORDER BY version ASC');
    const map = new Map<string, MigrationRecord>();
    for (const row of res.rows) {
      map.set(row.version, row);
    }
    return map;
  }

  public static async runMigrations(pool?: pg.Pool): Promise<{
    appliedCount: number;
    appliedMigrations: string[];
  }> {
    const targetPool = pool || dbPool.getPool();
    const client = await targetPool.connect();

    try {
      await this.initializeMigrationTable(client);
      const applied = await this.getAppliedMigrations(client);

      if (!fs.existsSync(this.migrationsDir)) {
        throw new Error(`Migrations directory not found at: ${this.migrationsDir}`);
      }

      const files = fs
        .readdirSync(this.migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const newlyApplied: string[] = [];

      for (const file of files) {
        const version = file.split('_')[0];
        const filePath = path.join(this.migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

        if (applied.has(version)) {
          const prev = applied.get(version)!;
          if (prev.checksum !== checksum) {
            console.warn(
              `[Migrator] WARNING: Migration ${file} (version ${version}) checksum mismatch. Applied: ${prev.checksum.substring(0, 8)}, Current: ${checksum.substring(0, 8)}`
            );
          }
          continue;
        }

        console.log(`[Migrator] Applying migration: ${file}...`);
        await client.query('BEGIN');
        try {
          await client.query(sqlContent);
          await client.query(
            'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
            [version, file, checksum]
          );
          await client.query('COMMIT');
          newlyApplied.push(file);
          console.log(`[Migrator] Applied successfully: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          console.error(`[Migrator] FAILED applying ${file}:`, err);
          throw err;
        }
      }

      return {
        appliedCount: newlyApplied.length,
        appliedMigrations: newlyApplied
      };
    } finally {
      client.release();
    }
  }
}
