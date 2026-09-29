import fs from 'fs';

async function run() {
  const endpoints = [
    '/api/admin/stage-j2/test-suite',
    '/api/admin/stage-j3a/test-suite',
    '/api/admin/stage-j3b/test-suite',
    '/api/admin/stage-j3c/test-suite',
    '/api/admin/tests/stage-j3d',
    '/api/admin/tests/stage-j4',
    '/api/admin/tests/stage-j6',
    '/api/admin/tests/stage-j6-hotfix',
    '/api/admin/tests/stage-j6-hotfix-i',
    '/api/admin/tests/stage-final-a'
  ];
  
  const results = {};

  console.log("Authenticating as Super Admin...");
  let token = "";
  try {
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "Robamjaj@gmail.com",
        password: "Roba1234"
      })
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log("Authentication successful.");
  } catch (err) {
    console.error("Failed to authenticate:", err.message);
    process.exit(1);
  }

  for (const ep of endpoints) {
    console.log(`Running ${ep}...`);
    try {
      const res = await fetch(`http://localhost:3000${ep}`, { 
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
      });
      const data = await res.json();
      const passed = data.passed || data.passedTests || 0;
      const total = data.totalTests || (data.results ? data.results.length : 0);
      results[ep] = {
        success: data.success,
        passed,
        total,
        fails: data.results?.filter(r => !r.passed).map(r => r.name) || data.tests?.filter(r => !r.passed).map(r => r.name) || []
      };
      console.log(`[PASS] ${ep}: ${passed}/${total}`);
    } catch (e) {
      console.error(`[FAIL] ${ep}: ${e.message}`);
      results[ep] = { success: false, error: e.message };
    }
  }
  
  fs.writeFileSync('j12_results.json', JSON.stringify(results, null, 2));
  console.log("Suite complete.");
}
run();
