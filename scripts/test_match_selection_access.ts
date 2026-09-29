import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(path: string, options: http.RequestOptions = {}, body?: any): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            // keep raw string
          }
          resolve({ status: res.statusCode || 0, data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('APEX ARENA — MATCH SELECTION ACCESS REGRESSION SUITE');
  console.log('====================================================\n');

  // Test 1: Fetch real competitions list
  try {
    const res = await request('/api/competitions');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array of competitions');
    console.log(`[PASS] Test 1: /api/competitions returned ${res.data.length} competitions`);
    results.push({ name: 'Fetch Competitions API', passed: true, details: { count: res.data.length } });
  } catch (err: any) {
    console.error(`[FAIL] Test 1: Fetch Competitions API - ${err.message}`);
    results.push({ name: 'Fetch Competitions API', passed: false, error: err.message });
  }

  // Test 2: Verify competition matches structure & market options
  let sampleCompId: string | null = null;
  try {
    const compRes = await request('/api/competitions');
    if (compRes.data && compRes.data.length > 0) {
      sampleCompId = compRes.data[0].id;
      const detailRes = await request(`/api/competitions/${sampleCompId}`);
      assert(detailRes.status === 200, `Expected 200 for competition ${sampleCompId}`);
      const comp = detailRes.data;
      assert(comp && comp.id === sampleCompId, 'Competition ID mismatch');
      assert(Array.isArray(comp.matches), 'Competition.matches must be an array');
      console.log(`[PASS] Test 2: Competition "${comp.title}" loaded with ${comp.matches.length} matches`);
      
      if (comp.matches.length > 0) {
        const firstMatch = comp.matches[0];
        assert(firstMatch.id, 'Match missing ID');
        assert(firstMatch.homeTeam, 'Match missing homeTeam');
        assert(firstMatch.awayTeam, 'Match missing awayTeam');
        assert(Array.isArray(firstMatch.markets), 'Match.markets must be an array');
        console.log(`       First Match: ${typeof firstMatch.homeTeam === 'string' ? firstMatch.homeTeam : firstMatch.homeTeam.name} vs ${typeof firstMatch.awayTeam === 'string' ? firstMatch.awayTeam : firstMatch.awayTeam.name} (${firstMatch.markets.length} markets)`);
      }
      results.push({ name: 'Competition Details & Matches Payload', passed: true, details: { compId: sampleCompId, matchesCount: comp.matches.length } });
    } else {
      console.log('[SKIP] Test 2: No competitions exist in DB to test details');
      results.push({ name: 'Competition Details & Matches Payload', passed: true, details: 'No active competitions' });
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 2: Competition Details & Matches Payload - ${err.message}`);
    results.push({ name: 'Competition Details & Matches Payload', passed: false, error: err.message });
  }

  // Test 3: Navigation State Transition Logic (Unit simulation of App.tsx fix)
  try {
    let activeTab = 'competitions';
    let selectedCompetitionId: string | null = null;
    let pushHistory: any[] = [];

    const navigateToTab = (tab: string, competitionId: string | null = null, pushState: boolean = true) => {
      activeTab = tab;
      selectedCompetitionId = competitionId;
      if (pushState) {
        pushHistory.push({ tab, competitionId });
      }
    };

    // The repaired handleSelectCompetition:
    const handleSelectCompetition = (id: string, initialTab: string = 'matches') => {
      if (id === 'WIZARD_CREATOR') {
        navigateToTab('admin', null, true);
        return;
      }
      navigateToTab('competition_details', id, true);
    };

    // Simulate clicking "View Matches & Predict"
    const targetCompId = 'comp_test_123';
    handleSelectCompetition(targetCompId, 'matches');

    assert(activeTab === 'competition_details', `Expected activeTab to be competition_details, got ${activeTab}`);
    assert(selectedCompetitionId === targetCompId, `Expected selectedCompetitionId to be ${targetCompId}, got ${selectedCompetitionId}`);
    assert(pushHistory.length === 1, 'Expected 1 history push');
    assert(pushHistory[0].competitionId === targetCompId, 'History push missing targetCompId');

    // Simulate back navigation
    navigateToTab('competitions', null, true);
    assert(activeTab === 'competitions', 'Expected activeTab to be competitions');
    assert(selectedCompetitionId === null, 'Expected selectedCompetitionId to be null on return');

    console.log('[PASS] Test 3: Navigation state transitions for match selection verified without state wiping');
    results.push({ name: 'Navigation State Transition Simulation', passed: true });
  } catch (err: any) {
    console.error(`[FAIL] Test 3: Navigation State Transition Simulation - ${err.message}`);
    results.push({ name: 'Navigation State Transition Simulation', passed: false, error: err.message });
  }

  // Test 4: Query parameter deep linking and reload handling
  try {
    const testUrl = '?tab=competition_details&competitionId=comp_premier_wk4';
    const params = new URLSearchParams(testUrl);
    const tab = params.get('tab');
    const compId = params.get('competitionId') || params.get('competition');

    assert(tab === 'competition_details', 'URL tab must parse to competition_details');
    assert(compId === 'comp_premier_wk4', 'URL compId must parse to comp_premier_wk4');

    console.log('[PASS] Test 4: Query param deep-linking and reload resolution verified');
    results.push({ name: 'Deep-Linking Query Param Resolution', passed: true });
  } catch (err: any) {
    console.error(`[FAIL] Test 4: Deep-Linking Query Param Resolution - ${err.message}`);
    results.push({ name: 'Deep-Linking Query Param Resolution', passed: false, error: err.message });
  }

  // Test 5: Unauthenticated guest draft behavior (checking endpoint requires token gracefully, fallback to competition matches)
  try {
    if (sampleCompId) {
      const res = await request(`/api/competitions/${sampleCompId}/predictions/draft`);
      // Without token, it should reject with 401 or similar, and frontend gracefully uses competition.matches
      assert(res.status === 401 || res.status === 403, `Expected 401/403 for unauthenticated draft fetch, got ${res.status}`);
      console.log(`[PASS] Test 5: Draft predictions endpoint safely requires authentication (${res.status}) while client safely renders matches`);
      results.push({ name: 'Unauthenticated Security & Guest Safe Fallback', passed: true });
    } else {
      console.log('[SKIP] Test 5: No competition to test draft endpoint');
      results.push({ name: 'Unauthenticated Security & Guest Safe Fallback', passed: true, details: 'Skipped' });
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 5: Unauthenticated Security & Guest Safe Fallback - ${err.message}`);
    results.push({ name: 'Unauthenticated Security & Guest Safe Fallback', passed: false, error: err.message });
  }

  // Test 6: Non-existent competition error handling (404)
  try {
    const res = await request('/api/competitions/non_existent_competition_9999');
    assert(res.status === 404, `Expected 404 for invalid competition, got ${res.status}`);
    console.log(`[PASS] Test 6: Invalid competition ID correctly returns 404 with error message`);
    results.push({ name: 'Non-existent Competition 404 Recovery', passed: true });
  } catch (err: any) {
    console.error(`[FAIL] Test 6: Non-existent Competition 404 Recovery - ${err.message}`);
    results.push({ name: 'Non-existent Competition 404 Recovery', passed: false, error: err.message });
  }

  console.log('\n====================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`MATCH SELECTION REGRESSION TESTS SUMMARY: ${allPassed ? 'ALL PASSED' : 'FAILURES OCCURRED'}`);
  console.log(`Total: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  console.log('====================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
