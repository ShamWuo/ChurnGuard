const { runCLI } = require('jest');
(async () => {
  const res = await runCLI({ testMatch: ['**/__tests__/**recovered.test.ts'], runInBand: true, silent: false }, [process.cwd()]);
  console.log('Jest finished', res.results.numFailedTests, 'failed');
  process.exit(res.results.numFailedTests ? 2 : 0);
})();
