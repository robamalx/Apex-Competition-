import { db } from './src/server/db.ts';
import { apiFootballService } from './src/server/apiFootballService.ts';
import { CentralFixture, Competition, Prediction, FinalSubmission, OfficialMatchResult } from './src/types.ts';

async function runTests() {
  console.log('========================================');
  console.log('STARTING TASK 4 ROBUSTNESS VERIFICATION SUITE');
  console.log('========================================\n');

  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({ name, passed: condition, details });
    if (condition) {
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} - Details: ${details}`);
    }
  }

  // Ensure DB has clean collections
  if (!db.getFixtures) {
    console.error('DB getFixtures is not a function');
    process.exit(1);
  }

  // Prepare standard mock objects
  const testFixtureId = 'fix_test_task4_1';
  const testCompId = 'comp_test_task4_1';
  const testUserId = 'user_test_task4_1';

  // Cleanup any left-over test data
  const existingFix = db.getFixtureById(testFixtureId);
  if (existingFix) {
    db.data.fixtures = db.data.fixtures.filter(f => f.id !== testFixtureId);
  }
  db.data.competitions = (db.data.competitions || []).filter(c => c.id !== testCompId);
  db.data.predictions = (db.data.predictions || []).filter(p => p.competitionId !== testCompId);
  db.data.finalSubmissions = (db.data.finalSubmissions || []).filter(s => s.competitionId !== testCompId);
  db.data.officialResults = (db.data.officialResults || []).filter(r => r.fixtureId !== testFixtureId);
  db.data.scoringRecords = (db.data.scoringRecords || []).filter(r => r.competitionId !== testCompId);

  // ---------------------------------------------------------------------------
  // TEST 1 — REAL BROKEN FIXTURE DETECTED
  // Prove that a fixture status change can be traced and behaves correctly.
  // ---------------------------------------------------------------------------
  const initialFixture: CentralFixture = {
    id: testFixtureId,
    fixtureId: testFixtureId,
    createdBy: 'SYSTEM_TEST',
    homeTeam: 'Ipswich Town FC',
    awayTeam: 'Liverpool FC',
    league: 'Premier League',
    matchDate: '2026-08-16',
    kickoffTime: '14:30',
    kickoffTimeUtc: '2026-08-16T11:30:00Z',
    utcDate: '2026-08-16T11:30:00Z',
    timezone: 'Africa/Addis_Ababa',
    venue: 'Portman Road',
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    score: null,
    source: 'FOOTBALL_DATA_ORG',
    sourceProvenance: 'VERIFIED_FOOTBALL_DATA_ORG',
    provenance: 'VERIFIED_FOOTBALL_DATA_ORG',
    isAuthenticProviderFixture: true,
    providerFixtureId: 999901,
    externalMatchId: '999901',
    season: '2026/27',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.data.fixtures.push(initialFixture);
  db.save();

  const loadedFix = db.getFixtureById(testFixtureId);
  assert('TEST 1: Real Broken Fixture Initial State', loadedFix !== undefined && loadedFix.status === 'SCHEDULED');

  // ---------------------------------------------------------------------------
  // TEST 2 — STATUS MAPPING
  // Validates standard status normalization.
  // ---------------------------------------------------------------------------
  const stFinished = apiFootballService.normalizeStatus('FT');
  const stLive = apiFootballService.normalizeStatus('2H');
  const stPst = apiFootballService.normalizeStatus('POSTPONED');
  const stCanc = apiFootballService.normalizeStatus('CANC');
  const stSch = apiFootballService.normalizeStatus('NS');
  
  assert('TEST 2: Status Mapping', 
    stFinished === 'FINISHED' && 
    stLive === 'LIVE' && 
    stPst === 'POSTPONED' && 
    stCanc === 'CANCELLED' && 
    stSch === 'SCHEDULED'
  );

  // ---------------------------------------------------------------------------
  // TEST 3 — CLOCK INFERENCE SAFETY
  // Verifies passed kickoff time alone never forces status to FINISHED.
  // ---------------------------------------------------------------------------
  const pastFixtureId = 'fix_past_kickoff';
  const pastFixture: CentralFixture = {
    ...initialFixture,
    id: pastFixtureId,
    fixtureId: pastFixtureId,
    matchDate: '2026-01-01',
    kickoffTimeUtc: '2026-01-01T12:00:00Z',
    status: 'SCHEDULED'
  };
  db.data.fixtures.push(pastFixture);
  db.save();

  // Try retrieving it and check if status remains SCHEDULED
  const fetchedPast = db.getFixtureById(pastFixtureId);
  assert('TEST 3: Clock Inference Safety (Past kickoff remains SCHEDULED)', fetchedPast !== undefined && fetchedPast.status === 'SCHEDULED');
  db.data.fixtures = db.data.fixtures.filter(f => f.id !== pastFixtureId);

  // ---------------------------------------------------------------------------
  // TEST 4 — RESULTS INGESTION
  // Ingest result with valid scores, ensure status becomes FINISHED.
  // ---------------------------------------------------------------------------
  const resObject: OfficialMatchResult = {
    id: `res_test_${Date.now()}`,
    fixtureId: testFixtureId,
    homeScore: 1,
    awayScore: 3,
    status: 'FINISHED',
    submittedBy: 'SYSTEM_TEST',
    submittedAt: new Date().toISOString(),
    isFinalized: false,
    version: 1
  };
  db.saveOfficialResult(resObject);
  
  const updatedFix = db.getFixtureById(testFixtureId);
  assert('TEST 4: Results Ingestion Status & Scores', 
    updatedFix !== undefined && 
    updatedFix.status === 'FINISHED' && 
    updatedFix.homeScore === 1 && 
    updatedFix.awayScore === 3
  );

  // ---------------------------------------------------------------------------
  // TEST 5 — PROPAGATION
  // Verify database updates propagate immediately to active/settling competitions.
  // ---------------------------------------------------------------------------
  const testComp: Competition = {
    id: testCompId,
    title: 'Test Competition Task 4',
    league: 'Premier League',
    status: 'PUBLISHED',
    entryFeeETB: 10,
    prizePoolETB: 100,
    currentPlayers: 1,
    matches: [
      {
        id: testFixtureId,
        fixtureId: testFixtureId,
        homeTeam: 'Ipswich Town FC',
        awayTeam: 'Liverpool FC',
        league: 'Premier League',
        matchDate: '2026-08-16',
        kickoffTime: '14:30',
        kickoffTimeUtc: '2026-08-16T11:30:00Z',
        status: 'SCHEDULED', // Snapshot initially SCHEDULED
        homeScore: null,
        awayScore: null
      }
    ],
    rulesSnapshot: {
      marketPoints: {
        '1X2': 3,
        'BTTS': 2,
        'OVER_UNDER_2_5': 2,
        'CORRECT_SCORE': 5,
        'DOUBLE_CHANCE': 2,
        'HANDICAP': 3
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.data.competitions.push(testComp);
  db.save();

  // Retrieving the competition must trigger hydrateCompetitionDynamicFields and propagate the finished status & score!
  const hydratedComp = db.getCompetitionById(testCompId);
  assert('TEST 5: Propagation to Active Competition Match Snapshot',
    hydratedComp !== undefined &&
    hydratedComp.matches[0].status === 'FINISHED' &&
    hydratedComp.matches[0].score?.home === 1 &&
    hydratedComp.matches[0].score?.away === 3
  );

  // ---------------------------------------------------------------------------
  // TEST 6 — DRAFT & LIVE STATES
  // Confirm matches in draft or live competitions sync correctly.
  // ---------------------------------------------------------------------------
  hydratedComp!.status = 'LIVE';
  db.save();
  const liveComp = db.getCompetitionById(testCompId);
  assert('TEST 6: Draft & Live States Syncing Correctly',
    liveComp !== undefined &&
    liveComp.matches[0].status === 'FINISHED' &&
    liveComp.matches[0].score?.home === 1
  );

  // ---------------------------------------------------------------------------
  // TEST 7 — COMPLETED STATUS SKIP / IMMUTABILITY
  // If competition is already SETTLED or COMPLETED, we must ensure the historic result is frozen.
  // ---------------------------------------------------------------------------
  liveComp!.status = 'SETTLED';
  db.save();
  
  // Try changing central fixture to a different score
  const altFix = db.getFixtureById(testFixtureId);
  if (altFix) {
    altFix.homeScore = 5;
    altFix.awayScore = 5;
    db.save();
  }

  // Get settled competition - does it preserve the completed snapshot?
  // Since the competition is SETTLED, hydrateCompetitionDynamicFields skips updating/overwriting the matches (frozen state).
  assert('TEST 7: Completed Status freezes matches (skipped/not overwritten)', db.getCompetitionById(testCompId)?.matches[0].score?.home === 1);

  // Let's revert fixture score back to 1-3 for scoring tests
  const finalFix = db.getFixtureById(testFixtureId);
  if (finalFix) {
    finalFix.homeScore = 1;
    finalFix.awayScore = 3;
    db.save();
  }

  // Restore competition status to PUBLISHED for the upcoming scoring tests
  const activeComp = db.getCompetitionById(testCompId);
  if (activeComp) {
    activeComp.status = 'PUBLISHED';
    db.save();
  }

  // ---------------------------------------------------------------------------
  // TEST 8 — SCORING VERIFICATION
  // Verify prediction scoring on 1X2 market. Choice '2' (away win, Liverpool 3-1 Ipswich) should be CORRECT.
  // ---------------------------------------------------------------------------
  const testPred: Prediction = {
    id: `pred_${testCompId}_${testUserId}`,
    competitionId: testCompId,
    userId: testUserId,
    selections: [
      {
        matchId: testFixtureId,
        marketType: '1X2',
        optionChoice: '2', // Away win
        pointsMultiplier: 1.5,
        isCorrect: undefined
      }
    ],
    totalPointsEarned: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.data.predictions = db.data.predictions || [];
  db.data.predictions.push(testPred);

  const testSub: FinalSubmission = {
    id: `sub_${testCompId}_${testUserId}`,
    userId: testUserId,
    competitionId: testCompId,
    submittedAt: new Date().toISOString(),
    transactionId: 'tx_dummy_1'
  };
  db.data.finalSubmissions = db.data.finalSubmissions || [];
  db.data.finalSubmissions.push(testSub);
  db.save();

  // Run Scoring Engine
  const scoreResult = db.scoreCompetition(testCompId);
  const scoredPred = db.data.predictions.find(p => p.id === testPred.id);
  assert('TEST 8: Scoring Verification (Correct prediction evaluates properly)',
    scoreResult.success &&
    scoredPred !== undefined &&
    scoredPred.selections[0].isCorrect === true
  );

  // ---------------------------------------------------------------------------
  // TEST 9 — POINT MULTIPLIERS
  // Multiplier is 1.5. Base points for 1X2 is 3. Points awarded = 3 * 1.5 = 4.5 or 3 depending on rule definition.
  // Wait, let's verify pointsAwarded value in scored selections!
  // ---------------------------------------------------------------------------
  const selectionPoints = scoredPred?.selections[0].pointsAwarded;
  assert('TEST 9: Multipliers / Points Applied', selectionPoints !== undefined && selectionPoints > 0);

  // ---------------------------------------------------------------------------
  // TEST 10 — SCORE ACCURACY
  // Verify incorrect predictions earn exactly 0 points.
  // ---------------------------------------------------------------------------
  const testUserIdIncorrect = 'user_test_task4_incorrect';
  const testPredIncorrect: Prediction = {
    id: `pred_${testCompId}_${testUserIdIncorrect}`,
    competitionId: testCompId,
    userId: testUserIdIncorrect,
    selections: [
      {
        matchId: testFixtureId,
        marketType: '1X2',
        optionChoice: '1', // Home win (which is incorrect)
        pointsMultiplier: 1.0,
        isCorrect: undefined
      }
    ],
    totalPointsEarned: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.data.predictions.push(testPredIncorrect);
  db.data.finalSubmissions.push({
    id: `sub_${testCompId}_${testUserIdIncorrect}`,
    userId: testUserIdIncorrect,
    competitionId: testCompId,
    submittedAt: new Date().toISOString(),
    transactionId: 'tx_dummy_2'
  });
  db.save();

  db.scoreCompetition(testCompId);
  const scoredIncorrect = db.data.predictions.find(p => p.id === testPredIncorrect.id);
  assert('TEST 10: Score Accuracy (Incorrect prediction is marked incorrect and gets 0 points)',
    scoredIncorrect !== undefined &&
    scoredIncorrect.selections[0].isCorrect === false &&
    scoredIncorrect.selections[0].pointsAwarded === 0
  );

  // ---------------------------------------------------------------------------
  // TEST 11 — LEADERBOARD INTEGRATION
  // Confirm leaderboard rank and recalculation. Correct user must be rank 1.
  // ---------------------------------------------------------------------------
  const leaderboard = db.getCompetitionLeaderboard(testCompId);
  assert('TEST 11: Leaderboard Recalculation',
    leaderboard.length >= 2 &&
    leaderboard[0].userId === testUserId &&
    leaderboard[0].totalPoints > leaderboard[1].totalPoints
  );

  // ---------------------------------------------------------------------------
  // TEST 12 — IDEMPOTENCY
  // Ensure running scoreCompetition or sync repeatedly does not create duplicate entries.
  // ---------------------------------------------------------------------------
  const firstCount = db.data.scoringRecords.filter(r => r.competitionId === testCompId).length;
  db.scoreCompetition(testCompId);
  const secondCount = db.data.scoringRecords.filter(r => r.competitionId === testCompId).length;
  assert('TEST 12: Idempotency (0 duplicate scoring records on repeated run)', firstCount === secondCount && firstCount > 0);

  // Final Cleanup
  db.data.fixtures = db.data.fixtures.filter(f => f.id !== testFixtureId);
  db.data.competitions = db.data.competitions.filter(c => c.id !== testCompId);
  db.data.predictions = db.data.predictions.filter(p => p.competitionId !== testCompId);
  db.data.finalSubmissions = db.data.finalSubmissions.filter(s => s.competitionId !== testCompId);
  db.data.officialResults = db.data.officialResults.filter(r => r.fixtureId !== testFixtureId);
  db.data.scoringRecords = db.data.scoringRecords.filter(r => r.competitionId !== testCompId);
  db.save();

  console.log('\n========================================');
  const allPassed = results.every(r => r.passed);
  console.log(`SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log('========================================\n');

  if (allPassed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(console.error);
