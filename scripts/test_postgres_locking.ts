import pg from 'pg';
import { dbPool } from '../src/server/db/pool.js';
import { DatabaseMigrator } from '../src/server/db/migrator.js';

export interface LockTestResult {
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  durationMs: number;
  details: string;
}

export async function runPostgresLockTests(customPool?: pg.Pool): Promise<LockTestResult[]> {
  const pool = customPool || dbPool.getPool();
  const results: LockTestResult[] = [];

  // Ensure migrations are run
  await DatabaseMigrator.runMigrations(pool);

  // Setup test user & wallet
  const setupClient = await pool.connect();
  const testUserId = `usr_lock_test_${Date.now()}`;
  const testCompId = `comp_lock_test_${Date.now()}`;

  try {
    await setupClient.query(
      `INSERT INTO users (id, name, username, email, phone, referral_code) 
       VALUES ($1, 'Lock Test User', $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, `user_${testUserId}`, `${testUserId}@apex.et`, `+2519${Math.floor(10000000 + Math.random() * 90000000)}`, `REF_${testUserId}`]
    );

    await setupClient.query(
      `INSERT INTO wallets (user_id, balance_cents, held_cents) 
       VALUES ($1, 10000, 0)
       ON CONFLICT (user_id) DO UPDATE SET balance_cents = 10000, held_cents = 0`,
      [testUserId]
    );

    await setupClient.query(
      `INSERT INTO competitions (id, title, season, matchweek, league, entry_fee_cents, entry_deadline)
       VALUES ($1, 'Lock Test Comp', '2025/2026', 1, 'PL', 10000, NOW() + INTERVAL '1 day')
       ON CONFLICT (id) DO NOTHING`,
      [testCompId]
    );
  } finally {
    setupClient.release();
  }

  // --- LOCK-001: Row Lock (SELECT ... FOR UPDATE) Serialization ---
  const t1Start = Date.now();
  try {
    const clientA = await pool.connect();
    const clientB = await pool.connect();

    let clientBStartedAt = 0;
    let clientBFinishedAt = 0;

    await clientA.query('BEGIN');
    await clientA.query('SELECT balance_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [testUserId]);

    const bPromise = (async () => {
      clientBStartedAt = Date.now();
      await clientB.query('BEGIN');
      await clientB.query('SELECT balance_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [testUserId]);
      clientBFinishedAt = Date.now();
      await clientB.query('COMMIT');
      clientB.release();
    })();

    // Hold client A lock for 100ms
    await new Promise((r) => setTimeout(r, 100));
    await clientA.query('COMMIT');
    clientA.release();

    await bPromise;

    const waitedMs = clientBFinishedAt - clientBStartedAt;
    const isSerialized = waitedMs >= 80;

    results.push({
      testId: 'LOCK-001',
      name: 'Wallet Row Lock Serialization (SELECT FOR UPDATE)',
      status: isSerialized ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t1Start,
      details: `Client B waited ${waitedMs}ms for Client A commit before acquiring lock.`
    });
  } catch (err: any) {
    results.push({
      testId: 'LOCK-001',
      name: 'Wallet Row Lock Serialization (SELECT FOR UPDATE)',
      status: 'FAIL',
      durationMs: Date.now() - t1Start,
      details: err?.message || String(err)
    });
  }

  // --- LOCK-002: Competition Row Lock Serialization ---
  const t2Start = Date.now();
  try {
    const clientA = await pool.connect();
    const clientB = await pool.connect();

    let clientBFinishedAt = 0;
    const clientBStartedAt = Date.now();

    await clientA.query('BEGIN');
    await clientA.query('SELECT current_participants FROM competitions WHERE id = $1 FOR UPDATE', [testCompId]);

    const bPromise = (async () => {
      await clientB.query('BEGIN');
      await clientB.query('SELECT current_participants FROM competitions WHERE id = $1 FOR UPDATE', [testCompId]);
      clientBFinishedAt = Date.now();
      await clientB.query('COMMIT');
      clientB.release();
    })();

    await new Promise((r) => setTimeout(r, 80));
    await clientA.query('COMMIT');
    clientA.release();

    await bPromise;
    const waitedMs = clientBFinishedAt - clientBStartedAt;

    results.push({
      testId: 'LOCK-002',
      name: 'Competition Row Lock Serialization',
      status: waitedMs >= 60 ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t2Start,
      details: `Client B serialized on competition row, waited ${waitedMs}ms.`
    });
  } catch (err: any) {
    results.push({
      testId: 'LOCK-002',
      name: 'Competition Row Lock Serialization',
      status: 'FAIL',
      durationMs: Date.now() - t2Start,
      details: err?.message || String(err)
    });
  }

  // --- LOCK-003: Advisory Lock Mutual Exclusion ---
  const t3Start = Date.now();
  try {
    const clientA = await pool.connect();
    const clientB = await pool.connect();
    const lockId = 8847291;

    const resA = await clientA.query('SELECT pg_try_advisory_lock($1) as locked', [lockId]);
    const resB = await clientB.query('SELECT pg_try_advisory_lock($1) as locked', [lockId]);

    const aGot = resA.rows[0]?.locked === true;
    const bGot = resB.rows[0]?.locked === true;

    await clientA.query('SELECT pg_advisory_unlock($1)', [lockId]);
    clientA.release();
    clientB.release();

    results.push({
      testId: 'LOCK-003',
      name: 'PostgreSQL Advisory Lock Mutual Exclusion',
      status: aGot && !bGot ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t3Start,
      details: `Client A locked: ${aGot}, Client B concurrent lock rejected: ${!bGot}`
    });
  } catch (err: any) {
    results.push({
      testId: 'LOCK-003',
      name: 'PostgreSQL Advisory Lock Mutual Exclusion',
      status: 'FAIL',
      durationMs: Date.now() - t3Start,
      details: err?.message || String(err)
    });
  }

  // --- LOCK-004: Transactional Advisory Lock Auto-Release on Disconnect/Commit ---
  const t4Start = Date.now();
  try {
    const clientA = await pool.connect();
    const clientB = await pool.connect();
    const lockId = 9928172;

    await clientA.query('BEGIN');
    await clientA.query('SELECT pg_advisory_xact_lock($1)', [lockId]);

    let bAcquired = false;
    const bPromise = (async () => {
      await clientB.query('BEGIN');
      await clientB.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
      bAcquired = true;
      await clientB.query('COMMIT');
      clientB.release();
    })();

    await new Promise((r) => setTimeout(r, 60));
    await clientA.query('ROLLBACK'); // Transaction rollback automatically frees xact advisory lock
    clientA.release();

    await bPromise;

    results.push({
      testId: 'LOCK-004',
      name: 'Transactional Advisory Lock Auto-Release on Transaction End',
      status: bAcquired ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t4Start,
      details: 'Client A released lock on rollback; Client B acquired successfully.'
    });
  } catch (err: any) {
    results.push({
      testId: 'LOCK-004',
      name: 'Transactional Advisory Lock Auto-Release on Transaction End',
      status: 'FAIL',
      durationMs: Date.now() - t4Start,
      details: err?.message || String(err)
    });
  }

  // --- LOCK-005: Concurrent Wallet Debit (100 ETB Balance, Two 100 ETB Debits) ---
  const t5Start = Date.now();
  try {
    // Reset balance to exactly 10,000 cents (100 ETB)
    const resetClient = await pool.connect();
    await resetClient.query('UPDATE wallets SET balance_cents = 10000, held_cents = 0 WHERE user_id = $1', [testUserId]);
    resetClient.release();

    const debitUser = async (clientId: string): Promise<{ success: boolean; error?: string }> => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [testUserId]);
        const selectRes = await client.query(
          'SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1 FOR UPDATE',
          [testUserId]
        );
        const bal = BigInt(selectRes.rows[0].balance_cents);
        const held = BigInt(selectRes.rows[0].held_cents);
        const available = bal - held;

        const debitAmount = BigInt(10000); // 100 ETB

        if (available < debitAmount) {
          await client.query('ROLLBACK');
          return { success: false, error: 'INSUFFICIENT_FUNDS' };
        }

        const newBal = bal - debitAmount;
        await client.query(
          'UPDATE wallets SET balance_cents = $1, version = version + 1, updated_at = NOW() WHERE user_id = $2',
          [newBal.toString(), testUserId]
        );

        await client.query(
          `INSERT INTO wallet_ledger (
            id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents,
            status, description, created_at, updated_at
          ) VALUES ($1, $2, 'WITHDRAWAL', 'DEBIT', $3, $4, $5, 'COMPLETED', $6, NOW(), NOW())`,
          [
            `tx_debit_${clientId}_${Date.now()}`,
            testUserId,
            debitAmount.toString(),
            bal.toString(),
            newBal.toString(),
            `Concurrent debit test ${clientId}`
          ]
        );

        await client.query('COMMIT');
        return { success: true };
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        return { success: false, error: err?.message };
      } finally {
        client.release();
      }
    };

    const [res1, res2] = await Promise.all([debitUser('CLIENT_1'), debitUser('CLIENT_2')]);

    const checkClient = await pool.connect();
    const finalRes = await checkClient.query('SELECT balance_cents FROM wallets WHERE user_id = $1', [testUserId]);
    checkClient.release();

    const finalBal = BigInt(finalRes.rows[0].balance_cents);

    const exactlyOneSucceeded = (res1.success && !res2.success) || (!res1.success && res2.success);
    const balanceZero = finalBal === BigInt(0);

    results.push({
      testId: 'LOCK-005',
      name: 'Concurrent Wallet Debit Serialization & No Double-Spend',
      status: exactlyOneSucceeded && balanceZero ? 'PASS' : 'FAIL',
      durationMs: Date.now() - t5Start,
      details: `Client 1: ${JSON.stringify(res1)}, Client 2: ${JSON.stringify(res2)}, Final Balance: ${finalBal} cents (0 ETB). No negative balance.`
    });
  } catch (err: any) {
    results.push({
      testId: 'LOCK-005',
      name: 'Concurrent Wallet Debit Serialization & No Double-Spend',
      status: 'FAIL',
      durationMs: Date.now() - t5Start,
      details: err?.message || String(err)
    });
  }

  return results;
}

if (process.env.RUN_LOCK_DIRECT === 'true') {
  runPostgresLockTests()
    .then((res) => {
      console.log('PostgreSQL Lock Test Results:');
      for (const r of res) {
        console.log(`[${r.status}] ${r.testId} - ${r.name}: ${r.details} (${r.durationMs}ms)`);
      }
    })
    .catch((e) => {
      console.error('Lock tests failed:', e);
      process.exit(1);
    });
}
