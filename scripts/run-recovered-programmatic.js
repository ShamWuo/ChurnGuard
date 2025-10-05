const jest = require('jest');
(async function(){
  try{
    const argv = ['--runInBand','--verbose','__tests__/recovered.test.ts'];
    const result = await jest.run(argv);
    // jest.run will exit the process; if it returns, print done
    console.log('JEST_EXIT', result);
  }catch(e){ console.error('JEST_ERR', e && e.message); process.exit(2); }
})();
