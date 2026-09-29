import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { dbPool } from '../src/server/db/pool.js';
import { DatabaseMigrator } from '../src/server/db/migrator.js';

export interface MigrationReport {
  recordsRead: {
    users: number;
    transactions: number;
    competitions: number;
    settlements: number;
    fixtures: number;
    referrals: number;
  };
  recordsInserted: {
    users: number;
    wallets: number;
    walletLedger: number;
    competitions: number;
    settlements: number;
    fixtures: number;
    referrals: number;
  };
  recordsRejected: {
    transactionsOrphaned: number;
    settlementsOrphaned: number;
    fixturesInvalid: number;
  };
  financialTotals: {
    jsonWalletTotalMinorUnits: bigint;
    postgresWalletTotalMinorUnits: bigint;
    walletDiscrepancyMinorUnits: bigint;
    jsonLedgerNetMinorUnits: bigint;
    postgresLedgerNetMinorUnits: bigint;
    ledgerDiscrepancyMinorUnits: bigint;
  };
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  errors: string[];
}

export async function runJsonDbToPostgresMigration(
  customPool?: pg.Pool,
  jsonFilePath?: string
): Promise<MigrationReport> {
  const startTime = Date.now();
  const errors: string[] = [];
  const pool = customPool || dbPool.getPool();

  const sourceFile = jsonFilePath || path.join(process.cwd(), 'data', 'database.json');
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source JSON file does not exist: ${sourceFile}`);
  }

  // 1. Read COPY of JSON data (immutable read)
  const rawData = fs.readFileSync(sourceFile, 'utf-8');
  const jsonData = JSON.parse(rawData);

  // 2. Ensure schema migrations are up to date
  await DatabaseMigrator.runMigrations(pool);

  const report: MigrationReport = {
    recordsRead: {
      users: jsonData.users?.length || 0,
      transactions: jsonData.transactions?.length || 0,
      competitions: jsonData.competitions?.length || 0,
      settlements: jsonData.settlements?.length || 0,
      fixtures: jsonData.fixtures?.length || 0,
      referrals: jsonData.referrals?.length || 0
    },
    recordsInserted: {
      users: 0,
      wallets: 0,
      walletLedger: 0,
      competitions: 0,
      settlements: 0,
      fixtures: 0,
      referrals: 0
    },
    recordsRejected: {
      transactionsOrphaned: 0,
      settlementsOrphaned: 0,
      fixturesInvalid: 0
    },
    financialTotals: {
      jsonWalletTotalMinorUnits: BigInt(0),
      postgresWalletTotalMinorUnits: BigInt(0),
      walletDiscrepancyMinorUnits: BigInt(0),
      jsonLedgerNetMinorUnits: BigInt(0),
      postgresLedgerNetMinorUnits: BigInt(0),
      ledgerDiscrepancyMinorUnits: BigInt(0)
    },
    durationMs: 0,
    status: 'SUCCESS',
    errors: []
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --- A. MIGRATE USERS & WALLETS ---
    let jsonWalletSumMinor = BigInt(0);
    const existingUsers = new Set<string>();

    for (let i = 0; i < (jsonData.users || []).length; i++) {
      const u = jsonData.users[i];
      if (!u.id) continue;
      const balanceETB = Number(u.balanceETB || 0);
      const heldETB = Number(u.pendingBalanceETB || 0);
      const balanceMinor = BigInt(Math.round(balanceETB * 100));
      const heldMinor = BigInt(Math.round(heldETB * 100));
      jsonWalletSumMinor += balanceMinor;

      const userReferralCode = u.referralCode || `REF_${u.id.substring(0, 8).toUpperCase()}_${i}`;

      await client.query(
        `INSERT INTO users (
          id, name, username, email, phone, password_hash, role, avatar,
          account_status, account_lifecycle_state, is_phone_verified, is_verified,
          referral_code, referred_by, risk_score, risk_level, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.name || 'Player',
          u.username || `user_${u.id}`,
          u.email || `${u.id}@apex.et`,
          u.phone || `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
          u.passwordHash || null,
          u.role || 'PLAYER',
          u.avatar || null,
          u.accountStatus || 'ACTIVE',
          u.accountLifecycleState || 'REGISTERED',
          !!u.isPhoneVerified,
          !!u.isVerified,
          userReferralCode,
          u.referredBy || null,
          u.riskScore || 0,
          u.riskLevel || 'LOW',
          u.createdAt ? new Date(u.createdAt) : new Date(),
          new Date()
        ]
      );
      report.recordsInserted.users++;
      existingUsers.add(u.id);

      // Create authoritative wallet row
      await client.query(
        `INSERT INTO wallets (
          user_id, currency, balance_cents, held_cents, referral_points, is_frozen, version, created_at, updated_at
        ) VALUES ($1, 'ETB', $2, $3, $4, FALSE, 1, $5, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          balance_cents = EXCLUDED.balance_cents,
          held_cents = EXCLUDED.held_cents,
          referral_points = EXCLUDED.referral_points`,
        [
          u.id,
          balanceMinor.toString(),
          heldMinor.toString(),
          u.referralPoints || 0,
          u.createdAt ? new Date(u.createdAt) : new Date()
        ]
      );
      report.recordsInserted.wallets++;
    }

    report.financialTotals.jsonWalletTotalMinorUnits = jsonWalletSumMinor;

    // --- B. MIGRATE FIXTURES (with robust date fallback) ---
    for (const f of jsonData.fixtures || []) {
      if (!f.id) continue;
      const canonicalId = f.canonicalId || f.id;

      // Extract ISO kickoff date
      let parsedDate: Date | null = null;
      if (f.kickoffTimeUtc) parsedDate = new Date(f.kickoffTimeUtc);
      else if (f.utcDate) parsedDate = new Date(f.utcDate);
      else if (f.kickoffTime && !isNaN(new Date(f.kickoffTime).getTime())) parsedDate = new Date(f.kickoffTime);
      else if (f.matchDate && !isNaN(new Date(f.matchDate).getTime())) parsedDate = new Date(f.matchDate);
      else if (f.finishedAt && !isNaN(new Date(f.finishedAt).getTime())) parsedDate = new Date(f.finishedAt);
      else parsedDate = new Date('2026-08-20T12:00:00Z');

      await client.query(
        `INSERT INTO fixtures (
          id, canonical_id, external_provider_id, competition_code, season, matchweek,
          home_team, away_team, kickoff_time, status, home_score, away_score,
          result_version, verified_by_provider, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING`,
        [
          f.id,
          canonicalId,
          f.externalProviderId || (f.providerFixtureId ? String(f.providerFixtureId) : null),
          f.competitionCode || f.league || 'PL',
          f.season || '2025/2026',
          f.matchweek || f.weekNumber || 1,
          f.homeTeam || f.home || 'Home',
          f.awayTeam || f.away || 'Away',
          parsedDate,
          f.status || 'SCHEDULED',
          f.homeScore ?? null,
          f.awayScore ?? null,
          f.resultVersion || 1,
          !!f.verifiedByProvider || !!f.isAuthenticProviderFixture,
          f.createdAt ? new Date(f.createdAt) : new Date(),
          new Date()
        ]
      );
      report.recordsInserted.fixtures++;
    }

    // --- C. MIGRATE COMPETITIONS ---
    const existingCompetitions = new Set<string>();
    for (const c of jsonData.competitions || []) {
      if (!c.id) continue;
      const entryFeeMinor = BigInt(Math.round(Number(c.entryFeeETB || 0) * 100));
      const prizePoolMinor = BigInt(Math.round(Number(c.prizePoolETB || c.guaranteedPrizePoolETB || 0) * 100));

      await client.query(
        `INSERT INTO competitions (
          id, title, description, season, matchweek, league, market_type, tier,
          entry_fee_cents, guaranteed_prize_pool_cents, current_prize_pool_cents,
          min_participants, max_participants, current_participants, status, entry_deadline,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.title || 'Competition',
          c.description || null,
          c.season || '2025/2026',
          c.matchweek || 1,
          c.league || 'Premier League',
          c.marketType || 'CORRECT_SCORE',
          c.tier || 'STANDARD',
          entryFeeMinor.toString(),
          prizePoolMinor.toString(),
          prizePoolMinor.toString(),
          c.minParticipants || 1,
          c.maxParticipants || 100000,
          c.currentParticipants || 0,
          c.status || 'DRAFT',
          c.entryDeadline ? new Date(c.entryDeadline) : new Date(Date.now() + 86400000),
          c.createdBy && existingUsers.has(c.createdBy) ? c.createdBy : null,
          c.createdAt ? new Date(c.createdAt) : new Date(),
          new Date()
        ]
      );
      report.recordsInserted.competitions++;
      existingCompetitions.add(c.id);
    }

    // --- D. MIGRATE WALLET LEDGER / TRANSACTIONS ---
    let jsonLedgerNetMinor = BigInt(0);

    for (const tx of jsonData.transactions || []) {
      if (!tx.id) continue;
      if (!tx.userId || !existingUsers.has(tx.userId)) {
        report.recordsRejected.transactionsOrphaned++;
        continue;
      }
      const amountETB = Number(tx.amountETB || 0);
      if (amountETB <= 0) continue;

      const amountMinor = BigInt(Math.round(amountETB * 100));
      const dir = tx.direction === 'DEBIT' ? 'DEBIT' : 'CREDIT';

      if (tx.status === 'COMPLETED') {
        if (dir === 'CREDIT') jsonLedgerNetMinor += amountMinor;
        else jsonLedgerNetMinor -= amountMinor;
      }

      await client.query(
        `INSERT INTO wallet_ledger (
          id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents,
          status, payment_method, payment_reference, idempotency_key, reference_id,
          description, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING`,
        [
          tx.id,
          tx.userId,
          tx.type || 'DEPOSIT',
          dir,
          amountMinor.toString(),
          tx.status || 'COMPLETED',
          tx.method || tx.paymentMethod || 'SYSTEM',
          tx.reference || tx.paymentReference || null,
          tx.idempotencyKey || null,
          tx.referenceId || null,
          tx.description || `${tx.type} transaction`,
          tx.notes || null,
          tx.createdAt ? new Date(tx.createdAt) : new Date(),
          new Date()
        ]
      );
      report.recordsInserted.walletLedger++;
    }

    report.financialTotals.jsonLedgerNetMinorUnits = jsonLedgerNetMinor;

    // --- E. MIGRATE SETTLEMENTS (ensuring FK competition exists or reporting rejected) ---
    for (const s of jsonData.settlements || []) {
      if (!s.id || !s.competitionId) continue;
      if (!existingCompetitions.has(s.competitionId)) {
        report.recordsRejected.settlementsOrphaned++;
        continue;
      }
      const totalPoolMinor = BigInt(Math.round(Number(s.totalPrizePoolETB || s.totalPrizePool || 0) * 100));
      const distributedMinor = BigInt(Math.round(Number(s.playerPrizePoolETB || 0) * 100));
      const remainderMinor = BigInt(Math.round(Number(s.remainderETB || 0) * 100));

      const settledBy = s.settledBy && existingUsers.has(s.settledBy) ? s.settledBy : 'usr_superadmin';
      if (!existingUsers.has(settledBy)) {
        report.recordsRejected.settlementsOrphaned++;
        continue;
      }

      await client.query(
        `INSERT INTO settlements (
          id, competition_id, total_entrants, total_prize_pool_cents, total_distributed_cents,
          remainder_cents, settled_by, snapshot_data, status, settled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.competitionId,
          s.totalEntrants || 0,
          totalPoolMinor.toString(),
          distributedMinor.toString(),
          remainderMinor.toString(),
          settledBy,
          JSON.stringify(s.rulesSnapshotRef || {}),
          s.status || 'COMPLETED',
          s.settlementTimestamp ? new Date(s.settlementTimestamp) : new Date()
        ]
      );
      report.recordsInserted.settlements++;
    }

    // --- F. POSTGRES FINANCIAL RECONCILIATION ---
    const walletRes = await client.query('SELECT SUM(balance_cents) as total_wallet FROM wallets');
    report.financialTotals.postgresWalletTotalMinorUnits = BigInt(walletRes.rows[0]?.total_wallet || '0');
    report.financialTotals.walletDiscrepancyMinorUnits =
      report.financialTotals.postgresWalletTotalMinorUnits - report.financialTotals.jsonWalletTotalMinorUnits;

    const ledgerCreditRes = await client.query(
      "SELECT SUM(amount_cents) as total_credits FROM wallet_ledger WHERE direction = 'CREDIT' AND status = 'COMPLETED'"
    );
    const ledgerDebitRes = await client.query(
      "SELECT SUM(amount_cents) as total_debits FROM wallet_ledger WHERE direction = 'DEBIT' AND status = 'COMPLETED'"
    );
    const pgCredits = BigInt(ledgerCreditRes.rows[0]?.total_credits || '0');
    const pgDebits = BigInt(ledgerDebitRes.rows[0]?.total_debits || '0');
    report.financialTotals.postgresLedgerNetMinorUnits = pgCredits - pgDebits;
    report.financialTotals.ledgerDiscrepancyMinorUnits =
      report.financialTotals.postgresLedgerNetMinorUnits - report.financialTotals.jsonLedgerNetMinorUnits;

    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    errors.push(err?.message || String(err));
    report.status = 'FAILED';
  } finally {
    client.release();
  }

  report.durationMs = Date.now() - startTime;
  report.errors = errors;
  return report;
}
