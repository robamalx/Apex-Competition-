import {
  db,
  FIXED_MARKET_POINTS,
  APPROVED_MARKETS,
  APPROVED_PREDICTION_MARKETS,
  DEFAULT_SCORING_CONFIG,
  evaluateMarketSelection,
  validateMarketChoice,
  compareLeaderboardEntries,
  areLeaderboardEntriesTied,
  resolveCanonicalMarketType
} from './db.js';
import { MarketType, User, Competition, FinalPredictionSubmission, CompetitionLeaderboardEntry, CentralFixture } from '../types.js';

export interface Task18ScoringTestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Task18ScoringTestSuiteResponse {
  success: boolean;
  passedCount: number;
  totalCount: number;
  passPercentage: number;
  durationMs: number;
  results: Task18ScoringTestResult[];
}

export class StageTask18ScoringService {
  public static async runAcceptanceSuite(): Promise<Task18ScoringTestSuiteResponse> {
    const startTime = Date.now();
    const tests: Task18ScoringTestResult[] = [];
    db.enterSandbox();

    try {
      const record = (
        id: string,
        name: string,
        category: string,
        passed: boolean,
        expected: string,
        actual: string,
        details: string,
        t0: number
      ) => {
        tests.push({
          id,
          name,
          category,
          status: passed ? 'PASS' : 'FAIL',
          passed,
          expected,
          actual,
          details,
          durationMs: Date.now() - t0
        });
      };

      const createTestUser = (role: 'SUPER_ADMIN' | 'COMPETITION_PUBLISHER' | 'PLAYER' = 'PLAYER'): User => {
        const uid = `usr_t18_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const user: User = {
          id: uid,
          name: `User ${uid.slice(-4)}`,
          email: `${uid}@example.com`,
          username: uid,
          role,
          balanceETB: 5000,
          pendingBalanceETB: 0,
          referralPoints: 0,
          referralCode: `REF_${uid}`,
          phone: '+251911000000',
          isVerified: true,
          createdAt: new Date().toISOString()
        };
        db.createUser(user, 'test_hash_123');
        return user;
      };

      const createTestFixture = (id: string, homeTeam: string, awayTeam: string, league: string): CentralFixture => {
        return db.createFixture({
          id,
          homeTeam,
          awayTeam,
          league,
          matchDate: new Date().toISOString(),
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          timezone: 'UTC',
          status: 'SCHEDULED',
          createdBy: 'SYSTEM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      };

      const createTestComp = (compData: Partial<Competition>): Competition => {
        const cid = `comp_t18_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        return db.createCompetition({
          id: cid,
          type: 'FREE',
          league: 'Premier League',
          country: 'England',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          lockTime: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'SYSTEM',
          title: `Test Comp ${cid}`,
          entryFeeETB: 0,
          prizePoolETB: 100,
          maxPlayers: 100,
          currentPlayers: 0,
          status: 'DRAFT',
          enabledMarkets: ['1X2', 'CORRECT_SCORE'],
          matches: [],
          ...compData
        } as Competition);
      };

      // ==========================================
      // CATEGORY 1: AUTHORITATIVE MARKET POINTS
      // ==========================================
      {
        const t0 = Date.now();
        const p1x2 = FIXED_MARKET_POINTS['1X2'];
        const pCS = FIXED_MARKET_POINTS['CORRECT_SCORE'];
        const pOU = FIXED_MARKET_POINTS['OVER_UNDER_2_5'];
        const pBTTS = FIXED_MARKET_POINTS['BTTS'];
        const pDC = FIXED_MARKET_POINTS['DOUBLE_CHANCE'];

        const passed = p1x2 === 3 && pCS === 6 && pOU === 2 && pBTTS === 1 && pDC === 1;
        record(
          'T18-POINTS-01',
          'Authoritative Market Point Values Verification',
          'MARKET_POINTS',
          passed,
          '1X2=3, CorrectScore=6, OverUnder=2, BTTS=1, DoubleChance=1',
          `1X2=${p1x2}, CS=${pCS}, OU=${pOU}, BTTS=${pBTTS}, DC=${pDC}`,
          passed ? 'All 5 core markets have correct authoritative point values' : 'Point values mismatch',
          t0
        );
      }

      {
        const t0 = Date.now();
        const globalCfg = db.getGlobalScoringConfig();
        const m = globalCfg.markets;
        const passed = (
          m['1X2'].points === 3 &&
          m['CORRECT_SCORE'].points === 6 &&
          m['OVER_UNDER_2_5'].points === 2 &&
          m['BTTS'].points === 1 &&
          m['DOUBLE_CHANCE'].points === 1
        );
        record(
          'T18-POINTS-02',
          'Global Scoring Configuration Defaults Match Authoritative Rules',
          'MARKET_POINTS',
          passed,
          'Global config matches 3, 6, 2, 1, 1',
          `Global config: 1X2=${m['1X2'].points}, CS=${m['CORRECT_SCORE'].points}, OU=${m['OVER_UNDER_2_5'].points}, BTTS=${m['BTTS'].points}, DC=${m['DOUBLE_CHANCE'].points}`,
          passed ? 'Global scoring configuration initialized correctly' : 'Global config point mismatch',
          t0
        );
      }

      // ==========================================
      // CATEGORY 2: DYNAMIC POINT CALCULATION
      // ==========================================
      {
        const t0 = Date.now();
        // 5 markets for 1 match: 3 + 6 + 2 + 1 + 1 = 13 points
        const markets5: MarketType[] = ['1X2', 'CORRECT_SCORE', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE'];
        const ptsPerMatch = markets5.reduce((sum, m) => sum + (FIXED_MARKET_POINTS[m] || 0), 0);
        const pts10Matches = ptsPerMatch * 10;

        const passed = ptsPerMatch === 13 && pts10Matches === 130;
        record(
          'T18-DYNAMIC-01',
          'Dynamic Match & Competition Max Points Calculation',
          'DYNAMIC_POINTS',
          passed,
          '1 match (5 markets) = 13 pts, 10 matches = 130 pts',
          `1 match = ${ptsPerMatch} pts, 10 matches = ${pts10Matches} pts`,
          passed ? 'Calculations are fully dynamic and match official specifications' : 'Point calculation calculation mismatch',
          t0
        );
      }

      {
        const t0 = Date.now();
        // Custom 3 markets: 1X2 (3), BTTS (1), Correct Score (6) = 10 pts per match for 6 matches = 60 pts
        const markets3: MarketType[] = ['1X2', 'BTTS', 'CORRECT_SCORE'];
        const customPerMatch = markets3.reduce((sum, m) => sum + (FIXED_MARKET_POINTS[m] || 0), 0);
        const custom6Matches = customPerMatch * 6;

        const passed = customPerMatch === 10 && custom6Matches === 60;
        record(
          'T18-DYNAMIC-02',
          'Dynamic Calculation for Arbitrary Enabled Market Subset',
          'DYNAMIC_POINTS',
          passed,
          'Subset (1X2 + BTTS + CS) = 10 pts/match, 6 matches = 60 pts',
          `Subset = ${customPerMatch} pts/match, 6 matches = ${custom6Matches} pts`,
          passed ? 'Dynamic calculation handles arbitrary market configurations correctly' : 'Subset calculation failed',
          t0
        );
      }

      // ==========================================
      // CATEGORY 3: CORRECT SCORE VALIDATION
      // ==========================================
      {
        const t0 = Date.now();
        const validScores = ['0-0', '1-0', '2-1', '3-2', '0-3', '4-1', '2-2', ' 1 - 0 '];
        const allValid = validScores.every(s => validateMarketChoice('CORRECT_SCORE', s).valid);

        record(
          'T18-CS-VAL-01',
          'Strict Correct Score Valid Pattern Parsing',
          'CS_VALIDATION',
          allValid,
          'All valid score strings pass validation',
          `Tested ${validScores.length} valid formats: all passed=${allValid}`,
          allValid ? 'Valid correct score patterns are accepted' : 'Valid scores failed validation',
          t0
        );
      }

      {
        const t0 = Date.now();
        const invalidScores = ['-1-0', '2--1', 'abc', '1:0', '10-0', '0-12', '3', '1-x', ''];
        const allInvalid = invalidScores.every(s => !validateMarketChoice('CORRECT_SCORE', s).valid);

        record(
          'T18-CS-VAL-02',
          'Strict Correct Score Invalid / Out-of-Bounds Rejection',
          'CS_VALIDATION',
          allInvalid,
          'All invalid or out-of-bounds score strings rejected',
          `Tested ${invalidScores.length} invalid formats: all rejected=${allInvalid}`,
          allInvalid ? 'Invalid correct score inputs are strictly rejected' : 'Some invalid score formats passed validation',
          t0
        );
      }

      // ==========================================
      // CATEGORY 4: AUTHORITATIVE MARKET EVALUATION
      // ==========================================
      {
        const t0 = Date.now();
        // Match finished 2-1 (Home win, Total goals 3, Both scored, HT not specified)
        const score = { home: 2, away: 1 };

        const res1X2_1 = evaluateMarketSelection('1X2', '1', score, 3);
        const res1X2_X = evaluateMarketSelection('1X2', 'X', score, 3);
        const res1X2_2 = evaluateMarketSelection('1X2', '2', score, 3);

        const resCS_exact = evaluateMarketSelection('CORRECT_SCORE', '2-1', score, 6);
        const resCS_wrong = evaluateMarketSelection('CORRECT_SCORE', '1-0', score, 6);

        const resOU_over = evaluateMarketSelection('OVER_UNDER_2_5', 'OVER', score, 2);
        const resOU_under = evaluateMarketSelection('OVER_UNDER_2_5', 'UNDER', score, 2);

        const resBTTS_yes = evaluateMarketSelection('BTTS', 'YES', score, 1);
        const resBTTS_no = evaluateMarketSelection('BTTS', 'NO', score, 1);

        const resDC_1X = evaluateMarketSelection('DOUBLE_CHANCE', '1X', score, 1);
        const resDC_12 = evaluateMarketSelection('DOUBLE_CHANCE', '12', score, 1);
        const resDC_X2 = evaluateMarketSelection('DOUBLE_CHANCE', 'X2', score, 1);

        const passed = (
          res1X2_1.isCorrect && res1X2_1.pointsEarned === 3 &&
          !res1X2_X.isCorrect && res1X2_X.pointsEarned === 0 &&
          !res1X2_2.isCorrect && res1X2_2.pointsEarned === 0 &&
          resCS_exact.isCorrect && resCS_exact.pointsEarned === 6 &&
          !resCS_wrong.isCorrect && resCS_wrong.pointsEarned === 0 &&
          resOU_over.isCorrect && resOU_over.pointsEarned === 2 &&
          !resOU_under.isCorrect && resOU_under.pointsEarned === 0 &&
          resBTTS_yes.isCorrect && resBTTS_yes.pointsEarned === 1 &&
          !resBTTS_no.isCorrect && resBTTS_no.pointsEarned === 0 &&
          resDC_1X.isCorrect && resDC_1X.pointsEarned === 1 &&
          resDC_12.isCorrect && resDC_12.pointsEarned === 1 &&
          !resDC_X2.isCorrect && resDC_X2.pointsEarned === 0
        );

        record(
          'T18-EVAL-01',
          'Authoritative Evaluation & Point Awarding Across All 5 Markets for 2-1 Result',
          'SCORING_EVALUATION',
          passed,
          '1X2=3, CS(2-1)=6, OU2.5(OVER)=2, BTTS(YES)=1, DC(1X/12)=1, all losses=0',
          `1X2_1=${res1X2_1.pointsEarned}, CS_2-1=${resCS_exact.pointsEarned}, OU_over=${resOU_over.pointsEarned}, BTTS_yes=${resBTTS_yes.pointsEarned}, DC_1X=${resDC_1X.pointsEarned}`,
          passed ? 'All 5 markets accurately evaluated against 2-1 scoreline with exact configured points' : 'Evaluation error on 2-1 match',
          t0
        );
      }

      {
        const t0 = Date.now();
        // Match finished 0-0 (Draw, Total goals 0, Clean sheet)
        const score = { home: 0, away: 0 };

        const res1X2_X = evaluateMarketSelection('1X2', 'X', score, 3);
        const resCS_00 = evaluateMarketSelection('CORRECT_SCORE', '0-0', score, 6);
        const resOU_under = evaluateMarketSelection('OVER_UNDER_2_5', 'UNDER', score, 2);
        const resBTTS_no = evaluateMarketSelection('BTTS', 'NO', score, 1);
        const resDC_X2 = evaluateMarketSelection('DOUBLE_CHANCE', 'X2', score, 1);
        const resDC_12 = evaluateMarketSelection('DOUBLE_CHANCE', '12', score, 1);

        const passed = (
          res1X2_X.isCorrect && res1X2_X.pointsEarned === 3 &&
          resCS_00.isCorrect && resCS_00.pointsEarned === 6 &&
          resOU_under.isCorrect && resOU_under.pointsEarned === 2 &&
          resBTTS_no.isCorrect && resBTTS_no.pointsEarned === 1 &&
          resDC_X2.isCorrect && resDC_X2.pointsEarned === 1 &&
          !resDC_12.isCorrect && resDC_12.pointsEarned === 0
        );

        record(
          'T18-EVAL-02',
          'Authoritative Evaluation & Point Awarding Across All 5 Markets for 0-0 Draw Result',
          'SCORING_EVALUATION',
          passed,
          '1X2(X)=3, CS(0-0)=6, OU2.5(UNDER)=2, BTTS(NO)=1, DC(X2)=1',
          `1X2_X=${res1X2_X.pointsEarned}, CS_00=${resCS_00.pointsEarned}, OU_under=${resOU_under.pointsEarned}, BTTS_no=${resBTTS_no.pointsEarned}, DC_X2=${resDC_X2.pointsEarned}`,
          passed ? 'All 5 markets accurately evaluated against 0-0 draw' : 'Evaluation error on 0-0 match',
          t0
        );
      }

      // ==========================================
      // CATEGORY 5: IMMUTABLE COMPETITION RULES SNAPSHOT
      // ==========================================
      {
        const t0 = Date.now();
        const admin = createTestUser('SUPER_ADMIN');

        // Create a competition
        const fixture1 = createTestFixture(`fix_t18_${Date.now()}_1`, 'Arsenal', 'Chelsea', 'Premier League');

        const comp = createTestComp({
          title: `Snapshot Test Competition ${Date.now()}`,
          entryFeeETB: 50,
          prizePoolETB: 1000,
          maxPlayers: 100,
          currentPlayers: 0,
          status: 'DRAFT',
          enabledMarkets: ['1X2', 'CORRECT_SCORE', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE'],
          matches: [
            {
              id: fixture1.id,
              fixtureId: fixture1.id,
              competitionId: 'temp_comp',
              homeTeam: { name: 'Arsenal', code: 'ARS' },
              awayTeam: { name: 'Chelsea', code: 'CHE' },
              kickoffTime: fixture1.kickoffTime,
              status: 'SCHEDULED',
              league: 'Premier League',
              country: 'England',
              markets: []
            }
          ]
        });

        const pubRes = db.publishCompetition(comp.id, admin.id);
        const snap = pubRes.competition.rulesSnapshot;

        const passed = Boolean(
          pubRes.success &&
          snap &&
          snap.marketPoints &&
          snap.marketPoints['1X2'] === 3 &&
          snap.marketPoints['CORRECT_SCORE'] === 6 &&
          snap.marketPoints['OVER_UNDER_2_5'] === 2 &&
          snap.marketPoints['BTTS'] === 1 &&
          snap.marketPoints['DOUBLE_CHANCE'] === 1 &&
          snap.maxPointsPerMatch === 13 &&
          snap.totalPossiblePoints === 13
        );

        record(
          'T18-SNAPSHOT-01',
          'Publishing Competition Freezes Immutable Scoring Snapshot with Max Points',
          'RULES_SNAPSHOT',
          passed,
          'Rules snapshot created with marketPoints (13 max pts)',
          `Snapshot market points: 1X2=${snap?.marketPoints?.['1X2']}, CS=${snap?.marketPoints?.['CORRECT_SCORE']}, maxPointsPerMatch=${snap?.maxPointsPerMatch}`,
          passed ? 'Snapshot is immutable and accurately calculated at publish time' : 'Snapshot initialization failed',
          t0
        );
      }

      {
        const t0 = Date.now();
        const admin = createTestUser('SUPER_ADMIN');

        // Create competition A
        const fixture = createTestFixture(`fix_t18_iso_${Date.now()}`, 'Liverpool', 'Man City', 'Premier League');

        const compA = createTestComp({
          title: `Isolation Test Comp A ${Date.now()}`,
          entryFeeETB: 50,
          prizePoolETB: 500,
          maxPlayers: 10,
          currentPlayers: 0,
          status: 'DRAFT',
          enabledMarkets: ['1X2', 'CORRECT_SCORE'],
          matches: [
            {
              id: fixture.id,
              fixtureId: fixture.id,
              competitionId: 'temp_comp_a',
              homeTeam: { name: 'Liverpool', code: 'LIV' },
              awayTeam: { name: 'Man City', code: 'MCI' },
              kickoffTime: fixture.kickoffTime,
              status: 'SCHEDULED',
              league: 'Premier League',
              country: 'England',
              markets: []
            }
          ]
        });

        const pubA = db.publishCompetition(compA.id, admin.id);
        const snapAPointsBefore = pubA.competition.rulesSnapshot?.marketPoints?.['CORRECT_SCORE'];

        // Now modify global scoring config (e.g. set Correct Score to 10 points for future competitions)
        db.updateGlobalScoringConfig({
          markets: {
            CORRECT_SCORE: { points: 10, isEnabled: true }
          }
        }, admin.id);

        // Verify compA snapshot is UNCHANGED (still 6)
        const reloadedCompA = db.getCompetitionById(compA.id);
        const snapAPointsAfter = reloadedCompA?.rulesSnapshot?.marketPoints?.['CORRECT_SCORE'];

        // Reset global config back to 6
        db.updateGlobalScoringConfig({
          markets: {
            CORRECT_SCORE: { points: 6, isEnabled: true }
          }
        }, admin.id);

        const passed = snapAPointsBefore === 6 && snapAPointsAfter === 6;
        record(
          'T18-SNAPSHOT-02',
          'Historical / Published Competitions Are Fully Isolated from Global Config Updates',
          'RULES_SNAPSHOT',
          passed,
          'Snapshot CS points remains 6 after global config updated to 10',
          `Before=${snapAPointsBefore}, After global update=${snapAPointsAfter}`,
          passed ? 'Snapshot is completely isolated and historical integrity is strictly preserved' : 'Snapshot was mutated by global config change',
          t0
        );
      }

      // ==========================================
      // CATEGORY 6: DETERMINISTIC TIE-BREAKING LEADERBOARD
      // ==========================================
      {
        const t0 = Date.now();

        // Entry A: 12 total points, 6 CS points (1 exact CS), 4 correct markets
        const entryA: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pA',
          userId: 'uA',
          userName: 'Player A',
          totalPoints: 12,
          correctScorePoints: 6,
          correctCount: 4,
          exactCorrectScores: 1,
          correctPredictions: 4,
          totalScoredPredictions: 5,
          totalMatches: 2,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:00:00Z'
        };

        // Entry B: 12 total points, 0 CS points (0 exact CS), 5 correct markets (won via 1X2 + OU)
        const entryB: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pB',
          userId: 'uB',
          userName: 'Player B',
          totalPoints: 12,
          correctScorePoints: 0,
          correctCount: 5,
          exactCorrectScores: 0,
          correctPredictions: 5,
          totalScoredPredictions: 5,
          totalMatches: 2,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:00:00Z'
        };

        // Entry A must beat Entry B because CS Points (6) > CS Points (0)
        const cmpAB = compareLeaderboardEntries(entryA, entryB);
        const passed = cmpAB < 0; // Negative means A comes before B (higher rank)

        record(
          'T18-TIE-01',
          'Tie-Breaker Hierarchy: Total Points Tied -> Correct Score Points Wins',
          'TIE_BREAKING',
          passed,
          'Entry A with 6 CS points ranks higher than Entry B with 0 CS points (same 12 total pts)',
          `compareLeaderboardEntries(A, B) = ${cmpAB} (< 0 means A ranks higher)`,
          passed ? 'Higher Correct Score points successfully breaks tie' : 'Tie-breaker failed on CS points',
          t0
        );
      }

      {
        const t0 = Date.now();

        // Entry C: 9 total points, 0 CS points, 4 correct markets, 0 exact CS
        const entryC: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pC',
          userId: 'uC',
          userName: 'Player C',
          totalPoints: 9,
          correctScorePoints: 0,
          correctCount: 4,
          exactCorrectScores: 0,
          correctPredictions: 4,
          totalScoredPredictions: 5,
          totalMatches: 3,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:00:00Z'
        };

        // Entry D: 9 total points, 0 CS points, 3 correct markets, 0 exact CS
        const entryD: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pD',
          userId: 'uD',
          userName: 'Player D',
          totalPoints: 9,
          correctScorePoints: 0,
          correctCount: 3,
          exactCorrectScores: 0,
          correctPredictions: 3,
          totalScoredPredictions: 5,
          totalMatches: 3,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:00:00Z'
        };

        // Entry C must beat Entry D because correctCount (4) > correctCount (3)
        const cmpCD = compareLeaderboardEntries(entryC, entryD);
        const passed = cmpCD < 0;

        record(
          'T18-TIE-02',
          'Tie-Breaker Hierarchy: CS Points Tied -> Total Correct Markets Count Wins',
          'TIE_BREAKING',
          passed,
          'Entry C with 4 correct markets ranks higher than Entry D with 3 correct markets (same 9 pts)',
          `compareLeaderboardEntries(C, D) = ${cmpCD}`,
          passed ? 'Total correct markets count successfully breaks tie' : 'Tie-breaker failed on correct count',
          t0
        );
      }

      {
        const t0 = Date.now();

        // Entry E & F: Exactly identical in all tie-breaker criteria
        const entryE: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pE',
          userId: 'user_alpha',
          userName: 'Alpha',
          totalPoints: 10,
          correctScorePoints: 6,
          correctCount: 3,
          exactCorrectScores: 1,
          correctPredictions: 3,
          totalScoredPredictions: 5,
          totalMatches: 2,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:00:00Z'
        };

        const entryF: CompetitionLeaderboardEntry = {
          rank: 0,
          predictionId: 'pF',
          userId: 'user_beta',
          userName: 'Beta',
          totalPoints: 10,
          correctScorePoints: 6,
          correctCount: 3,
          exactCorrectScores: 1,
          correctPredictions: 3,
          totalScoredPredictions: 5,
          totalMatches: 2,
          joinedAt: '2026-09-08T00:00:00Z',
          finalSubmissionTimestamp: '2026-09-08T00:05:00Z' // different submission time!
        };

        const isTied = areLeaderboardEntriesTied(entryE, entryF);
        const cmpEF = compareLeaderboardEntries(entryE, entryF);

        // Must be a true tie (cmpEF === 0 and isTied === true) regardless of submission time
        const passed = isTied && cmpEF === 0;

        record(
          'T18-TIE-03',
          'True Tie Detection: Submission Time Ignored as Arbitrary Tie-Breaker',
          'TIE_BREAKING',
          passed,
          'Identical scores recognized as true tie (areLeaderboardEntriesTied = true)',
          `isTied=${isTied}, compare=${cmpEF}`,
          passed ? 'True ties are properly recognized without penalizing submission timestamp' : 'Submission time leaked into tie-breaker',
          t0
        );
      }

      // ==========================================
      // CATEGORY 7: END-TO-END COMPETITION SCORING & LEADERBOARD
      // ==========================================
      {
        const t0 = Date.now();
        const admin = createTestUser('SUPER_ADMIN');
        const player1 = createTestUser('PLAYER');
        const player2 = createTestUser('PLAYER');

        const fixE2E = createTestFixture(`fix_t18_e2e_${Date.now()}`, 'Real Madrid', 'Barcelona', 'La Liga');

        const compE2E = createTestComp({
          title: `End-to-End Scoring Test ${Date.now()}`,
          entryFeeETB: 0,
          prizePoolETB: 500,
          maxPlayers: 10,
          currentPlayers: 0,
          status: 'DRAFT',
          enabledMarkets: ['1X2', 'CORRECT_SCORE', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE'],
          matches: [
            {
              id: fixE2E.id,
              fixtureId: fixE2E.id,
              competitionId: 'temp_comp_e2e',
              homeTeam: { name: 'Real Madrid', code: 'RMA' },
              awayTeam: { name: 'Barcelona', code: 'BAR' },
              kickoffTime: fixE2E.kickoffTime,
              status: 'SCHEDULED',
              league: 'La Liga',
              country: 'Spain',
              markets: []
            }
          ]
        });

        db.publishCompetition(compE2E.id, admin.id);

        // Player 1 predicts: 1X2 "1" (3 pts), CS "2-1" (6 pts), OU "OVER" (2 pts), BTTS "YES" (1 pt), DC "1X" (1 pt) -> 13 total pts
        const sub1: FinalPredictionSubmission = {
          id: `sub_p1_${Date.now()}`,
          submissionId: `sub_p1_${Date.now()}`,
          userId: player1.id,
          userName: player1.name,
          competitionId: compE2E.id,
          competitionTitle: compE2E.title,
          submittedAt: new Date().toISOString(),
          submissionStatus: 'SUBMITTED',
          predictions: [
            { fixtureId: fixE2E.id, marketType: '1X2', selection: '1', pointsMultiplier: 3, serverCalculatedPoints: 3 },
            { fixtureId: fixE2E.id, marketType: 'CORRECT_SCORE', selection: '2-1', pointsMultiplier: 6, serverCalculatedPoints: 6 },
            { fixtureId: fixE2E.id, marketType: 'OVER_UNDER_2_5', selection: 'OVER', pointsMultiplier: 2, serverCalculatedPoints: 2 },
            { fixtureId: fixE2E.id, marketType: 'BTTS', selection: 'YES', pointsMultiplier: 1, serverCalculatedPoints: 1 },
            { fixtureId: fixE2E.id, marketType: 'DOUBLE_CHANCE', selection: '1X', pointsMultiplier: 1, serverCalculatedPoints: 1 }
          ],
          totalPossiblePoints: 13,
          predictionCount: 5,
          lockedPredictionCount: 5
        };
        db.createFinalSubmission(sub1);

        // Player 2 predicts: 1X2 "1" (3 pts), CS "1-0" (0 pts), OU "UNDER" (0 pts), BTTS "NO" (0 pts), DC "1X" (1 pt) -> 4 total pts
        const sub2: FinalPredictionSubmission = {
          id: `sub_p2_${Date.now()}`,
          submissionId: `sub_p2_${Date.now()}`,
          userId: player2.id,
          userName: player2.name,
          competitionId: compE2E.id,
          competitionTitle: compE2E.title,
          submittedAt: new Date().toISOString(),
          submissionStatus: 'SUBMITTED',
          predictions: [
            { fixtureId: fixE2E.id, marketType: '1X2', selection: '1', pointsMultiplier: 3, serverCalculatedPoints: 3 },
            { fixtureId: fixE2E.id, marketType: 'CORRECT_SCORE', selection: '1-0', pointsMultiplier: 6, serverCalculatedPoints: 6 },
            { fixtureId: fixE2E.id, marketType: 'OVER_UNDER_2_5', selection: 'UNDER', pointsMultiplier: 2, serverCalculatedPoints: 2 },
            { fixtureId: fixE2E.id, marketType: 'BTTS', selection: 'NO', pointsMultiplier: 1, serverCalculatedPoints: 1 },
            { fixtureId: fixE2E.id, marketType: 'DOUBLE_CHANCE', selection: '1X', pointsMultiplier: 1, serverCalculatedPoints: 1 }
          ],
          totalPossiblePoints: 13,
          predictionCount: 5,
          lockedPredictionCount: 5
        };
        db.createFinalSubmission(sub2);

        // Finalize official result: Real Madrid 2 - 1 Barcelona
        db.saveOfficialResult({
          id: `res_${fixE2E.id}`,
          fixtureId: fixE2E.id,
          homeScore: 2,
          awayScore: 1,
          status: 'FINISHED',
          submittedBy: admin.id,
          submittedAt: new Date().toISOString(),
          finalizedAt: new Date().toISOString(),
          isFinalized: true,
          version: 1
        });

        // Run competition scoring
        const scoreRes = db.scoreCompetition(compE2E.id);
        const lb = scoreRes.leaderboard;

        const p1Entry = lb.find(e => e.userId === player1.id);
        const p2Entry = lb.find(e => e.userId === player2.id);

        const passed = Boolean(
          scoreRes.success &&
          p1Entry && p1Entry.totalPoints === 13 && p1Entry.rank === 1 && p1Entry.correctScorePoints === 6 &&
          p2Entry && p2Entry.totalPoints === 4 && p2Entry.rank === 2 && p2Entry.correctScorePoints === 0
        );

        record(
          'T18-E2E-01',
          'End-to-End Prediction Submission, Official Result & Leaderboard Scoring',
          'END_TO_END',
          passed,
          'Player 1 scores 13 pts (Rank 1), Player 2 scores 4 pts (Rank 2)',
          `Player 1: ${p1Entry?.totalPoints} pts (Rank ${p1Entry?.rank}), Player 2: ${p2Entry?.totalPoints} pts (Rank ${p2Entry?.rank})`,
          passed ? 'End-to-end competition scoring executed flawlessly' : 'End-to-end scoring mismatch',
          t0
        );
      }

      // ==========================================
      // CATEGORY 8: PREDICTION PROGRESS & MAX POINTS
      // ==========================================
      {
        const t0 = Date.now();
        const admin = createTestUser('SUPER_ADMIN');
        const player = createTestUser('PLAYER');

        const fix1 = createTestFixture(`fix_t18_prog1_${Date.now()}`, 'Milan', 'Inter', 'Serie A');
        const fix2 = createTestFixture(`fix_t18_prog2_${Date.now()}`, 'Juventus', 'Roma', 'Serie A');

        const compProg = createTestComp({
          title: `Progress Scoring Test ${Date.now()}`,
          entryFeeETB: 0,
          prizePoolETB: 100,
          maxPlayers: 10,
          currentPlayers: 0,
          status: 'DRAFT',
          enabledMarkets: ['1X2', 'CORRECT_SCORE', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE'],
          matches: [
            {
              id: fix1.id,
              fixtureId: fix1.id,
              competitionId: 'temp_prog',
              homeTeam: { name: 'Milan', code: 'MIL' },
              awayTeam: { name: 'Inter', code: 'INT' },
              kickoffTime: fix1.kickoffTime,
              status: 'SCHEDULED',
              league: 'Serie A',
              country: 'Italy',
              markets: []
            },
            {
              id: fix2.id,
              fixtureId: fix2.id,
              competitionId: 'temp_prog',
              homeTeam: { name: 'Juventus', code: 'JUV' },
              awayTeam: { name: 'Roma', code: 'ROM' },
              kickoffTime: fix2.kickoffTime,
              status: 'SCHEDULED',
              league: 'Serie A',
              country: 'Italy',
              markets: []
            }
          ]
        });

        db.publishCompetition(compProg.id, admin.id);

        // Draft 3 markets for fix1: 1X2 (3), CS (6), BTTS (1) = 10 pts
        db.upsertDraftPrediction({
          id: `draft_${player.id}_${compProg.id}_${fix1.id}_1X2`,
          userId: player.id,
          userName: player.name,
          competitionId: compProg.id,
          fixtureId: fix1.id,
          matchTitle: 'Milan vs Inter',
          marketType: '1X2',
          marketName: 'Match Result',
          selection: '1',
          optionLabel: 'Home Win',
          pointsMultiplier: 3,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        db.upsertDraftPrediction({
          id: `draft_${player.id}_${compProg.id}_${fix1.id}_CORRECT_SCORE`,
          userId: player.id,
          userName: player.name,
          competitionId: compProg.id,
          fixtureId: fix1.id,
          matchTitle: 'Milan vs Inter',
          marketType: 'CORRECT_SCORE',
          marketName: 'Correct Score',
          selection: '2-1',
          optionLabel: '2-1',
          pointsMultiplier: 6,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        db.upsertDraftPrediction({
          id: `draft_${player.id}_${compProg.id}_${fix1.id}_BTTS`,
          userId: player.id,
          userName: player.name,
          competitionId: compProg.id,
          fixtureId: fix1.id,
          matchTitle: 'Milan vs Inter',
          marketType: 'BTTS',
          marketName: 'Both Teams To Score',
          selection: 'YES',
          optionLabel: 'Yes',
          pointsMultiplier: 1,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const progress = db.calculatePredictionProgress(player.id, compProg.id);
        const passed = Boolean(
          progress.totalFixtures === 2 &&
          progress.totalMarkets === 10 &&
          progress.completedMarkets === 3 &&
          progress.maxPossiblePoints === 26 &&
          progress.currentSelectedPoints === 10
        );

        record(
          'T18-PROG-01',
          'Prediction Progress Returns Exact Counts, Max Possible & Selected Points',
          'PREDICTION_PROGRESS',
          passed,
          'totalFixtures=2, totalMarkets=10, completedMarkets=3, maxPossiblePoints=26, currentSelectedPoints=10',
          `totalFixtures=${progress.totalFixtures}, totalMarkets=${progress.totalMarkets}, completedMarkets=${progress.completedMarkets}, maxPoints=${progress.maxPossiblePoints}, selectedPoints=${progress.currentSelectedPoints}`,
          passed ? 'Prediction progress tracks exact authoritative counts and points dynamically' : 'Progress calculation mismatch',
          t0
        );
      }

      // ==========================================
      // SUMMARY
      // ==========================================
      const passedCount = tests.filter(t => t.passed).length;
      const totalCount = tests.length;
      const passPercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
      const durationMs = Date.now() - startTime;

      return {
        success: passedCount === totalCount,
        passedCount,
        totalCount,
        passPercentage,
        durationMs,
        results: tests
      };
    } finally {
      db.exitSandbox();
    }
  }
}
