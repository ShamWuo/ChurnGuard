const http = require('http');
const url = process.argv[2] || 'http://localhost:3100/api/ready';
http.get(url, (res) => {
  let d='';
  res.on('data', c => d+=c);
  res.on('end', () => { console.log('status', res.statusCode); console.log('body', d); process.exit(0); });
}).on('error', e=>{ console.error('error', e.message); process.exit(2); });
