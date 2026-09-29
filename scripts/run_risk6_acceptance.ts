import { CompetitionPublicationValidationService } from '../src/server/competitionPublicationValidationService.js';

async function main() {
  console.log('================================================================');
  console.log('APEX ARENA — RISK 6: COMPETITION PUBLISHER ERROR & TWO-LAYER CONTROL TEST RUNNER');
  console.log('================================================================');
  console.log('Executing 41-case Acceptance Test Suite...\n');

  try {
    const report = await CompetitionPublicationValidationService.runAcceptanceSuite();

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
      console.log('RISK 6 ACCEPTANCE TEST SUITE COMPLETED SUCCESSFULLY.');
      process.exit(0);
    } else {
      console.error('RISK 6 ACCEPTANCE SUITE FAILED.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error executing Risk 6 Acceptance Suite:', error);
    process.exit(1);
  }
}

main();
