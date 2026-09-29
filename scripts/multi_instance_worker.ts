import { parentPort, workerData } from 'worker_threads';
import pg from 'pg';

interface WorkerTask {
  taskId: string;
  type: 'DEBIT_WALLET' | 'JOIN_COMPETITION' | 'SETTLE_COMPETITION' | 'REFUND_IDEMPOTENT' | 'HOLD_WITHDRAWAL';
  params: any;
}

const poolConfig = workerData?.poolConfig;
const pool = new pg.Pool(poolConfig || {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/apex_arena_test'
});

async function executeTask(task: WorkerTask): Promise<any> {
  const client = await pool.connect();
  try {
    if (task.type === 'DEBIT_WALLET') {
      const { userId, amountCents } = task.params;
      await client.query('BEGIN');
      const sel = await client.query('SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      if (sel.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'USER_NOT_FOUND' };
      }
      const bal = BigInt(sel.rows[0].balance_cents);
      const held = BigInt(sel.rows[0].held_cents);
      const debit = BigInt(amountCents);
      if (bal - held < debit) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INSUFFICIENT_FUNDS', currentBalance: bal.toString() };
      }
      const newBal = bal - debit;
      await client.query('UPDATE wallets SET balance_cents = $1 WHERE user_id = $2', [newBal.toString(), userId]);
      await client.query('COMMIT');
      return { success: true, newBalance: newBal.toString() };
    }

    if (task.type === 'JOIN_COMPETITION') {
      const { competitionId, userId, entryFeeCents, idempotencyKey } = task.params;
      await client.query('BEGIN');
      const compRes = await client.query(
        'SELECT current_participants, max_participants FROM competitions WHERE id = $1 FOR UPDATE',
        [competitionId]
      );
      if (compRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'COMPETITION_NOT_FOUND' };
      }
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

    if (task.type === 'SETTLE_COMPETITION') {
      const { competitionId, settledBy, prizePoolCents } = task.params;
      await client.query('BEGIN');
      // PostgreSQL unique constraint on competition_id in settlements table
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

    if (task.type === 'REFUND_IDEMPOTENT') {
      const { idempotencyKey, userId, amountCents } = task.params;
      await client.query('BEGIN');
      try {
        // Try inserting idempotency record
        await client.query(
          `INSERT INTO idempotency_keys (key, route, user_id, request_hash, status, response_code, response_body)
           VALUES ($1, '/api/admin/refund', $2, 'hash_req', 'COMPLETED', 200, '{"refunded": true}')`,
          [idempotencyKey, userId]
        );
        // Credit wallet
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

    if (task.type === 'HOLD_WITHDRAWAL') {
      const { userId, amountCents } = task.params;
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

    return { success: false, error: 'UNKNOWN_TASK' };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const res = await executeTask(task);
    parentPort?.postMessage({ taskId: task.taskId, result: res });
  });
}
