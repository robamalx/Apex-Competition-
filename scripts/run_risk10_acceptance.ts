import { WithdrawalProtectionService } from '../src/server/withdrawalProtectionService.ts';

async function main() {
  console.log('========================================================================');
  console.log('     APEX ARENA — RISK 10 ACCEPTANCE TEST SUITE RUNNER                  ');
  console.log('     Withdrawal & Cash-Out Financial Protection Engine                  ');
  console.log('========================================================================\n');

  try {
    const report = await WithdrawalProtectionService.runAcceptanceSuite();

    console.log(`\nRisk: ${report.risk}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Execution Duration: ${report.durationMs}ms`);
    console.log(`Total Acceptance Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedCount}`);
    console.log(`Failed: ${report.failedCount}`);
    console.log(`Pass Rate: ${report.passPercentage}%\n`);

    console.log('------------------------------------------------------------------------');
    console.log(' CATEGORY BREAKDOWN:');
    console.log('------------------------------------------------------------------------');
    Object.entries(report.categoryBreakdown).forEach(([cat, stats]) => {
      const statusSymbol = stats.failed === 0 ? '✓' : '✗';
      console.log(` ${statusSymbol} [${cat.padEnd(60)}]: ${stats.passed}/${stats.total} Passed`);
    });

    console.log('\n------------------------------------------------------------------------');
    console.log(' DETAILED ACCEPTANCE TEST RESULTS:');
    console.log('------------------------------------------------------------------------');
    report.tests.forEach(t => {
      const icon = t.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${icon} | Case #${String(t.id).padStart(2, '0')} [${t.code}]: ${t.title}`);
      if (!t.passed) {
        console.log(`    Expected: ${t.expected}`);
        console.log(`    Actual:   ${t.actual}`);
        if (t.details) console.log(`    Details:  ${t.details}`);
      }
    });

    console.log('\n========================================================================');
    console.log(` FINANCIAL SAFETY INVARIANT CHECK: Discrepancy = ${report.financialDiscrepancyETB.toFixed(2)} ETB`);
    console.log(` FINAL VERDICT: ${report.verdict}`);
    console.log('========================================================================\n');

    if (report.verdict !== 'PASSED') {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('FATAL EXCEPTION DURING RISK 10 ACCEPTANCE RUN:', err);
    process.exit(1);
  }
}

main();
