import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { dbPool } from '../src/server/db/pool.js';

export interface ParityAuditResult {
  passed: boolean;
  walletBalanceParity: {
    jsonMinorUnits: bigint;
    postgresMinorUnits: bigint;
    discrepancyMinorUnits: bigint;
    match: boolean;
  };
  ledgerNetParity: {
    jsonNetMinorUnits: bigint;
    postgresNetMinorUnits: bigint;
    discrepancyMinorUnits: bigint;
    match: boolean;
  };
  recordCounts: {
    entity: string;
    jsonCount: number;
    postgresCount: number;
    match: boolean;
  }[];
  unmatchedUsers: string[];
}

export async function verifyJsonDbPostgresParity(
  customPool?: pg.Pool,
  jsonFilePath?: string
): Promise<ParityAuditResult> {
  const pool = customPool || dbPool.getPool();
  const sourceFile = jsonFilePath || path.join(process.cwd(), 'data', 'database.json');

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`JSON file not found for parity check: ${sourceFile}`);
  }

  const raw = fs.readFileSync(sourceFile, 'utf-8');
  const jsonData = JSON.parse(raw);

  const client = await pool.connect();
  try {
    // 1. Compare Wallet Balances
    let jsonWalletSumMinor = BigInt(0);
    const jsonUserWallets = new Map<string, bigint>();

    for (const u of jsonData.users || []) {
      const bMinor = BigInt(Math.round(Number(u.balanceETB || 0) * 100));
      jsonWalletSumMinor += bMinor;
      jsonUserWallets.set(u.id, bMinor);
    }

    const pgWalletsRes = await client.query('SELECT user_id, balance_cents FROM wallets');
    let pgWalletSumMinor = BigInt(0);
    const unmatchedUsers: string[] = [];

    for (const row of pgWalletsRes.rows) {
      const pgVal = BigInt(row.balance_cents || 0);
      pgWalletSumMinor += pgVal;
      const expectedJsonVal = jsonUserWallets.get(row.user_id);
      if (expectedJsonVal !== undefined && expectedJsonVal !== pgVal) {
        unmatchedUsers.push(
          `User ${row.user_id}: JSON=${expectedJsonVal} cents, PG=${pgVal} cents (diff: ${pgVal - expectedJsonVal})`
        );
      }
    }

    const walletDiscrepancy = pgWalletSumMinor - jsonWalletSumMinor;

    // 2. Compare Ledger Sums for valid migrated users
    let jsonLedgerNetMinor = BigInt(0);
    for (const tx of jsonData.transactions || []) {
      if (tx.userId && jsonUserWallets.has(tx.userId) && tx.status === 'COMPLETED') {
        const amtMinor = BigInt(Math.round(Number(tx.amountETB || 0) * 100));
        if (tx.direction === 'CREDIT') jsonLedgerNetMinor += amtMinor;
        else jsonLedgerNetMinor -= amtMinor;
      }
    }

    const ledgerCreditRes = await client.query(
      "SELECT SUM(amount_cents) as credits FROM wallet_ledger WHERE direction = 'CREDIT' AND status = 'COMPLETED'"
    );
    const ledgerDebitRes = await client.query(
      "SELECT SUM(amount_cents) as debits FROM wallet_ledger WHERE direction = 'DEBIT' AND status = 'COMPLETED'"
    );
    const pgCredits = BigInt(ledgerCreditRes.rows[0]?.credits || '0');
    const pgDebits = BigInt(ledgerDebitRes.rows[0]?.debits || '0');
    const pgLedgerNetMinor = pgCredits - pgDebits;
    const ledgerDiscrepancy = pgLedgerNetMinor - jsonLedgerNetMinor;

    // 3. Compare Entity Counts
    const userCountRes = await client.query('SELECT COUNT(*) as count FROM users');
    const compCountRes = await client.query('SELECT COUNT(*) as count FROM competitions');
    const fixtureCountRes = await client.query('SELECT COUNT(*) as count FROM fixtures');
    const settlementCountRes = await client.query('SELECT COUNT(*) as count FROM settlements');
    const ledgerCountRes = await client.query('SELECT COUNT(*) as count FROM wallet_ledger');

    const pgUserCount = parseInt(userCountRes.rows[0]?.count || '0', 10);
    const pgCompCount = parseInt(compCountRes.rows[0]?.count || '0', 10);
    const pgFixtureCount = parseInt(fixtureCountRes.rows[0]?.count || '0', 10);
    const pgSettlementCount = parseInt(settlementCountRes.rows[0]?.count || '0', 10);
    const pgLedgerCount = parseInt(ledgerCountRes.rows[0]?.count || '0', 10);

    const jsonUserCount = jsonData.users?.length || 0;
    const jsonCompCount = jsonData.competitions?.length || 0;
    const jsonFixtureCount = jsonData.fixtures?.length || 0;
    const jsonSettlementCount = (jsonData.settlements || []).filter((s: any) =>
      (jsonData.competitions || []).some((c: any) => c.id === s.competitionId)
    ).length;
    const jsonLedgerCount = (jsonData.transactions || []).filter(
      (t: any) => t.userId && jsonUserWallets.has(t.userId)
    ).length;

    const recordCounts = [
      {
        entity: 'Users',
        jsonCount: jsonUserCount,
        postgresCount: pgUserCount,
        match: jsonUserCount === pgUserCount
      },
      {
        entity: 'Competitions',
        jsonCount: jsonCompCount,
        postgresCount: pgCompCount,
        match: jsonCompCount === pgCompCount
      },
      {
        entity: 'Fixtures',
        jsonCount: jsonFixtureCount,
        postgresCount: pgFixtureCount,
        match: jsonFixtureCount === pgFixtureCount
      },
      {
        entity: 'Settlements',
        jsonCount: jsonSettlementCount,
        postgresCount: pgSettlementCount,
        match: jsonSettlementCount === pgSettlementCount
      },
      {
        entity: 'Wallet Ledger',
        jsonCount: jsonLedgerCount,
        postgresCount: pgLedgerCount,
        match: jsonLedgerCount === pgLedgerCount
      }
    ];

    const passed =
      walletDiscrepancy === BigInt(0) &&
      ledgerDiscrepancy === BigInt(0) &&
      unmatchedUsers.length === 0 &&
      recordCounts.every((r) => r.match);

    return {
      passed,
      walletBalanceParity: {
        jsonMinorUnits: jsonWalletSumMinor,
        postgresMinorUnits: pgWalletSumMinor,
        discrepancyMinorUnits: walletDiscrepancy,
        match: walletDiscrepancy === BigInt(0)
      },
      ledgerNetParity: {
        jsonNetMinorUnits: jsonLedgerNetMinor,
        postgresNetMinorUnits: pgLedgerNetMinor,
        discrepancyMinorUnits: ledgerDiscrepancy,
        match: ledgerDiscrepancy === BigInt(0)
      },
      recordCounts,
      unmatchedUsers
    };
  } finally {
    client.release();
  }
}
