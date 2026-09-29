const http = require('http');

const endpoints = [
  { name: 'Stage J1 Suite', path: '/api/admin/stage-j1/test-suite' },
  { name: 'Stage J2 Suite', path: '/api/admin/stage-j2/test-suite' },
  { name: 'Stage J3A Suite', path: '/api/admin/stage-j3a/test-suite' },
  { name: 'Stage J3B Suite', path: '/api/admin/stage-j3b/test-suite' },
  { name: 'Stage J3C Suite', path: '/api/admin/stage-j3c/test-suite' },
  { name: 'Stage J3D Suite', path: '/api/admin/tests/stage-j3d' },
  { name: 'Stage J4 Suite', path: '/api/admin/tests/stage-j4' },
  { name: 'Stage I5 Suite', path: '/api/admin/stage-i5/test-suite' },
  { name: 'Stage I6 Suite', path: '/api/admin/stage-i6/test-suite' },
  { name: 'Stage I6C Suite', path: '/api/admin/stage-i6-c/test-suite' },
  { name: 'Stage J6 Suite', path: '/api/admin/tests/stage-j6' },
  { name: 'Stage J6 Hotfix Suite', path: '/api/admin/tests/stage-j6-hotfix' },
  { name: 'Stage J6 Hotfix-I Suite', path: '/api/admin/tests/stage-j6-hotfix-i' },
  { name: 'Stage Final-A Suite', path: '/api/admin/tests/stage-final-a' },
  { name: 'Task 10 Final Acceptance Suite', path: '/api/admin/tests/task10-acceptance' }
];

async function run() {
  const loginData = JSON.stringify({ identifier: 'Robamjaj@gmail.com', password: 'Roba1234' });
  const loginRes = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
    req.write(loginData);
    req.end();
  });

  const token = loginRes.token;
  let passedSuites = 0;

  console.log(`Starting execution of ${endpoints.length} full regression test suites...`);

  for (const ep of endpoints) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.request('http://localhost:3000' + ep.path, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
            } catch (err) {
              resolve({ statusCode: res.statusCode, raw: data });
            }
          });
        }).on('error', reject);
        req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
      });

      const body = res.data || {};
      const failed = body.failed ?? (body.tests ? body.tests.filter(t => !t.passed).length : 0);
      const passed = body.passed ?? body.totalPassed ?? (body.tests ? body.tests.filter(t => t.passed).length : 0);
      const total = body.totalTests ?? body.total ?? (body.tests ? body.tests.length : 0);
      const isSuccess = (failed === 0 && (res.statusCode === 200));

      if (isSuccess) {
        passedSuites++;
        console.log(`[PASS] ${ep.name} (${ep.path}) - Tests: ${passed}/${total}`);
      } else {
        console.error(`[FAIL] ${ep.name} (${ep.path}) - Passed: ${passed}/${total}, Failed: ${failed}`);
      }
    } catch (e) {
      console.error(`[ERROR] ${ep.name} (${ep.path}) - Error: ${e.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`REGRESSION SUMMARY: ${passedSuites}/${endpoints.length} PASS`);
  console.log(`========================================`);

  if (passedSuites === endpoints.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run();
