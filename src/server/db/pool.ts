import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface DbPoolConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  statementTimeoutMillis: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function getPoolConfig(): DbPoolConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const connectionString = process.env.DATABASE_URL;

  const maxConnections = parseInt(process.env.PG_MAX_CONNECTIONS || '20', 10);
  const idleTimeoutMillis = parseInt(process.env.PG_IDLE_TIMEOUT_MS || '10000', 10);
  const connectionTimeoutMillis = parseInt(process.env.PG_CONN_TIMEOUT_MS || '5000', 10);
  const statementTimeoutMillis = parseInt(process.env.PG_STMT_TIMEOUT_MS || '5000', 10);

  let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;
  if (process.env.PG_SSL === 'true' || (isProd && connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))) {
    ssl = { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' };
  }

  if (connectionString) {
    return {
      connectionString,
      maxConnections,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      statementTimeoutMillis,
      ssl
    };
  }

  if (isProd && !connectionString && (!process.env.PGPASSWORD || process.env.PGPASSWORD === 'postgres')) {
    throw new Error('PRODUCTION_SECURITY_VIOLATION: Insecure default database password detected in production environment. A dedicated, non-default PGPASSWORD or DATABASE_URL is required.');
  }

  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || (process.env.NODE_ENV === 'test' ? 'apex_arena_test' : 'apex_arena'),
    maxConnections,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    statementTimeoutMillis,
    ssl
  };
}

class DatabasePoolManager {
  private static instance: pg.Pool | null = null;
  private static isShuttingDown = false;

  public static setPool(pool: pg.Pool): void {
    this.instance = pool;
  }

  public static getPool(): pg.Pool {
    if (this.instance) {
      return this.instance;
    }

    const config = getPoolConfig();

    const poolConfig: pg.PoolConfig = config.connectionString
      ? {
          connectionString: config.connectionString,
          max: config.maxConnections,
          idleTimeoutMillis: config.idleTimeoutMillis,
          connectionTimeoutMillis: config.connectionTimeoutMillis,
          ssl: config.ssl,
          statement_timeout: config.statementTimeoutMillis
        }
      : {
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          max: config.maxConnections,
          idleTimeoutMillis: config.idleTimeoutMillis,
          connectionTimeoutMillis: config.connectionTimeoutMillis,
          ssl: config.ssl,
          statement_timeout: config.statementTimeoutMillis
        };

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      if (!this.isShuttingDown) {
        console.error('[PostgreSQL Pool] Unexpected client error on idle client:', err.message);
      }
    });

    this.instance = pool;
    return pool;
  }

  public static async query<R extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<pg.QueryResult<R>> {
    const pool = this.getPool();
    return pool.query<R>(text, params);
  }

  public static async withTransaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>,
    isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' = 'READ COMMITTED'
  ): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  public static async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const res = await this.query('SELECT 1 AS health');
      const latencyMs = Date.now() - start;
      return {
        healthy: res.rows[0]?.health === 1,
        latencyMs
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: err?.message || 'Database connection error'
      };
    }
  }

  public static async closePool(): Promise<void> {
    if (this.instance) {
      this.isShuttingDown = true;
      await this.instance.end();
      this.instance = null;
    }
  }
}

export const dbPool = DatabasePoolManager;
export const getPool = () => DatabasePoolManager.getPool();
export default dbPool;
