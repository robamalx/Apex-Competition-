import { Worker } from 'worker_threads';
import path from 'path';
import pg from 'pg';
import { dbPool } from '../src/server/db/pool.js';
import { DatabaseMigrator } from '../src/server/db/migrator.js';

export interface MultiInstanceTestResult {
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  durationMs: number;
  details: string;
}

class TestInstance {
  private worker: Worker;
  private pending = new Map<string, (val: any) => void>();

  constructor(public id: string, poolConfig?: any) {
    const workerPath = path.join(process.cwd(), 'scripts', 'multi_instance_worker.ts');
    this.worker = new Worker(
      `
      import { register } from 'ts-node';
      import '${workerPath}';
      `,
      {
        eval: true,
        workerData: { poolConfig },
        execArgv: ['--loader', 'tsx']
      }
    );

    this.worker.on('message', (msg: { taskId: string; result: any }) => {
      const cb = this.pending.get(msg.taskId);
      if (cb) {
        this.pending.delete(msg.taskId);
        cb(msg.result);
      }
    });
  }

  public dispatch(task: { taskId: string; type: string; params: any }): Promise<any> {
    return new Promise((resolve) => {
      this.pending.set(task.taskId, resolve);
      this.worker.postMessage(task);
    });
  }

  public terminate(): Promise<number> {
    return this.worker.terminate();
  }
}

export async function runMultiInstanceTests(customPool?: pg.Pool): Promise<MultiInstanceTestResult[]> {
  const pool = customPool || dbPool.getPool();
  const results: MultiInstanceTestResult[] = [];

  await DatabaseMigrator.runMigrations(pool);

  // Use direct DB clients to simulate 2 independent nodes if worker threads cannot load tsx directly
  const instanceA_client = await pool.connect();
  const instanceB_client = await pool.connect();

  const testUserA = `usr_multi_a_${Date.now()}`;
  const testUserB = `usr_multi_b_${Date.now()}`;
  const testCompId = `comp_multi_${Date.now()}`;

  // Seed baseline state
  const setupClient = await pool.connect();
  try {
    await setupClient.query(
      `INSERT INTO users (id, name, username, email, phone, referral_code)
       VALUES 
        ($1, 'Multi User A', $2, $3, $4, $5),
        ($6, 'Multi User B', $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        testUserA, `user_${testUserA}`, `${testUserA}@apex.et`, `+2519${Math.floor(10000000 + Math.random() * 90000000)}`, `REFA_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        testUserB, `user_${testUserB}`, `${testUserB}@apex.et`, `+2519${Math.floor(10000000 + Math.random() * 90000000)}`, `REFB_${Date.now()}_${Math.floor(Math.random()*1000)}`
      ]
    );

    await setupClient.query(
      `INSERT INTO wallets (user_id, balance_cents, held_cents)
       VALUES 
        ($1, 10000, 0),
        ($2, 10000, 0)
       ON CONFLICT (user_id) DO UPDATE SET balance_cents = 10000, held_cents = 0`,
      [testUserA, testUserB]
    );

    await setupClient.query(
      `INSERT INTO competitions (id, title, season, matchweek, league, entry_fee_cents, max_participants, current_participants, entry_deadline)
       VALUES ($1, 'Multi Test Comp', '2025/2026', 1, 'PL', 5000, 1, 0, NOW() + INTERVAL '1 day')
       ON CONFLICT (id) DO NOTHING`,
      [testCompId]
    );
  } finally {
    setupClient.release();
  }

  // Helper to execute isolated node instance transaction
  const executeOnInstance = async (
    client: pg.PoolClient,
    type: 'DEBIT_WALLET' | 'JOIN_COMPETITION' | 'SETTLE_COMPETITION' | 'REFUND_IDEMPOTENT' | 'HOLD_WITHDRAWAL',
    params: any
  ): Promise<any> => {
    try {
      if (type === 'DEBIT_WALLET') {
        const { userId, amountCents } = params;
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
        const sel = await client.query('SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
        const bal = BigInt(sel.rows[0].balance_cents);
        const held = BigInt(sel.rows[0].held_cents);
        const debit = BigInt(amountCents);
        if (bal - held < debit) {
          await client.query('ROLLBACK');
          return { success: false, error: 'INSUFFICIENT_FUNDS' };
        }
        const newBal = bal - debit;
        await client.query('UPDATE wallets SET balance_cents = $1 WHERE user_id = $2', [newBal.toString(), userId]);
        await client.query('COMMIT');
        return { success: true, newBalance: newBal.toString() };
      }

      if (type === 'JOIN_COMPETITION') {
        const { competitionId, userId, entryFeeCents, idempotencyKey } = params;
        await client.query('BEGIN');
        const compRes = await client.query(
          'SELECT current_participants, max_participants FROM competitions WHERE id = $1 FOR UPDATE',
          [competitionId]
        );
        const curr = compRes.rows[0].current_participants;
        const max = compRes.rows[0].max_participants;
        if (curr >= max) {
          await client.query('ROLLBACK');
          return { success: false, error: 'COMPETITION_FULL' };
        }
        await client.query(
          'UPDATE competitions SET current_participants = current_participants + 1 WHERE id = $1',
          [competitionId]
        );
        await client.query(
          `INSERT INTO competition_entries (id, competition_id, user_id, entry_fee_paid_cents, idempotency_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [`entry_${userId}_${Date.now()}`, competitionId, userId, entryFeeCents, idempotencyKey]
        );
        await client.query('COMMIT');
        return { success: true };
      }

      if (type === 'SETTLE_COMPETITION') {
        const { competitionId, settledBy, prizePoolCents } = params;
        await client.query('BEGIN');
        try {
          await client.query(
            `INSERT INTO settlements (id, competition_id, total_entrants, total_prize_pool_cents, total_distributed_cents, settled_by, snapshot_data)
             VALUES ($1, $2, 1, $3, $3, $4, '{}')`,
            [`settle_${competitionId}_${Date.now()}`, competitionId, prizePoolCents, settledBy]
          );
          await client.query("UPDATE competitions SET status = 'SETTLED' WHERE id = $1", [competitionId]);
          await client.query('COMMIT');
          return { success: true };
        } catch (err: any) {
          await client.query('ROLLBACK');
          return { success: false, error: err.code === '23505' ? 'ALREADY_SETTLED' : err.message };
        }
      }

      if (type === 'REFUND_IDEMPOTENT') {
        const { idempotencyKey, userId, amountCents } = params;
        await client.query('BEGIN');
        try {
          await client.query(
            `INSERT INTO idempotency_keys (key, route, user_id, request_hash, status, response_code, response_body)
             VALUES ($1, '/api/admin/refund', $2, 'hash_req', 'COMPLETED', 200, '{"refunded": true}')`,
            [idempotencyKey, userId]
          );
          await client.query('UPDATE wallets SET balance_cents = balance_cents + $1 WHERE user_id = $2', [amountCents, userId]);
          await client.query('COMMIT');
          return { success: true, executed: true };
        } catch (err: any) {
          await client.query('ROLLBACK');
          if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
            return { success: true, executed: false, cachedResponse: { refunded: true } };
          }
          return { success: false, error: err.message };
        }
      }

      if (type === 'HOLD_WITHDRAWAL') {
        const { userId, amountCents } = params;
        await client.query('BEGIN');
        const sel = await client.query('SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
        const bal = BigInt(sel.rows[0].balance_cents);
        const held = BigInt(sel.rows[0].held_cents);
        const req = BigInt(amountCents);
        if (bal - held < req) {
          await client.query('ROLLBACK');
          return { success: false, error: 'INSUFFICIENT_AVAILABLE_FUNDS' };
        }
        await client.query('UPDATE wallets SET held_cents = held_cents + $1 WHERE user_id = $2', [req.toString(), userId]);
        await client.query('COMMIT');
        return { success: true };
      }
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      return { success: false, error: err.message };
    }
  };

  try {
    // --- MULTI-001: Concurrent Wallet Debit across 2 Instances ---
    const t1 = Date.now();
    const [d1, d2] = await Promise.all([
      executeOnInstance(instanceA_client, 'DEBIT_WALLET', { userId: testUserA, amountCents: 10000 }),
      executeOnInstance(instanceB_client, 'DEBIT_WALLET', { userId: testUserA, amountCents: 10000 })
    ]);
    const m1Pass = (d1.success && !d2.success) || (!d1.success && d2.success);
    results.push({
      testId: 'MULTI-001',
      name: 'Cross-Instance Wallet Debit Mutual Exclusion',
      status: m1Pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t1,
      details: `Instance A: ${JSON.stringify(d1)}, Instance B: ${JSON.stringify(d2)}`
    });

    // --- MULTI-002: Competition Capacity Race across 2 Instances ---
    const t2 = Date.now();
    const [c1, c2] = await Promise.all([
      executeOnInstance(instanceA_client, 'JOIN_COMPETITION', {
        competitionId: testCompId,
        userId: testUserA,
        entryFeeCents: 5000,
        idempotencyKey: `idem_join_a_${Date.now()}`
      }),
      executeOnInstance(instanceB_client, 'JOIN_COMPETITION', {
        competitionId: testCompId,
        userId: testUserB,
        entryFeeCents: 5000,
        idempotencyKey: `idem_join_b_${Date.now()}`
      })
    ]);
    const m2Pass = (c1.success && !c2.success) || (!c1.success && c2.success);
    results.push({
      testId: 'MULTI-002',
      name: 'Cross-Instance Competition Capacity Enforcement',
      status: m2Pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t2,
      details: `Instance A: ${JSON.stringify(c1)}, Instance B: ${JSON.stringify(c2)}`
    });

    // --- MULTI-003: Settlement Race across 2 Instances ---
    const t3 = Date.now();
    const [s1, s2] = await Promise.all([
      executeOnInstance(instanceA_client, 'SETTLE_COMPETITION', {
        competitionId: testCompId,
        settledBy: testUserA,
        prizePoolCents: 5000
      }),
      executeOnInstance(instanceB_client, 'SETTLE_COMPETITION', {
        competitionId: testCompId,
        settledBy: testUserB,
        prizePoolCents: 5000
      })
    ]);
    const m3Pass = (s1.success && !s2.success) || (!s1.success && s2.success);
    results.push({
      testId: 'MULTI-003',
      name: 'Cross-Instance Competition Settlement Single Execution',
      status: m3Pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t3,
      details: `Instance A: ${JSON.stringify(s1)}, Instance B: ${JSON.stringify(s2)}`
    });

    // --- MULTI-004: Refund Idempotency across 2 Instances ---
    const t4 = Date.now();
    const refundKey = `idem_refund_cross_${Date.now()}`;
    const [r1, r2] = await Promise.all([
      executeOnInstance(instanceA_client, 'REFUND_IDEMPOTENT', {
        idempotencyKey: refundKey,
        userId: testUserB,
        amountCents: 5000
      }),
      executeOnInstance(instanceB_client, 'REFUND_IDEMPOTENT', {
        idempotencyKey: refundKey,
        userId: testUserB,
        amountCents: 5000
      })
    ]);
    const m4Pass = (r1.executed && !r2.executed) || (!r1.executed && r2.executed);
    results.push({
      testId: 'MULTI-004',
      name: 'Cross-Instance Distributed Refund Idempotency',
      status: m4Pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t4,
      details: `Instance A: ${JSON.stringify(r1)}, Instance B: ${JSON.stringify(r2)}`
    });

    // --- MULTI-005: Withdrawal Reservation across 2 Instances ---
    const t5 = Date.now();
    const [w1, w2] = await Promise.all([
      executeOnInstance(instanceA_client, 'HOLD_WITHDRAWAL', { userId: testUserB, amountCents: 15000 }),
      executeOnInstance(instanceB_client, 'HOLD_WITHDRAWAL', { userId: testUserB, amountCents: 15000 })
    ]);
    const m5Pass = (w1.success && !w2.success) || (!w1.success && w2.success);
    results.push({
      testId: 'MULTI-005',
      name: 'Cross-Instance Withdrawal Balance Reservation Race',
      status: m5Pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t5,
      details: `Instance A: ${JSON.stringify(w1)}, Instance B: ${JSON.stringify(w2)}`
    });
  } finally {
    instanceA_client.release();
    instanceB_client.release();
  }

  return results;
}

if (process.env.RUN_MULTI_DIRECT === 'true') {
  runMultiInstanceTests()
    .then((res) => {
      console.log('Cross-Instance Coordination Test Results:');
      for (const r of res) {
        console.log(`[${r.status}] ${r.testId} - ${r.name}: ${r.details} (${r.durationMs}ms)`);
      }
    })
    .catch((e) => {
      console.error('Multi-instance test failed:', e);
      process.exit(1);
    });
}
