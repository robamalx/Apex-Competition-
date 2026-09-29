import { LocalTestingEnvironmentService } from '../src/server/localTestingEnvironmentService.js';

async function runCLI() {
  console.log('=================================================================');
  console.log(' APEX ARENA — PRE-LAUNCH LOCAL ACCEPTANCE TEST SUITE RUNNER');
  console.log('=================================================================\n');

  try {
    LocalTestingEnvironmentService.verifyLocalEnvironment();
    console.log('Environment: LOCAL_TEST [VERIFIED]');
    console.log('Starting full local acceptance test suite execution...\n');

    const report = LocalTestingEnvironmentService.runFullAcceptanceSuite();

    console.log('-----------------------------------------------------------------');
    console.log(' TEST SUITE SUMMARY:');
    console.log(` - Total Executed: ${report.summary.totalExecuted}`);
    console.log(` - Passed: ${report.summary.totalPassed}`);
    console.log(` - Failed: ${report.summary.totalFailed}`);
    console.log(` - Success Rate: ${report.summary.successRate}`);
    console.log(` - Financial Discrepancy: ${report.summary.discrepancyETB.toFixed(2)} ETB`);
    console.log('-----------------------------------------------------------------\n');

    console.log(' DETAILED TEST RESULTS:\n');
    for (const res of report.results) {
      const mark = res.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      console.log(`[${res.testId}] ${mark} | ${res.name}`);
      console.log(`  Category: ${res.category}`);
      console.log(`  Action: ${res.action}`);
      console.log(`  Expected: ${res.expectedResult}`);
      console.log(`  Actual: ${res.actualResult}`);
      console.log(`  Operation ID: ${res.operationId} | Correlation ID: ${res.correlationId}`);
      if (res.errorDetails) console.log(`  Error: ${res.errorDetails}`);
      console.log('');
    }

    console.log('=================================================================');
    if (report.summary.totalFailed === 0) {
      console.log(' RESULT: ALL LOCAL ACCEPTANCE TESTS PASSED (0.00 ETB Discrepancy)');
      console.log('=================================================================');
      process.exit(0);
    } else {
      console.log(' RESULT: LOCAL TEST SUITE DETECTED FAILURES');
      console.log('=================================================================');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('CRITICAL ERROR RUNNING TEST SUITE:', err.message);
    process.exit(1);
  }
}

runCLI();
