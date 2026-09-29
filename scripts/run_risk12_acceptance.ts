/**
 * APEX ARENA — RISK 12: COMPETITION LIFECYCLE & SETTLEMENT INTEGRITY
 * 70-TEST ACCEPTANCE & ADVERSARIAL VERIFICATION RUNNER
 */

import { createPhase26Database } from './run_phase2_6_production_readiness_gate.js';
import { DatabaseMigrator } from '../src/server/db/migrator.js';
import { dbPool } from '../src/server/db/pool.js';
import {
  runAuthoritativeFinancialAudit,
  toETB
} from '../src/server/db/postgresService.js';
import {
  StageTaskRisk12LifecycleSettlementService,
  Risk12TestCaseResult
} from '../src/server/stageTaskRisk12LifecycleSettlementService.js';

async function main() {
  console.log('================================================================================');
  console.log('       APEX ARENA — RISK 12: COMPETITION LIFECYCLE & SETTLEMENT INTEGRITY       ');
  console.log('                  70-TEST ADVERSARIAL ACCEPTANCE GATE                           ');
  console.log('================================================================================\n');

  // 1. Initialize Dual-Process Database Environment & Apply All Migrations (001-005)
  console.log('>>> [1/4] INITIALIZING POSTGRESQL & RUNNING MIGRATIONS (001 - 005)...');
  const { pool, poolA, poolB } = createPhase26Database();
  dbPool.setPool(pool);
  await DatabaseMigrator.runMigrations(pool);
  console.log('✓ All 5 migrations applied successfully (including 005_competition_lifecycle_and_settlement).\n');

  // 2. Pre-Test Authoritative Financial Audit
  console.log('>>> [2/4] EXECUTING FINANCIAL RECONCILIATION AUDIT (BEFORE TEST SUITE)...');
  const auditBefore = await runAuthoritativeFinancialAudit(pool);
  console.log(`    Total Wallet Balance:           ${auditBefore.totalWalletsBalanceMinorUnits} cents (${toETB(auditBefore.totalWalletsBalanceMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Held Balance:             ${auditBefore.totalWalletsHeldMinorUnits} cents (${toETB(auditBefore.totalWalletsHeldMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Credits:        ${auditBefore.totalLedgerCompletedCreditsMinorUnits} cents (${toETB(auditBefore.totalLedgerCompletedCreditsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Debits:         ${auditBefore.totalLedgerCompletedDebitsMinorUnits} cents (${toETB(auditBefore.totalLedgerCompletedDebitsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Calculated Net Ledger:          ${auditBefore.calculatedNetLedgerMinorUnits} cents (${toETB(auditBefore.calculatedNetLedgerMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Discrepancy:                    ${auditBefore.discrepancyMinorUnits} minor units\n`);

  if (auditBefore.discrepancyMinorUnits !== BigInt(0)) {
    console.error(`FATAL: Pre-test financial discrepancy detected: ${auditBefore.discrepancyMinorUnits} minor units`);
    process.exit(1);
  }

  // 3. Run the Full 70-Test Risk 12 Adversarial Suite
  console.log('>>> [3/4] RUNNING 70-TEST RISK 12 ADVERSARIAL SUITE...');
  const suiteResult = await StageTaskRisk12LifecycleSettlementService.runAllTests(pool, poolB);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('                      TEST RESULTS DETAILED BREAKDOWN                           ');
  console.log('--------------------------------------------------------------------------------');

  suiteResult.results.forEach((t: Risk12TestCaseResult) => {
    const icon = t.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${String(t.caseNumber).padStart(2, '0')}] [${t.category}] ${t.name} (${t.durationMs}ms) — [${t.evidenceTier}]`);
    if (!t.passed) {
      console.error(`   Expected: ${t.expected}`);
      console.error(`   Actual:   ${t.actual}`);
    }
  });

  console.log('--------------------------------------------------------------------------------\n');

  // 4. Post-Test Authoritative Financial Audit
  console.log('>>> [4/4] EXECUTING FINANCIAL RECONCILIATION AUDIT (AFTER TEST SUITE)...');
  const auditAfter = await runAuthoritativeFinancialAudit(pool);
  console.log(`    Total Wallet Balance:           ${auditAfter.totalWalletsBalanceMinorUnits} cents (${toETB(auditAfter.totalWalletsBalanceMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Held Balance:             ${auditAfter.totalWalletsHeldMinorUnits} cents (${toETB(auditAfter.totalWalletsHeldMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Credits:        ${auditAfter.totalLedgerCompletedCreditsMinorUnits} cents (${toETB(auditAfter.totalLedgerCompletedCreditsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Debits:         ${auditAfter.totalLedgerCompletedDebitsMinorUnits} cents (${toETB(auditAfter.totalLedgerCompletedDebitsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Calculated Net Ledger:          ${auditAfter.calculatedNetLedgerMinorUnits} cents (${toETB(auditAfter.calculatedNetLedgerMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Discrepancy:                    ${auditAfter.discrepancyMinorUnits} minor units\n`);

  if (auditAfter.discrepancyMinorUnits !== BigInt(0)) {
    console.error(`FATAL: Post-test financial discrepancy detected: ${auditAfter.discrepancyMinorUnits} minor units`);
    process.exit(1);
  }

  // 5. Category Breakdown Summary
  const categories = Array.from(new Set(suiteResult.results.map(r => r.category)));
  console.log('================================================================================');
  console.log('                     RISK 12 CATEGORY SUMMARY BREAKDOWN                         ');
  console.log('================================================================================');
  categories.forEach(cat => {
    const catTests = suiteResult.results.filter(r => r.category === cat);
    const passed = catTests.filter(r => r.passed).length;
    console.log(`  ${cat.padEnd(28)} : ${passed}/${catTests.length} Passed`);
  });

  // Evidence Tier Breakdown
  const tiers = Array.from(new Set(suiteResult.results.map(r => r.evidenceTier)));
  console.log('\n  EVIDENCE TIERS:');
  tiers.forEach(tier => {
    const tierTests = suiteResult.results.filter(r => r.evidenceTier === tier);
    const passed = tierTests.filter(r => r.passed).length;
    console.log(`  - ${tier.padEnd(24)} : ${passed}/${tierTests.length} Passed`);
  });

  console.log('\n================================================================================');
  console.log(`  TOTAL TESTS:      ${suiteResult.totalTests}`);
  console.log(`  PASSED:           ${suiteResult.passedTests}`);
  console.log(`  FAILED:           ${suiteResult.failedTests}`);
  console.log(`  DURATION:         ${suiteResult.durationMs}ms`);
  console.log(`  DISCREPANCY:      ${auditAfter.discrepancyMinorUnits} minor units (0.00 ETB)`);
  console.log('================================================================================\n');

  if (suiteResult.failedTests > 0) {
    console.error(`FAILED: ${suiteResult.failedTests} tests failed in Risk 12 suite.`);
    process.exit(1);
  }

  console.log('🎉 RISK 12 VERIFICATION COMPLETED WITH 100% PASS RATE AND ZERO DISCREPANCY!\n');
}

main().catch(err => {
  console.error('FATAL UNCAUGHT ERROR IN RISK 12 ACCEPTANCE SUITE:', err);
  process.exit(1);
});
