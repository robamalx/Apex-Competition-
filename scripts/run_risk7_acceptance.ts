import { AdvertisementPublicationValidationService } from '../src/server/advertisementPublicationValidationService.js';

async function main() {
  console.log('================================================================');
  console.log('APEX ARENA — RISK 7: COMMERCIAL AD VALIDATION & TWO-LAYER CONTROL TEST RUNNER');
  console.log('================================================================');
  console.log('Executing 42-case Acceptance Test Suite...\n');

  try {
    const report = await AdvertisementPublicationValidationService.runAcceptanceSuite();

    console.log('--- DETAILED TEST EXECUTION SUMMARY ---');
    for (const test of report.tests) {
      const statusIcon = test.passed ? '[PASS]' : '[FAIL]';
      console.log(
        `${statusIcon} Case #${String(test.caseNumber).padStart(2, '0')}: [${test.category}] ${test.name} (${test.durationMs}ms)`
      );
      if (!test.passed) {
        console.log(`       Expected: ${test.expected}`);
        console.log(`       Actual:   ${test.actual}`);
        console.log(`       Details:  ${test.details}`);
      }
    }

    console.log('\n' + report.reportFormatted);

    if (report.verdict === 'PASSED') {
      console.log('RISK 7 ACCEPTANCE TEST SUITE COMPLETED SUCCESSFULLY (100% PASS RATE).');
      process.exit(0);
    } else {
      console.error('RISK 7 ACCEPTANCE SUITE FAILED.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error executing Risk 7 Acceptance Suite:', error);
    process.exit(1);
  }
}

main();
