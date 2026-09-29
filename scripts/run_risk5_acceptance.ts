import { ReferralService } from '../src/server/referralService.js';
import { db } from '../src/server/db.js';

async function main() {
  console.log('================================================================');
  console.log('APEX ARENA — RISK 5: REFERRAL POINTS & ELIGIBILITY TEST RUNNER');
  console.log('================================================================\n');

  console.log('Executing 41-case Acceptance Test Suite...');
  const report = await ReferralService.runAcceptanceTestSuite();

  console.log('\n--- DETAILED TEST EXECUTION SUMMARY ---');
  let passCount = 0;
  let failCount = 0;
  for (const t of report.tests) {
    if (t.passed) {
      passCount++;
      console.log(`[PASS] Case #${t.caseNumber.toString().padStart(2, '0')}: [${t.category}] ${t.name} (${t.durationMs}ms)`);
    } else {
      failCount++;
      console.log(`[FAIL] Case #${t.caseNumber.toString().padStart(2, '0')}: [${t.category}] ${t.name}`);
      console.log(`       Expected: ${t.expected}`);
      console.log(`       Actual:   ${t.actual}`);
      console.log(`       Details:  ${t.details}`);
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${report.totalTests}`);
  console.log(`PASSED:      ${report.passedCount}`);
  console.log(`FAILED:      ${report.failedCount}`);
  console.log(`SKIPPED:     0`);
  console.log(`EXECUTION:   ${report.passedCount} / ${report.totalTests} PASSED`);
  console.log(`VERDICT:     ${report.verdict}`);
  console.log(`FINANCIAL DISCREPANCY: ${report.financialReconciliation.discrepancyETB.toFixed(2)} ETB`);
  console.log('================================================================\n');

  if (report.failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error executing Risk 5 acceptance suite:', err);
  process.exit(1);
});
