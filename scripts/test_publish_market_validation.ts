import { StageTask15PublishMarketValidationService } from '../src/server/stageTask15PublishMarketValidationService.js';

async function main() {
  console.log('--- RUNNING PUBLISH MARKET VALIDATION ACCEPTANCE SUITE ---');
  const results = await StageTask15PublishMarketValidationService.runAcceptanceSuite();

  console.log(`\nOverall Success: ${results.success ? 'PASS' : 'FAIL'}`);
  console.log(`Passed: ${results.passedCount} / ${results.totalCount} (${results.passPercentage}%)`);
  console.log(`Duration: ${results.durationMs}ms\n`);

  for (const r of results.results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.id}: ${r.name}`);
    if (!r.passed) {
      console.log(`   Expected: ${r.expected}`);
      console.log(`   Actual:   ${r.actual}`);
      console.log(`   Details:  ${r.details}`);
    }
  }

  if (!results.success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
