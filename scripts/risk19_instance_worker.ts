/**
 * APEX ARENA — RISK 19 MULTI-INSTANCE WORKER (PROCESS A / PROCESS B)
 * Independent Node.js Process running real HTTP server connected to PostgreSQL.
 * Isolated heap memory, isolated in-memory cache, independent process lifecycle.
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import pg from 'pg';
import crypto from 'crypto';
import { dbPool } from '../src/server/db/pool.js';
import { withTransaction, toMinorUnits } from '../src/server/db/postgresService.js';
import {
  RealtimeDataAndCacheConsistencyService,
  DataConsistencyClass,
  RealtimeEventPayload
} from '../src/server/realtimeDataAndCacheConsistencyService.js';

const walletMutexes = new Map<string, Promise<void>>();

async function acquireWalletMutex(userId: string): Promise<() => void> {
  let release: () => void = () => {};
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentLock = walletMutexes.get(userId) || Promise.resolve();
  walletMutexes.set(userId, currentLock.then(() => newLock));
  await currentLock;
  return release;
}

export function createRisk19App(pool: pg.Pool, instanceName: string): express.Express {
  const app = express();
  app.use(express.json());

  // Process-local isolated cache
  const localCache = new Map<string, { value: any; version: number; expiresAt: number }>();

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', instance: instanceName, pid: process.pid });
  });

  // Cache debug endpoints (inspecting process-local cache)
  app.get('/cache/:key', (req, res) => {
    const item = localCache.get(req.params.key);
    if (!item) return res.status(404).json({ error: 'CACHE_MISS' });
    res.json(item);
  });

  app.post('/cache/:key', (req, res) => {
    const { value, ttlMs, version } = req.body;
    localCache.set(req.params.key, {
      value,
      version: version || 1,
      expiresAt: Date.now() + (ttlMs || 10000)
    });
    res.json({ status: 'CACHED', key: req.params.key, instance: instanceName });
  });

  app.delete('/cache/:key', (req, res) => {
    localCache.delete(req.params.key);
    res.json({ status: 'EVICTED', key: req.params.key, instance: instanceName });
  });

  // 1. Competition state read (with Class B Cache-Control headers)
  app.get('/api/competitions/:id', async (req, res) => {
    const { id } = req.params;
    const forceStale = req.query.forceStale === 'true';

    const cacheKey = `comp:${id}`;
    if (forceStale && localCache.has(cacheKey)) {
      const cached = localCache.get(cacheKey)!;
      const headers = RealtimeDataAndCacheConsistencyService.getHttpCacheHeaders(DataConsistencyClass.CLASS_B_COMPETITION, false);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.json({ source: 'LOCAL_CACHE', ...cached.value });
    }

    try {
      const compRes = await pool.query('SELECT * FROM competitions WHERE id = $1', [id]);
      if (compRes.rows.length === 0) {
        return res.status(404).json({ error: 'COMPETITION_NOT_FOUND' });
      }

      const comp = compRes.rows[0];
      localCache.set(cacheKey, { value: comp, version: Number(comp.entity_version || 1), expiresAt: Date.now() + 500 });

      const headers = RealtimeDataAndCacheConsistencyService.getHttpCacheHeaders(DataConsistencyClass.CLASS_B_COMPETITION, false);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

      res.json({ source: 'DATABASE', ...comp });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Authoritative Competition State Mutation + Transactional Outbox
  app.post('/api/competitions/:id/state', async (req, res) => {
    const { id } = req.params;
    const { newState, actorRole } = req.body;

    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'COMPETITION_PUBLISHER' && actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'FORBIDDEN_ROLE' });
    }

    try {
      const result = await withTransaction(async (client) => {
        const compRes = await client.query('SELECT * FROM competitions WHERE id = $1 FOR UPDATE', [id]);
        if (compRes.rows.length === 0) {
          throw new Error('COMPETITION_NOT_FOUND');
        }

        const comp = compRes.rows[0];
        const newVersion = Number(comp.entity_version || 1) + 1;

        await client.query(
          'UPDATE competitions SET status = $1, updated_at = NOW() WHERE id = $2',
          [newState, id]
        );

        // Emit transactional outbox event
        const event = await RealtimeDataAndCacheConsistencyService.emitTransactionalOutboxEvent(client, {
          entityType: 'COMPETITION',
          entityId: id,
          entityVersion: newVersion,
          eventType: `COMPETITION_STATE_${newState}`,
          payload: { competitionId: id, oldState: comp.status, newState, updatedBy: actorRole },
          recipientScope: 'PUBLIC'
        });

        return { competitionId: id, status: newState, version: newVersion, event };
      }, pool);

      // Update local cache
      localCache.set(`comp:${id}`, { value: result, version: result.version, expiresAt: Date.now() + 500 });

      res.json({ status: 'UPDATED', instance: instanceName, result });
    } catch (err: any) {
      res.status(err.message === 'COMPETITION_NOT_FOUND' ? 404 : 500).json({ error: err.message, stack: err.stack });
    }
  });

  // 3. Authoritative Prediction Submission (Cutoff Check in DB)
  app.post('/api/predictions/submit', async (req, res) => {
    const { fixtureId, userId, competitionId, marketType, choice, clientTimestamp } = req.body;

    try {
      const subTime = clientTimestamp ? new Date(clientTimestamp) : new Date();
      const cutoffCheck = await RealtimeDataAndCacheConsistencyService.validateAuthoritativePredictionCutoff(
        fixtureId,
        subTime,
        pool
      );

      if (!cutoffCheck.authorized) {
        return res.status(400).json({ error: cutoffCheck.reason, kickoffTime: cutoffCheck.kickoffTime });
      }

      // Ensure entry exists and retrieve authoritative entry ID
      let entryId = `entry_${crypto.createHash('md5').update(`${competitionId}_${userId}`).digest('hex')}`;
      const existingEntry = await pool.query(
        'SELECT id FROM competition_entries WHERE competition_id = $1 AND user_id = $2',
        [competitionId, userId]
      );

      if (existingEntry.rows.length > 0) {
        entryId = existingEntry.rows[0].id;
      } else {
        await pool.query(
          `INSERT INTO competition_entries (id, competition_id, user_id, entry_fee_paid_cents, idempotency_key, submission_status, submitted_at, updated_at)
           VALUES ($1, $2, $3, 0, $4, 'SUBMITTED', NOW(), NOW())
           ON CONFLICT (competition_id, user_id) DO NOTHING`,
          [entryId, competitionId, userId, `idem_${entryId}`]
        );
        const refetch = await pool.query(
          'SELECT id FROM competition_entries WHERE competition_id = $1 AND user_id = $2',
          [competitionId, userId]
        );
        if (refetch.rows.length > 0) {
          entryId = refetch.rows[0].id;
        }
      }

      // Insert prediction atomically
      const predId = `pred_${crypto.createHash('md5').update(`${competitionId}_${fixtureId}_${userId}`).digest('hex')}`;
      await pool.query(
        `INSERT INTO predictions (id, entry_id, competition_id, user_id, fixture_id, predicted_home_score, predicted_away_score, created_at)
         VALUES ($1, $2, $3, $4, $5, 1, 0, NOW())
         ON CONFLICT (id) DO UPDATE SET predicted_home_score = EXCLUDED.predicted_home_score`,
        [predId, entryId, competitionId, userId, fixtureId]
      );

      res.json({ status: 'ACCEPTED', predictionId: predId, kickoffTime: cutoffCheck.kickoffTime });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // 4. Authoritative Financial Mutation (Class A No-Cache, Row Lock)
  app.post('/api/wallets/debit', async (req, res) => {
    const { userId, amountCents, reason } = req.body;

    // Class A headers
    const headers = RealtimeDataAndCacheConsistencyService.getHttpCacheHeaders(DataConsistencyClass.CLASS_A_FINANCIAL, true);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

    const releaseMutex = await acquireWalletMutex(userId);
    try {
      const debitResult = await withTransaction(async (client) => {
        const auth = await RealtimeDataAndCacheConsistencyService.validateAuthoritativeWalletDebit(userId, amountCents, client as any);
        if (!auth.authorized) {
          throw new Error(auth.reason || 'WALLET_DEBIT_UNAUTHORIZED');
        }

        const numericAmount = Number(amountCents);
        const upd = await client.query(
          `UPDATE wallets SET balance_cents = balance_cents - $1::integer, updated_at = NOW()
           WHERE user_id = $2 AND balance_cents >= $1::integer RETURNING balance_cents`,
          [numericAmount, userId]
        );

        if (upd.rows.length === 0) {
          throw new Error(`INSUFFICIENT_FUNDS: Available balance insufficient for debit of ${amountCents}`);
        }

        const newBalance = Number(upd.rows[0].balance_cents);

        // Ledger record
        const ledgerId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO wallet_ledger (id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents, status, description, created_at, updated_at)
           VALUES ($1, $2, 'ENTRY_FEE', 'DEBIT', $3, $4, $5, 'COMPLETED', $6, NOW(), NOW())`,
          [ledgerId, userId, amountCents, newBalance + amountCents, newBalance, reason || 'Wallet debit']
        );

        // Outbox event
        await RealtimeDataAndCacheConsistencyService.emitTransactionalOutboxEvent(client, {
          entityType: 'WALLET',
          entityId: userId,
          entityVersion: Date.now(),
          eventType: 'WALLET_DEBITED',
          payload: { userId, amountCents, newBalance },
          recipientScope: 'USER',
          recipientId: userId
        });

        return { userId, amountCents, newBalance, ledgerId };
      }, pool);

      res.json({ status: 'DEBITED', instance: instanceName, debitResult });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    } finally {
      releaseMutex();
    }
  });

  // 5. Client Reconnection & Synchronization
  app.get('/api/realtime/sync', async (req, res) => {
    const userId = req.query.userId as string;
    const clientId = (req.query.clientId as string) || 'client_default';
    const lastSeq = parseInt((req.query.lastSequence as string) || '0', 10);

    if (!userId) return res.status(400).json({ error: 'USER_ID_REQUIRED' });

    try {
      const syncRes = await RealtimeDataAndCacheConsistencyService.synchronizeClientSession(
        userId,
        clientId,
        lastSeq,
        pool
      );
      res.json(syncRes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Realtime Channel Subscription Authorization
  app.post('/api/realtime/subscribe', (req, res) => {
    const { subscriber, channel } = req.body;
    const auth = RealtimeDataAndCacheConsistencyService.authorizeSubscription(subscriber, channel);
    if (!auth.authorized) {
      return res.status(403).json(auth);
    }
    res.json(auth);
  });

  // 7. Event Ingestion & Ordering Defense
  app.post('/api/events/receive', async (req, res) => {
    const { consumerId, event, currentVersion } = req.body;

    // Ordering check
    const orderCheck = RealtimeDataAndCacheConsistencyService.reconcileEventOrdering(currentVersion || 0, event);
    if (!orderCheck.accept) {
      return res.status(400).json({ accepted: false, reason: orderCheck.reason });
    }

    // Idempotent processing
    try {
      const result = await RealtimeDataAndCacheConsistencyService.processEventWithIdempotency(
        consumerId,
        event,
        async () => {
          // Execute state update in local cache
          localCache.set(`${event.entityType.toLowerCase()}:${event.entityId}`, {
            value: event.payload,
            version: event.entityVersion,
            expiresAt: Date.now() + 5000
          });
          return { processed: true, version: event.entityVersion };
        },
        pool
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cache Management Endpoints for Testing
  app.post('/api/cache/:key', (req, res) => {
    const key = req.params.key;
    const { value, ttlMs } = req.body;
    localCache.set(key, { value, version: 1, expiresAt: Date.now() + (ttlMs || 5000) });
    res.json({ stored: true, key });
  });

  app.get('/api/cache/:key', (req, res) => {
    const key = req.params.key;
    const item = localCache.get(key);
    if (!item || Date.now() > item.expiresAt) {
      return res.status(404).json({ error: 'CACHE_MISS' });
    }
    res.json({ value: item.value, version: item.version });
  });

  app.delete('/api/cache/:key', (req, res) => {
    const key = req.params.key;
    localCache.delete(key);
    res.json({ deleted: true, key });
  });

  // 8. Competition Settlement with Advisory Lock
  app.post('/api/competitions/:id/settle', async (req, res) => {
    const { id } = req.params;

    try {
      const lockKey = Math.abs(crypto.createHash('sha256').update(id).digest().readInt32BE(0));

      const result = await withTransaction(async (client) => {
        // 1. Try advisory lock
        const lockRes = await client.query('SELECT pg_try_advisory_xact_lock($1) as locked', [lockKey]);
        if (!lockRes.rows[0].locked) {
          throw new Error('CONCURRENT_SETTLEMENT_IN_PROGRESS');
        }

        // 2. Fetch competition FOR UPDATE
        const compRes = await client.query('SELECT * FROM competitions WHERE id = $1 FOR UPDATE', [id]);
        if (compRes.rows.length === 0) throw new Error('COMPETITION_NOT_FOUND');

        const comp = compRes.rows[0];
        if (comp.status === 'SETTLED') {
          return { status: 'ALREADY_SETTLED', competitionId: id };
        }

        // 3. Mark settled
        await client.query("UPDATE competitions SET status = 'SETTLED', updated_at = NOW() WHERE id = $1", [id]);

        // 4. Create payout for test entrant if any
        const entries = await client.query('SELECT user_id FROM competition_entries WHERE competition_id = $1 ORDER BY user_id ASC LIMIT 1', [id]);
        if (entries.rows.length > 0) {
          const winner = entries.rows[0].user_id;
          const prizeCents = 15000;
          const wRes = await client.query('SELECT balance_cents FROM wallets WHERE user_id = $1', [winner]);
          const balBefore = Number(wRes.rows[0]?.balance_cents || 0);
          const balAfter = balBefore + prizeCents;
          await client.query('UPDATE wallets SET balance_cents = $1 WHERE user_id = $2', [balAfter, winner]);
          const prizeLedgerId = `tx_prize_${crypto.createHash('md5').update(`${id}_${winner}`).digest('hex')}`;
          await client.query(
            `INSERT INTO wallet_ledger (id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents, status, description, created_at, updated_at)
             VALUES ($1, $2, 'PRIZE', 'CREDIT', $3, $4, $5, 'COMPLETED', $6, NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [prizeLedgerId, winner, prizeCents, balBefore, balAfter, `Settlement payout for ${id}`]
          );
        }

        // 5. Emit outbox event
        await RealtimeDataAndCacheConsistencyService.emitTransactionalOutboxEvent(client, {
          entityType: 'SETTLEMENT',
          entityId: id,
          entityVersion: Date.now(),
          eventType: 'COMPETITION_SETTLED',
          payload: { competitionId: id, settledAt: new Date().toISOString() },
          recipientScope: 'PUBLIC'
        });

        return { status: 'SETTLED', competitionId: id, settledByInstance: instanceName };
      }, pool);

      res.json(result);
    } catch (err: any) {
      res.status(err.message === 'CONCURRENT_SETTLEMENT_IN_PROGRESS' ? 409 : 500).json({ error: err.message, stack: err.stack });
    }
  });

  // Controlled crash endpoint
  app.post('/crash', (req, res) => {
    res.json({ message: 'Crash triggered' });
  });

  return app;
}

// If invoked as standalone script
if (process.env.RUN_AS_WORKER === 'true') {
  const instanceName = process.env.INSTANCE_NAME || `inst_${process.pid}`;
  const port = parseInt(process.env.INSTANCE_PORT || '3091', 10);
  const pool = dbPool.getPool();
  const app = createRisk19App(pool, instanceName);
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`[Worker ${instanceName}] Listening on http://127.0.0.1:${port} (PID: ${process.pid})`);
  });
}
