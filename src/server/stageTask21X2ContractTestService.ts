import { db, validateMarketChoice, normalizeMarketChoice, evaluateMarketSelection } from './db.js';

export interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export function run1X2ContractTestSuite(): { success: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  const fixture = {
    id: 'test_m1',
    homeTeam: { id: '354', name: 'Crystal Palace FC', code: 'CRY' },
    awayTeam: { id: '57', name: 'Arsenal FC', code: 'ARS' }
  };

  // Test 1: Canonical values directly pass normalization & validation
  const test1a = normalizeMarketChoice('1X2', 'HOME', fixture.homeTeam, fixture.awayTeam);
  const val1a = validateMarketChoice('1X2', test1a);
  results.push({
    testName: 'Canonical "HOME" selection',
    passed: test1a === 'HOME' && val1a.valid,
    details: `Normalized: '${test1a}', Valid: ${val1a.valid}`
  });

  const test1b = normalizeMarketChoice('1X2', 'DRAW', fixture.homeTeam, fixture.awayTeam);
  const val1b = validateMarketChoice('1X2', test1b);
  results.push({
    testName: 'Canonical "DRAW" selection',
    passed: test1b === 'DRAW' && val1b.valid,
    details: `Normalized: '${test1b}', Valid: ${val1b.valid}`
  });

  const test1c = normalizeMarketChoice('1X2', 'AWAY', fixture.homeTeam, fixture.awayTeam);
  const val1c = validateMarketChoice('1X2', test1c);
  results.push({
    testName: 'Canonical "AWAY" selection',
    passed: test1c === 'AWAY' && val1c.valid,
    details: `Normalized: '${test1c}', Valid: ${val1c.valid}`
  });

  // Test 2: Alias codes ('1', 'X', '2') normalize to canonical
  const test2a = normalizeMarketChoice('1X2', '1', fixture.homeTeam, fixture.awayTeam);
  const test2b = normalizeMarketChoice('1X2', 'X', fixture.homeTeam, fixture.awayTeam);
  const test2c = normalizeMarketChoice('1X2', '2', fixture.homeTeam, fixture.awayTeam);
  results.push({
    testName: 'Legacy numeric codes ("1", "X", "2") normalization',
    passed: test2a === 'HOME' && test2b === 'DRAW' && test2c === 'AWAY',
    details: `"1"->${test2a}, "X"->${test2b}, "2"->${test2c}`
  });

  // Test 3: Visible team names normalize to canonical
  const test3a = normalizeMarketChoice('1X2', 'Crystal Palace FC', fixture.homeTeam, fixture.awayTeam);
  const test3b = normalizeMarketChoice('1X2', 'Arsenal FC', fixture.homeTeam, fixture.awayTeam);
  const test3c = normalizeMarketChoice('1X2', 'Draw', fixture.homeTeam, fixture.awayTeam);
  results.push({
    testName: 'Visible team names normalization',
    passed: test3a === 'HOME' && test3b === 'AWAY' && test3c === 'DRAW',
    details: `"Crystal Palace FC"->${test3a}, "Arsenal FC"->${test3b}, "Draw"->${test3c}`
  });

  // Test 4: Unrelated team name is NOT blindly mapped and fails validation
  const test4Raw = normalizeMarketChoice('1X2', 'Chelsea FC', fixture.homeTeam, fixture.awayTeam);
  const val4 = validateMarketChoice('1X2', test4Raw);
  results.push({
    testName: 'Unrelated team name ("Chelsea FC") rejection',
    passed: !val4.valid && val4.reason?.toLowerCase().includes("invalid 1x2 choice 'chelsea fc'") === true,
    details: `Valid: ${val4.valid}, Reason: "${val4.reason}"`
  });

  // Test 5: Scoring evaluation for canonical choices
  const scoreHomeWin = { home: 2, away: 1 };
  const ptsHome = evaluateMarketSelection('1X2', 'HOME', scoreHomeWin);
  const ptsDraw = evaluateMarketSelection('1X2', 'DRAW', scoreHomeWin);
  const ptsAway = evaluateMarketSelection('1X2', 'AWAY', scoreHomeWin);
  results.push({
    testName: 'Scoring evaluation for 2-1 home win',
    passed: ptsHome.pointsEarned === 3 && ptsDraw.pointsEarned === 0 && ptsAway.pointsEarned === 0,
    details: `HOME: ${ptsHome.pointsEarned} pts, DRAW: ${ptsDraw.pointsEarned} pts, AWAY: ${ptsAway.pointsEarned} pts`
  });

  const allPassed = results.every(r => r.passed);
  return { success: allPassed, results };
}
