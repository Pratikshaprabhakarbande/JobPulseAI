import { runAllTests } from './automatedTests';

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   JOBPULSE AI — AUTOMATED QA & INTEGRATION SUITE');
  console.log('═══════════════════════════════════════════════════════');

  const result = await runAllTests();

  console.log('');
  for (const t of result.tests) {
    console.log(`  ${t}`);
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────');
  console.log(`  Total: ${result.passed + result.failed} | Passed: ${result.passed} | Failed: ${result.failed}`);
  console.log('═══════════════════════════════════════════════════════');

  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
