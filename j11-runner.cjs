const http = require('http');
const { execSync } = require('child_process');

const groups = {
  A: ['/api/admin/stage-j1/test-suite', '/api/admin/stage-j2/test-suite'],
  B: ['/api/admin/stage-j3a/test-suite', '/api/admin/stage-j3b/test-suite', '/api/admin/stage-j3c/test-suite', '/api/admin/tests/stage-j3d'],
  C: ['/api/admin/tests/stage-j4', '/api/admin/tests/stage-j6'],
  D: ['/api/admin/tests/stage-j6-hotfix', '/api/admin/tests/stage-j6-hotfix-i'],
  E: ['/api/admin/tests/stage-final-a']
};

async function fetchEndpoint(ep) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: ep,
      method: 'POST'
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'JSON Parse error: ' + e.message, raw: data });
        }
      });
    }).on('error', reject);
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function run() {
  console.log("==========================================");
  console.log(" STAGE J11 - VERIFICATION & REGRESSION ");
  console.log("==========================================\n");

  let allPassed = 0;
  let allTotal = 0;

  for (const [groupName, endpoints] of Object.entries(groups)) {
    console.log(`\n--- GROUP ${groupName} ---`);
    for (const ep of endpoints) {
      console.log(`[+] Running ${ep}...`);
      try {
        const start = Date.now();
        const res = await fetchEndpoint(ep);
        const duration = Date.now() - start;
        const passCount = res.passed || res.passedTests || res.passCount || 0;
        const total = res.totalTests || res.total || passCount + (res.failed || res.failCount || 0) || passCount;
        
        allPassed += passCount;
        allTotal += total;
        
        const ok = res.success || res.passed || (passCount > 0 && passCount === total);
        console.log(`    Status: ${ok ? 'PASS' : 'FAIL'} (${passCount}/${total}) - ${duration}ms`);
        if (!ok) {
           console.log(`    Details: `, res.error || (res.tests ? res.tests.filter(t => !t.passed) : res));
        }
      } catch (e) {
        console.log(`    ERROR: ${e.message}`);
      }
    }
  }

  console.log("==========================================");
  console.log(` TOTAL VERIFICATION: ${allPassed} / ${allTotal}`);
  console.log("==========================================");
}
run();
