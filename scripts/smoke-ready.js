const http = require('http');
const url = process.argv[2] || process.env.SMOKE_URL || 'http://localhost:3110/api/ready';
const timeoutMs = Number(process.argv[3] || process.env.SMOKE_TIMEOUT_MS || 5000);

function fail(msg) { console.error('SMOKE_FAIL', msg); process.exit(2); }
function ok(msg) { console.log('SMOKE_OK', msg); process.exit(0); }

const start = Date.now();
const req = http.get(url, { timeout: timeoutMs }, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try { const j = JSON.parse(d); ok(JSON.stringify(j)); } catch (e) { ok(d || `status:${res.statusCode}`); }
    } else {
      fail(`status:${res.statusCode} body:${d}`);
    }
  });
});
req.on('error', (e) => { fail(e.message); });
req.on('timeout', () => { req.destroy(new Error('timeout')); });
