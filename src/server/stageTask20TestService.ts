import {
  db,
  FIXED_MARKET_POINTS,
  compareLeaderboardEntries,
  areLeaderboardEntriesTied
} from './db.js';
import {
  Competition,
  CompetitionLeaderboardEntry,
  CompetitionRulesSnapshot,
  CompetitionSettlement,
  User,
  WalletTransaction,
  MarketType
} from '../types.js';

export interface Task20TieBreakingTestResult {
  id: string;
  section: number;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Task20TieBreakingSuiteResponse {
  success: boolean;
  stage: string;
  timestamp: string;
  durationMs: number;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  results: Task20TieBreakingTestResult[];
}

export class StageTask20TestService {
  /**
   * Helper: create isolated test users with exact balances
   */
  private static createTestUser(prefix: string, index: number, initialBalanceETB: number = 0): User {
    const padded = String(index).padStart(4, '0');
    const id = `u_t20_${prefix}_${padded}`;
    const name = `T20 Player ${prefix} ${index}`;
    const phone = `+25197${String(Math.floor(1000000 + Math.random() * 8999999))}`;
    
    let user = db.getUserById(id);
    if (!user) {
      user = db.createUser({
        id,
        name,
        phone,
        role: 'PLAYER',
        balanceETB: initialBalanceETB,
        pendingBalanceETB: 0,
        kycStatus: 'VERIFIED'
      } as any, 'mock_hash');
    } else {
      db.updateUser(id, { balanceETB: initialBalanceETB, pendingBalanceETB: 0 });
      user = db.getUserById(id)!;
    }
    return user;
  }

  /**
   * Helper: create an isolated finished competition ready for scoring and settlement
   */
  private static createFinishedCompetition(
    id: string,
    title: string,
    entryFeeETB: number,
    prizePoolETB: number,
    rulesSnapshot?: CompetitionRulesSnapshot
  ): Competition {
    const defaultMarketPoints: Record<MarketType, number> = {
      '1X2': 3,
      'OVER_UNDER_1_5': 0,
      'OVER_UNDER_2_5': 2,
      'BTTS': 1,
      'DOUBLE_CHANCE': 1,
      'CORRECT_SCORE': 6,
      'DRAW_NO_BET': 0,
      'ODD_EVEN': 0,
      'HALF_TIME_RESULT': 0,
      'HALF_TIME_FULL_TIME': 0
    };

    const snapshot: CompetitionRulesSnapshot = rulesSnapshot || {
      version: '2.0',
      capturedAt: new Date().toISOString(),
      marketPoints: defaultMarketPoints,
      enabledMarkets: ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE'],
      scoringVersion: '2.0'
    };

    const comp: Competition = {
      id,
      title,
      description: `Task 20 Acceptance Test Competition ${id}`,
      type: 'STANDARD',
      entryFeeETB,
      prizePoolETB,
      league: 'Premier League',
      country: 'England',
      currentPlayers: 0,
      maxPlayers: 1000,
      startDate: new Date(Date.now() - 7200000).toISOString(),
      endDate: new Date(Date.now() - 3600000).toISOString(),
      registrationDeadline: new Date(Date.now() - 7200000).toISOString(),
      featured: false,
      rules: [],
      status: 'FINISHED',
      rulesSnapshot: snapshot,
      matches: [
        {
          id: `m_${id}_1`,
          competitionId: id,
          league: 'Premier League',
          country: 'England',
          homeTeam: { name: 'Arsenal', code: 'ARS' },
          awayTeam: { name: 'Chelsea', code: 'CHE' },
          kickoffTime: new Date(Date.now() - 7200000).toISOString(),
          status: 'FINISHED',
          markets: [],
          score: { home: 2, away: 1 }
        }
      ]
    };

    // Remove any previous existing settlement or test data
    if ((db as any).data.competitions) {
      (db as any).data.competitions = (db as any).data.competitions.filter((c: any) => c.id !== id);
      (db as any).data.competitions.push(comp);
    }
    if ((db as any).data.settlements) {
      (db as any).data.settlements = (db as any).data.settlements.filter((s: any) => s.competitionId !== id);
    }
    if ((db as any).data.predictions) {
      (db as any).data.predictions = (db as any).data.predictions.filter((p: any) => p.competitionId !== id);
    }

    return comp;
  }

  /**
   * Run the full Task 20 Authoritative Tie-Breaking, Ranking, and Mass-Tie Prize Distribution Suite
   */
  public static async runAcceptanceSuite(): Promise<Task20TieBreakingSuiteResponse> {
    const startTime = Date.now();
    const results: Task20TieBreakingTestResult[] = [];

    const runTest = async (
      id: string,
      section: number,
      category: string,
      name: string,
      fn: () => Promise<{ passed: boolean; expected: string; actual: string; details: string }>
    ) => {
      const t0 = Date.now();
      try {
        const res = await fn();
        results.push({
          id,
          section,
          category,
          name,
          status: res.passed ? 'PASS' : 'FAIL',
          passed: res.passed,
          expected: res.expected,
          actual: res.actual,
          details: res.details,
          durationMs: Date.now() - t0
        });
      } catch (err: any) {
        results.push({
          id,
          section,
          category,
          name,
          status: 'FAIL',
          passed: false,
          expected: 'Test should execute without uncaught exception',
          actual: `Uncaught exception: ${err.message}`,
          details: err.stack || err.message,
          durationMs: Date.now() - t0
        });
      }
    };

    // =========================================================================
    // T20-TIE-01: No tie — distinct ranks 1 to 5
    // =========================================================================
    await runTest(
      'T20-TIE-01',
      1,
      'RANKING_HIERARCHY',
      'No tie — 5 players with distinct scores receive ranks 1 through 5 with standard prize basis points',
      async () => {
        const compId = 'comp_t20_01_no_tie';
        const comp = this.createFinishedCompetition(compId, 'T20 No Tie Test', 0, 5000);

        const players = [
          { index: 1, totalPoints: 50, csPoints: 18, correct: 10, exactCS: 3 },
          { index: 2, totalPoints: 40, csPoints: 12, correct: 8, exactCS: 2 },
          { index: 3, totalPoints: 30, csPoints: 12, correct: 7, exactCS: 2 },
          { index: 4, totalPoints: 20, csPoints: 6, correct: 5, exactCS: 1 },
          { index: 5, totalPoints: 10, csPoints: 0, correct: 4, exactCS: 0 }
        ];

        players.forEach(p => {
          const u = this.createTestUser('01', p.index, 100);
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: p.totalPoints,
            correctScorePoints: p.csPoints,
            correctPredictions: p.correct,
            exactCorrectScores: p.exactCS,
            totalScoredPredictions: 5,
            submittedAt: new Date().toISOString()
          });
          // Ledger entry fee
          (db as any).data.transactions.push({
            id: `tx_entry_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            type: 'COMPETITION_ENTRY',
            direction: 'DEBIT',
            amountETB: 100,
            status: 'COMPLETED',
            referenceId: compId,
            createdAt: new Date().toISOString()
          });
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const ranks = lb.map(e => e.rank);
        const hasTies = lb.some(e => e.isTie);

        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        const passed = 
          ranks[0] === 1 && ranks[1] === 2 && ranks[2] === 3 && ranks[3] === 4 && ranks[4] === 5 &&
          !hasTies &&
          s.prizeAllocations.length === 5 &&
          s.prizeAllocations[0].amountETB === 1875 && // 37.5% of 5000 ETB
          s.prizeAllocations[1].amountETB === 937.5 && // 18.75% of 5000 ETB
          s.prizeAllocations[2].amountETB === 450 &&   // 9% of 5000 ETB
          s.prizeAllocations[3].amountETB === 300 &&   // 6% of 5000 ETB
          s.prizeAllocations[4].amountETB === 187.5;  // 3.75% of 5000 ETB

        return {
          passed,
          expected: 'Ranks 1,2,3,4,5 with exact payouts 1875, 937.50, 450, 300, 187.50 ETB and 0 ties',
          actual: `Ranks: [${ranks.join(', ')}], Payouts: [${s.prizeAllocations.map(p => p.amountETB).join(', ')}], HasTies: ${hasTies}`,
          details: `House: ${s.houseShareETB} ETB, Total Prize: ${s.totalPrizePool} ETB, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-02: Two players tied on Total Points, separated by CS Points (Criteria 2)
    // =========================================================================
    await runTest(
      'T20-TIE-02',
      1,
      'RANKING_HIERARCHY',
      'Separated by Correct Score Points (Criteria 2) — Player with more CS points gets higher rank',
      async () => {
        const compId = 'comp_t20_02_cs_points';
        this.createFinishedCompetition(compId, 'T20 CS Points Test', 100, 2000);

        // Player A: 30 pts, 18 CS pts (3 * 6), 5 correct, 3 exact CS
        // Player B: 30 pts, 12 CS pts (2 * 6), 7 correct, 2 exact CS (more correct markets, but lower CS pts)
        const uA = this.createTestUser('02', 1, 100);
        const uB = this.createTestUser('02', 2, 100);

        const entryA: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uA.id,
          userName: uA.name,
          totalPoints: 30,
          correctScorePoints: 18,
          correctPredictions: 5,
          exactCorrectScores: 3,
          totalScoredPredictions: 5
        };

        const entryB: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uB.id,
          userName: uB.name,
          totalPoints: 30,
          correctScorePoints: 12,
          correctPredictions: 7,
          exactCorrectScores: 2,
          totalScoredPredictions: 5
        };

        const cmp = compareLeaderboardEntries(entryA, entryB);
        const tied = areLeaderboardEntriesTied(entryA, entryB);

        // entryA should win (cmp < 0)
        const passed = cmp < 0 && !tied;

        return {
          passed,
          expected: 'Player A ranked higher than Player B due to higher CS points (18 > 12), not tied',
          actual: `Comparison cmp: ${cmp}, Tied: ${tied}`,
          details: `Player A (30 pts, 18 CS pts, 5 correct) vs Player B (30 pts, 12 CS pts, 7 correct)`
        };
      }
    );

    // =========================================================================
    // T20-TIE-03: Two players tied on Total Points and CS Points, separated by Correct Markets (Criteria 3)
    // =========================================================================
    await runTest(
      'T20-TIE-03',
      1,
      'RANKING_HIERARCHY',
      'Separated by Total Correct Markets (Criteria 3) — Player with more correct markets gets higher rank',
      async () => {
        const uA = this.createTestUser('03', 1, 100);
        const uB = this.createTestUser('03', 2, 100);

        const entryA: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uA.id,
          userName: uA.name,
          totalPoints: 30,
          correctScorePoints: 18,
          correctPredictions: 8,
          exactCorrectScores: 3,
          totalScoredPredictions: 10
        };

        const entryB: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uB.id,
          userName: uB.name,
          totalPoints: 30,
          correctScorePoints: 18,
          correctPredictions: 6,
          exactCorrectScores: 3,
          totalScoredPredictions: 10
        };

        const cmp = compareLeaderboardEntries(entryA, entryB);
        const tied = areLeaderboardEntriesTied(entryA, entryB);

        const passed = cmp < 0 && !tied;

        return {
          passed,
          expected: 'Player A ranked higher than Player B due to higher Total Correct Markets (8 > 6)',
          actual: `Comparison cmp: ${cmp}, Tied: ${tied}`,
          details: `Both 30 pts & 18 CS pts: Player A (8 correct) vs Player B (6 correct)`
        };
      }
    );

    // =========================================================================
    // T20-TIE-04: Separated by Exact Correct Scores Count (Criteria 4)
    // =========================================================================
    await runTest(
      'T20-TIE-04',
      1,
      'RANKING_HIERARCHY',
      'Separated by Exact Correct Scores Count (Criteria 4) — Player with more exact CS count gets higher rank',
      async () => {
        const uA = this.createTestUser('04', 1, 100);
        const uB = this.createTestUser('04', 2, 100);

        const entryA: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uA.id,
          userName: uA.name,
          totalPoints: 30,
          correctScorePoints: 18,
          correctPredictions: 8,
          exactCorrectScores: 4,
          totalScoredPredictions: 10
        };

        const entryB: CompetitionLeaderboardEntry = {
          rank: 0,
          userId: uB.id,
          userName: uB.name,
          totalPoints: 30,
          correctScorePoints: 18,
          correctPredictions: 8,
          exactCorrectScores: 3,
          totalScoredPredictions: 10
        };

        const cmp = compareLeaderboardEntries(entryA, entryB);
        const tied = areLeaderboardEntriesTied(entryA, entryB);

        const passed = cmp < 0 && !tied;

        return {
          passed,
          expected: 'Player A ranked higher than Player B due to higher Exact CS Count (4 > 3)',
          actual: `Comparison cmp: ${cmp}, Tied: ${tied}`,
          details: `Both 30 pts, 18 CS pts, 8 correct: Player A (4 exact CS) vs Player B (3 exact CS)`
        };
      }
    );

    // =========================================================================
    // T20-TIE-05: True 2-Player Tie for Rank 1
    // =========================================================================
    await runTest(
      'T20-TIE-05',
      2,
      'TRUE_TIE_SETTLEMENT',
      'True 2-player tie for Rank 1 — both receive Rank 1, pool Rank 1 + Rank 2, 50/50 equal division',
      async () => {
        const compId = 'comp_t20_05_true_2tie';
        this.createFinishedCompetition(compId, 'T20 True 2-Tie Test', 0, 5000);

        // 2 players identical on all 4 criteria, 3rd player lower, 4th and 5th complete 5 positions
        const uA = this.createTestUser('05', 1, 0);
        const uB = this.createTestUser('05', 2, 0);
        const uC = this.createTestUser('05', 3, 0);
        const uD = this.createTestUser('05', 4, 0);
        const uE = this.createTestUser('05', 5, 0);

        [uA, uB].forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 45,
            correctScorePoints: 18,
            correctPredictions: 9,
            exactCorrectScores: 3,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${uC.id}`,
          userId: uC.id,
          userName: uC.name,
          competitionId: compId,
          totalPoints: 30,
          correctScorePoints: 12,
          correctPredictions: 6,
          exactCorrectScores: 2,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${uD.id}`,
          userId: uD.id,
          userName: uD.name,
          competitionId: compId,
          totalPoints: 20,
          correctScorePoints: 6,
          correctPredictions: 5,
          exactCorrectScores: 1,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${uE.id}`,
          userId: uE.id,
          userName: uE.name,
          competitionId: compId,
          totalPoints: 10,
          correctScorePoints: 0,
          correctPredictions: 4,
          exactCorrectScores: 0,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Rank 1 (1875 ETB) + Rank 2 (937.50 ETB) = 2812.50 ETB pooled
        // 2812.50 / 2 = 1406.25 ETB each
        const p1 = s.prizeAllocations.find(p => p.userId === uA.id);
        const p2 = s.prizeAllocations.find(p => p.userId === uB.id);
        const p3 = s.prizeAllocations.find(p => p.userId === uC.id);

        const passed = 
          lb[0].rank === 1 && lb[1].rank === 1 && lb[2].rank === 3 &&
          lb[0].isTie === true && lb[1].isTie === true &&
          p1 !== undefined && p2 !== undefined &&
          p1.amountETB === 1406.25 &&
          p2.amountETB === 1406.25 &&
          p3?.amountETB === 450 && // Rank 3 keeps Rank 3 prize (450 ETB)
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'Both tied players receive Rank 1, 1406.25 ETB each (pooled Rank 1+2), Rank 3 receives 450 ETB',
          actual: `P1: Rank ${p1?.rank}, ${p1?.amountETB} ETB | P2: Rank ${p2?.rank}, ${p2?.amountETB} ETB | P3: Rank ${p3?.rank}, ${p3?.amountETB} ETB`,
          details: `Tie group size: 2, pooled positions: [1, 2], reconciliation: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-06: True 3-Player Tie for Rank 1
    // =========================================================================
    await runTest(
      'T20-TIE-06',
      2,
      'TRUE_TIE_SETTLEMENT',
      'True 3-player tie for Rank 1 — all 3 receive Rank 1, pool Ranks 1+2+3, next player is Rank 4',
      async () => {
        const compId = 'comp_t20_06_true_3tie';
        this.createFinishedCompetition(compId, 'T20 True 3-Tie Test', 0, 5000);

        const users = [1, 2, 3].map(i => this.createTestUser('06', i, 0));
        const u4 = this.createTestUser('06', 4, 0);
        const u5 = this.createTestUser('06', 5, 0);

        users.forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 45,
            correctScorePoints: 18,
            correctPredictions: 9,
            exactCorrectScores: 3,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${u4.id}`,
          userId: u4.id,
          userName: u4.name,
          competitionId: compId,
          totalPoints: 20,
          correctScorePoints: 6,
          correctPredictions: 5,
          exactCorrectScores: 1,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${u5.id}`,
          userId: u5.id,
          userName: u5.name,
          competitionId: compId,
          totalPoints: 10,
          correctScorePoints: 0,
          correctPredictions: 4,
          exactCorrectScores: 0,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Pool: Rank 1 (1875) + Rank 2 (937.50) + Rank 3 (450) = 3262.50 ETB (326,250 minor units)
        // 326,250 / 3 = 108,750 minor units = 1087.50 ETB each
        const tiedAllocations = s.prizeAllocations.filter(p => users.some(u => u.id === p.userId));
        const p4 = s.prizeAllocations.find(p => p.userId === u4.id);

        const all1087_5 = tiedAllocations.every(p => p.amountETB === 1087.5 && p.rank === 1);
        const passed = 
          lb[0].rank === 1 && lb[1].rank === 1 && lb[2].rank === 1 && lb[3].rank === 4 &&
          all1087_5 &&
          p4?.rank === 4 && p4?.amountETB === 300 && // Rank 4 keeps Rank 4 prize (300 ETB)
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: '3 players receive Rank 1 and 1087.50 ETB each (pooled Ranks 1+2+3 = 3262.50 ETB), next player is Rank 4 with 300 ETB',
          actual: `Tied ranks: [${tiedAllocations.map(p => p.rank).join(',')}], Payouts: [${tiedAllocations.map(p => p.amountETB).join(',')}], P4 Rank: ${p4?.rank}, P4 Payout: ${p4?.amountETB}`,
          details: `Reconciliation discrepancy: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-07: True 10-Player Tie for Rank 1
    // =========================================================================
    await runTest(
      'T20-TIE-07',
      2,
      'MASS_TIE_SETTLEMENT',
      'True 10-player tie for Rank 1 — all 10 receive Rank 1, pool top 5 prize positions (7500 bps), divide equally',
      async () => {
        const compId = 'comp_t20_07_true_10tie';
        this.createFinishedCompetition(compId, 'T20 True 10-Tie Test', 0, 5000);

        const users = Array.from({ length: 10 }, (_, i) => this.createTestUser('07', i + 1, 0));

        users.forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 45,
            correctScorePoints: 18,
            correctPredictions: 9,
            exactCorrectScores: 3,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // 5000 ETB prize pool: Player pool is 75% = 3750.00 ETB (375,000 minor units)
        // 375,000 / 10 = 37,500 minor units = 375.00 ETB each
        const all375 = s.prizeAllocations.every(p => p.amountETB === 375 && p.rank === 1);
        const allRank1 = lb.every(e => e.rank === 1);

        const passed = 
          allRank1 &&
          s.prizeAllocations.length === 10 &&
          all375 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'All 10 players receive Rank 1 and exactly 375.00 ETB each, discrepancy = 0 ETB',
          actual: `All Rank 1: ${allRank1}, Count: ${s.prizeAllocations.length}, Sample payout: ${s.prizeAllocations[0]?.amountETB} ETB, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`,
          details: `Total player payouts: ${s.playerPrizePoolETB} ETB, House: ${s.houseShareETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-08: True 20-Player Tie for Rank 1
    // =========================================================================
    await runTest(
      'T20-TIE-08',
      2,
      'MASS_TIE_SETTLEMENT',
      'True 20-player tie for Rank 1 — all 20 receive Rank 1, pool top 5 prize positions, divide equally',
      async () => {
        const compId = 'comp_t20_08_true_20tie';
        this.createFinishedCompetition(compId, 'T20 True 20-Tie Test', 0, 5000);

        const users = Array.from({ length: 20 }, (_, i) => this.createTestUser('08', i + 1, 0));

        users.forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 45,
            correctScorePoints: 18,
            correctPredictions: 9,
            exactCorrectScores: 3,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // 375,000 minor units / 20 = 18,750 minor units = 187.50 ETB each
        const all187_5 = s.prizeAllocations.every(p => p.amountETB === 187.5 && p.rank === 1);
        const allRank1 = lb.every(e => e.rank === 1);

        const passed = 
          allRank1 &&
          s.prizeAllocations.length === 20 &&
          all187_5 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'All 20 players receive Rank 1 and 187.50 ETB each with zero discrepancy',
          actual: `All Rank 1: ${allRank1}, Count: ${s.prizeAllocations.length}, Sample payout: ${s.prizeAllocations[0]?.amountETB} ETB, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`,
          details: `Total player payouts: ${s.playerPrizePoolETB} ETB, House: ${s.houseShareETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-09: True 100-Player Tie for Rank 1
    // =========================================================================
    await runTest(
      'T20-TIE-09',
      2,
      'MASS_TIE_SETTLEMENT',
      'True 100-player tie for Rank 1 — all 100 receive Rank 1, pool top 5 prize positions, exactly 37.50 ETB each',
      async () => {
        const compId = 'comp_t20_09_true_100tie';
        this.createFinishedCompetition(compId, 'T20 True 100-Tie Test', 0, 5000);

        const users = Array.from({ length: 100 }, (_, i) => this.createTestUser('09', i + 1, 0));

        users.forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 45,
            correctScorePoints: 18,
            correctPredictions: 9,
            exactCorrectScores: 3,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // 375,000 minor units / 100 = 3,750 minor units = 37.50 ETB each
        const all37_5 = s.prizeAllocations.every(p => p.amountETB === 37.5 && p.rank === 1);
        const allRank1 = lb.every(e => e.rank === 1);

        const passed = 
          allRank1 &&
          s.prizeAllocations.length === 100 &&
          all37_5 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'All 100 players receive Rank 1 and exactly 37.50 ETB each, 0.00 ETB discrepancy',
          actual: `All Rank 1: ${allRank1}, Count: ${s.prizeAllocations.length}, Sample payout: ${s.prizeAllocations[0]?.amountETB} ETB, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`,
          details: `Total player payouts: ${s.playerPrizePoolETB} ETB, House: ${s.houseShareETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-10: Two-Way Tie for Rank 2
    // =========================================================================
    await runTest(
      'T20-TIE-10',
      3,
      'PARTIAL_TIE_SETTLEMENT',
      'Two-way tie for Rank 2 — Rank 1 is unique, Ranks 2 & 3 tied (pool Ranks 2+3), next player is Rank 4',
      async () => {
        const compId = 'comp_t20_10_tie_rank2';
        this.createFinishedCompetition(compId, 'T20 Tie Rank 2 Test', 0, 5000);

        const u1 = this.createTestUser('10', 1, 0);
        const u2 = this.createTestUser('10', 2, 0);
        const u3 = this.createTestUser('10', 3, 0);
        const u4 = this.createTestUser('10', 4, 0);
        const u5 = this.createTestUser('10', 5, 0);

        // Player 1: Rank 1
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 50,
          correctScorePoints: 18,
          correctPredictions: 10,
          exactCorrectScores: 3,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // Players 2 & 3: Tied on all 4 criteria
        [u2, u3].forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 40,
            correctScorePoints: 12,
            correctPredictions: 8,
            exactCorrectScores: 2,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        // Player 4: Lower score -> Rank 4
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u4.id}`,
          userId: u4.id,
          userName: u4.name,
          competitionId: compId,
          totalPoints: 30,
          correctScorePoints: 6,
          correctPredictions: 6,
          exactCorrectScores: 1,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // Player 5: Lower score -> Rank 5
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u5.id}`,
          userId: u5.id,
          userName: u5.name,
          competitionId: compId,
          totalPoints: 10,
          correctScorePoints: 0,
          correctPredictions: 4,
          exactCorrectScores: 0,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Pool: Rank 2 (937.50 ETB) + Rank 3 (450 ETB) = 1387.50 ETB (138,750 minor units)
        // 138,750 / 2 = 69,375 minor units = 693.75 ETB each
        const p1 = s.prizeAllocations.find(p => p.userId === u1.id);
        const p2 = s.prizeAllocations.find(p => p.userId === u2.id);
        const p3 = s.prizeAllocations.find(p => p.userId === u3.id);
        const p4 = s.prizeAllocations.find(p => p.userId === u4.id);

        const passed = 
          lb[0].rank === 1 && lb[1].rank === 2 && lb[2].rank === 2 && lb[3].rank === 4 &&
          p1?.amountETB === 1875 &&
          p2?.amountETB === 693.75 &&
          p3?.amountETB === 693.75 &&
          p4?.amountETB === 300 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'Rank 1 = 1875 ETB, Tied Ranks 2 & 3 pool 1387.50 ETB -> 693.75 ETB each, Rank 4 = 300 ETB',
          actual: `P1: ${p1?.amountETB} ETB, P2: ${p2?.amountETB} ETB, P3: ${p3?.amountETB} ETB, P4: ${p4?.amountETB} ETB`,
          details: `Occupied positions for tie group: [2, 3], Reconciliation discrepancy: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-11: Two-Way Tie for Rank 3
    // =========================================================================
    await runTest(
      'T20-TIE-11',
      3,
      'PARTIAL_TIE_SETTLEMENT',
      'Two-way tie for Rank 3 — Ranks 1 & 2 unique, Ranks 3 & 4 tied (pool 450 + 300 = 750 ETB -> 375 ETB each)',
      async () => {
        const compId = 'comp_t20_11_tie_rank3';
        this.createFinishedCompetition(compId, 'T20 Tie Rank 3 Test', 0, 5000);

        const u1 = this.createTestUser('11', 1, 0);
        const u2 = this.createTestUser('11', 2, 0);
        const u3 = this.createTestUser('11', 3, 0);
        const u4 = this.createTestUser('11', 4, 0);
        const u5 = this.createTestUser('11', 5, 0);

        // P1: Rank 1 (50 pts)
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 50,
          correctScorePoints: 18,
          correctPredictions: 10,
          exactCorrectScores: 3,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // P2: Rank 2 (40 pts)
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u2.id}`,
          userId: u2.id,
          userName: u2.name,
          competitionId: compId,
          totalPoints: 40,
          correctScorePoints: 12,
          correctPredictions: 8,
          exactCorrectScores: 2,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // P3 & P4: Tied for Rank 3 (30 pts)
        [u3, u4].forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 30,
            correctScorePoints: 12,
            correctPredictions: 7,
            exactCorrectScores: 2,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        // P5: Rank 5 (20 pts)
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u5.id}`,
          userId: u5.id,
          userName: u5.name,
          competitionId: compId,
          totalPoints: 20,
          correctScorePoints: 6,
          correctPredictions: 5,
          exactCorrectScores: 1,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Pool: Rank 3 (450 ETB) + Rank 4 (300 ETB) = 750 ETB (75,000 minor units)
        // 75,000 / 2 = 37,500 minor units = 375.00 ETB each
        const p3 = s.prizeAllocations.find(p => p.userId === u3.id);
        const p4 = s.prizeAllocations.find(p => p.userId === u4.id);
        const p5 = s.prizeAllocations.find(p => p.userId === u5.id);

        const passed = 
          lb[2].rank === 3 && lb[3].rank === 3 && lb[4].rank === 5 &&
          p3?.amountETB === 375 &&
          p4?.amountETB === 375 &&
          p5?.amountETB === 187.5 && // Rank 5 keeps Rank 5 prize (187.50 ETB)
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'Tied Players 3 & 4 both receive Rank 3 with 375.00 ETB each, Player 5 receives Rank 5 with 187.50 ETB',
          actual: `P3: Rank ${p3?.rank}, ${p3?.amountETB} ETB | P4: Rank ${p4?.rank}, ${p4?.amountETB} ETB | P5: Rank ${p5?.rank}, ${p5?.amountETB} ETB`,
          details: `Occupied positions: [3, 4], Reconciliation discrepancy: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-12: Three-Way Tie for Rank 3
    // =========================================================================
    await runTest(
      'T20-TIE-12',
      3,
      'PARTIAL_TIE_SETTLEMENT',
      'Three-way tie for Rank 3 — Ranks 1 & 2 unique, Ranks 3, 4, 5 tied (pool 450 + 300 + 187.50 = 937.50 ETB -> 312.50 ETB each)',
      async () => {
        const compId = 'comp_t20_12_tie3_rank3';
        this.createFinishedCompetition(compId, 'T20 Tie 3 Rank 3 Test', 0, 5000);

        const u1 = this.createTestUser('12', 1, 0);
        const u2 = this.createTestUser('12', 2, 0);
        const u3 = this.createTestUser('12', 3, 0);
        const u4 = this.createTestUser('12', 4, 0);
        const u5 = this.createTestUser('12', 5, 0);

        // P1: Rank 1
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 50,
          correctScorePoints: 18,
          correctPredictions: 10,
          exactCorrectScores: 3,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // P2: Rank 2
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u2.id}`,
          userId: u2.id,
          userName: u2.name,
          competitionId: compId,
          totalPoints: 40,
          correctScorePoints: 12,
          correctPredictions: 8,
          exactCorrectScores: 2,
          totalScoredPredictions: 10,
          submittedAt: new Date().toISOString()
        });

        // P3, P4, P5: 3-way tie for Rank 3
        [u3, u4, u5].forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 30,
            correctScorePoints: 12,
            correctPredictions: 7,
            exactCorrectScores: 2,
            totalScoredPredictions: 10,
            submittedAt: new Date().toISOString()
          });
        });

        const lb = db.getCompetitionLeaderboard(compId);
        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Pool: Rank 3 (450) + Rank 4 (300) + Rank 5 (187.50) = 937.50 ETB (93,750 minor units)
        // 93,750 / 3 = 31,250 minor units = 312.50 ETB each
        const tiedR3 = s.prizeAllocations.filter(p => [u3.id, u4.id, u5.id].includes(p.userId));
        const all312_5 = tiedR3.every(p => p.amountETB === 312.5 && p.rank === 3);

        const passed = 
          lb[2].rank === 3 && lb[3].rank === 3 && lb[4].rank === 3 &&
          all312_5 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'All 3 tied players receive Rank 3 and 312.50 ETB each (pooled 937.50 ETB / 3)',
          actual: `Ranks: [${tiedR3.map(p => p.rank).join(',')}], Payouts: [${tiedR3.map(p => p.amountETB).join(',')}], Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`,
          details: `Occupied positions: [3, 4, 5], Reconciliation discrepancy: ${s.reconciliationDiscrepancyETB} ETB`
        };
      }
    );

    // =========================================================================
    // T20-TIE-13: Indivisible Minor-Unit Remainder Distribution
    // =========================================================================
    await runTest(
      'T20-TIE-13',
      4,
      'FINANCIAL_INVARIANTS',
      'Indivisible minor-unit remainder — distributed 1 minor unit at a time to first remainder players by userId ASC',
      async () => {
        // Create competition where pool leads to an indivisible minor unit remainder
        // Total collected = 100.01 ETB (10,001 minor units)
        // House = 25% = 2,500 minor units (25.00 ETB)
        // Player pool = 7,501 minor units (75.01 ETB)
        // 3 players tie for Rank 1:
        // Pool: Ranks 1+2+3 = 3750 + 1875 + 900 = 6525 bps of 10,001 minor units
        // floor(10,001 * 6525 / 10000) = 6525 minor units
        // Indivisible player remainder: 7501 - (6525 + 600 + 375) = 7501 - 7500 = 1 minor unit added to group 1!
        // So group 1 gets 6526 minor units.
        // 6526 / 3 = 2175 base minor units, remainder = 1 minor unit!
        const compId = 'comp_t20_13_remainder';
        this.createFinishedCompetition(compId, 'T20 Indivisible Remainder Test', 0, 100.01);

        const uA = this.createTestUser('13', 1, 0); // id: u_t20_13_0001
        const uB = this.createTestUser('13', 2, 0); // id: u_t20_13_0002
        const uC = this.createTestUser('13', 3, 0); // id: u_t20_13_0003
        const uD = this.createTestUser('13', 4, 0);
        const uE = this.createTestUser('13', 5, 0);

        [uA, uB, uC].forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 30,
            correctScorePoints: 12,
            correctPredictions: 7,
            exactCorrectScores: 2,
            totalScoredPredictions: 5,
            submittedAt: new Date().toISOString()
          });
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${uD.id}`,
          userId: uD.id,
          userName: uD.name,
          competitionId: compId,
          totalPoints: 20,
          correctScorePoints: 6,
          correctPredictions: 5,
          exactCorrectScores: 1,
          totalScoredPredictions: 5,
          submittedAt: new Date().toISOString()
        });

        (db as any).data.predictions.push({
          id: `pred_${compId}_${uE.id}`,
          userId: uE.id,
          userName: uE.name,
          competitionId: compId,
          totalPoints: 10,
          correctScorePoints: 0,
          correctPredictions: 4,
          exactCorrectScores: 0,
          totalScoredPredictions: 5,
          submittedAt: new Date().toISOString()
        });

        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        // Tied players sorted by userId ASC: uA < uB < uC
        // uA should receive base + 1 santim (0.01 ETB), uB and uC receive base
        const pA = s.prizeAllocations.find(p => p.userId === uA.id);
        const pB = s.prizeAllocations.find(p => p.userId === uB.id);
        const pC = s.prizeAllocations.find(p => p.userId === uC.id);

        const tieGroup = s.tieGroups?.find(g => g.rank === 1);
        const recipient = tieGroup?.remainderRecipients?.[0];

        const totalPayoutMinor = (pA?.amountMinorUnits || 0) + (pB?.amountMinorUnits || 0) + (pC?.amountMinorUnits || 0);
        const discrepancy = s.reconciliationDiscrepancyMinorUnits || 0;

        const passed = 
          recipient === uA.id &&
          (pA?.amountMinorUnits || 0) === (pB?.amountMinorUnits || 0) + 1 &&
          (pB?.amountMinorUnits || 0) === (pC?.amountMinorUnits || 0) &&
          discrepancy === 0 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'First player by userId ASC (uA) receives +1 minor unit, remaining players receive base share, discrepancy = 0',
          actual: `uA: ${pA?.amountETB} ETB (${pA?.amountMinorUnits} minor), uB: ${pB?.amountETB} ETB (${pB?.amountMinorUnits} minor), uC: ${pC?.amountETB} ETB (${pC?.amountMinorUnits} minor), Remainder recipient: ${recipient}`,
          details: `Pooled minor units: ${tieGroup?.totalPooledMinorUnits}, Base minor: ${tieGroup?.basePayoutMinorUnits}, Remainder: ${tieGroup?.remainderMinorUnits}`
        };
      }
    );

    // =========================================================================
    // T20-TIE-14: 100-Player Mass-Tie with Remainder
    // =========================================================================
    await runTest(
      'T20-TIE-14',
      4,
      'FINANCIAL_INVARIANTS',
      '100-player mass tie with remainder — distributed 1 minor unit at a time by userId ASC, 0 discrepancy',
      async () => {
        // Pool: 5000.04 ETB = 500,004 minor units
        // House = 25% = 125,001 minor units
        // Player pool = 375,003 minor units
        // 100 players tie:
        // base = floor(375003 / 100) = 3750 minor units (37.50 ETB)
        // remainder = 3 minor units!
        // First 3 players by userId ASC receive 3751 minor units (37.51 ETB)
        // Remaining 97 players receive 3750 minor units (37.50 ETB)
        const compId = 'comp_t20_14_100_remainder';
        this.createFinishedCompetition(compId, 'T20 100 Remainder Test', 0, 5000.04);

        const users = Array.from({ length: 100 }, (_, i) => this.createTestUser('14', i + 1, 0));

        users.forEach(u => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 40,
            correctScorePoints: 12,
            correctPredictions: 8,
            exactCorrectScores: 2,
            totalScoredPredictions: 5,
            submittedAt: new Date().toISOString()
          });
        });

        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        const sortedUsers = [...users].sort((a, b) => a.id.localeCompare(b.id));
        const first3 = sortedUsers.slice(0, 3).map(u => u.id);
        const remaining97 = sortedUsers.slice(3).map(u => u.id);

        const first3Allocations = s.prizeAllocations.filter(p => first3.includes(p.userId));
        const remainingAllocations = s.prizeAllocations.filter(p => remaining97.includes(p.userId));

        const first3Correct = first3Allocations.every(p => p.amountETB === 37.51 && (p.amountMinorUnits === 3751));
        const remainingCorrect = remainingAllocations.every(p => p.amountETB === 37.50 && (p.amountMinorUnits === 3750));

        const totalPlayerPayoutsMinor = s.prizeAllocations.reduce((sum, a) => sum + (a.amountMinorUnits || 0), 0);
        const sumMatchesExact = totalPlayerPayoutsMinor === 375003;

        const passed = 
          first3Correct &&
          remainingCorrect &&
          sumMatchesExact &&
          s.reconciliationDiscrepancyMinorUnits === 0 &&
          s.reconciliationDiscrepancyETB === 0;

        return {
          passed,
          expected: 'First 3 players receive 37.51 ETB, remaining 97 receive 37.50 ETB, sum === 375,003 minor units, discrepancy === 0',
          actual: `First 3 payouts: [${first3Allocations.map(p => p.amountETB).join(',')}], Remaining sample: ${remainingAllocations[0]?.amountETB} ETB, Total minor: ${totalPlayerPayoutsMinor}, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB`,
          details: `Tie group remainder recipients count: ${s.tieGroups?.[0]?.remainderRecipients?.length}`
        };
      }
    );

    // =========================================================================
    // T20-TIE-15: Repeated Settlement Request (Idempotency)
    // =========================================================================
    await runTest(
      'T20-TIE-15',
      5,
      'IDEMPOTENCY_AND_AUDIT',
      'Repeated settlement request — second call returns isIdempotent: true with identical record and zero duplicate payouts',
      async () => {
        const compId = 'comp_t20_15_idempotent';
        this.createFinishedCompetition(compId, 'T20 Idempotency Test', 100, 2000);

        const u1 = this.createTestUser('15', 1, 0);
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 50,
          correctScorePoints: 18,
          correctPredictions: 10,
          exactCorrectScores: 3,
          totalScoredPredictions: 5,
          submittedAt: new Date().toISOString()
        });

        const txCountBefore = ((db as any).data.transactions || []).length;
        const res1 = db.settleCompetition(compId, 'admin_system');
        const userBal1 = db.getUserById(u1.id)?.balanceETB || 0;
        const txCountAfter1 = ((db as any).data.transactions || []).length;

        // Call again
        const res2 = db.settleCompetition(compId, 'admin_system');
        const userBal2 = db.getUserById(u1.id)?.balanceETB || 0;
        const txCountAfter2 = ((db as any).data.transactions || []).length;

        const passed = 
          res1.success === true &&
          res2.success === true &&
          res2.isIdempotent === true &&
          res1.settlement?.id === res2.settlement?.id &&
          userBal1 === userBal2 &&
          txCountAfter1 === txCountAfter2;

        return {
          passed,
          expected: 'Second call returns isIdempotent: true, identical settlement ID, zero new transactions, zero extra wallet balance',
          actual: `res2.isIdempotent: ${res2.isIdempotent}, Same ID: ${res1.settlement?.id === res2.settlement?.id}, Balances: [${userBal1}, ${userBal2}], Tx counts: [${txCountAfter1}, ${txCountAfter2}]`,
          details: `Message: ${res2.message}`
        };
      }
    );

    // =========================================================================
    // T20-TIE-16: Concurrent Settlement Requests
    // =========================================================================
    await runTest(
      'T20-TIE-16',
      5,
      'IDEMPOTENCY_AND_AUDIT',
      'Concurrent settlement requests — concurrent calls execute safely with zero duplicate ledger credits',
      async () => {
        const compId = 'comp_t20_16_concurrent';
        this.createFinishedCompetition(compId, 'T20 Concurrent Settlement Test', 0, 2000);

        const u1 = this.createTestUser('16', 1, 0);
        const u2 = this.createTestUser('16', 2, 0);
        const u3 = this.createTestUser('16', 3, 0);
        const u4 = this.createTestUser('16', 4, 0);
        const u5 = this.createTestUser('16', 5, 0);

        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 50,
          correctScorePoints: 18,
          correctPredictions: 10,
          exactCorrectScores: 3,
          totalScoredPredictions: 5,
          submittedAt: new Date().toISOString()
        });

        [u2, u3, u4, u5].forEach((u, idx) => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 40 - idx * 5,
            correctScorePoints: 12,
            correctPredictions: 8,
            exactCorrectScores: 2,
            totalScoredPredictions: 5,
            submittedAt: new Date().toISOString()
          });
        });

        // Trigger concurrent execution
        const [resA, resB] = await Promise.all([
          Promise.resolve(db.settleCompetition(compId, 'admin_system_A')),
          Promise.resolve(db.settleCompetition(compId, 'admin_system_B'))
        ]);

        const prizeTxs = ((db as any).data.transactions || []).filter(
          (t: any) => t.referenceId === compId && t.type === 'PRIZE' && t.userId === u1.id
        );

        const u1After = db.getUserById(u1.id);
        const expectedPrizeETB = 750; // 50% of (75% of 2000) = 750 ETB

        const passed = 
          resA.success && resB.success &&
          prizeTxs.length === 1 &&
          u1After?.balanceETB === expectedPrizeETB;

        return {
          passed,
          expected: 'Both promises resolve successfully, exactly 1 PRIZE transaction created, balance credited exactly once (750 ETB)',
          actual: `Prize tx count: ${prizeTxs.length}, Player balance: ${u1After?.balanceETB} ETB, resA.isIdempotent: ${resA.isIdempotent}, resB.isIdempotent: ${resB.isIdempotent}`,
          details: `Both callers received valid settlement referencing ${compId}`
        };
      }
    );

    // =========================================================================
    // T20-TIE-17: Settlement Reconciliation Invariant
    // =========================================================================
    await runTest(
      'T20-TIE-17',
      5,
      'FINANCIAL_INVARIANTS',
      'Settlement reconciliation invariant — Total Collected === House Share + Player Payouts, discrepancy === 0',
      async () => {
        const compId = 'comp_t20_17_reconciliation';
        this.createFinishedCompetition(compId, 'T20 Reconciliation Invariant Test', 250, 2500);

        const u1 = this.createTestUser('17', 1, 250);
        const u2 = this.createTestUser('17', 2, 250);

        [u1, u2].forEach((u, idx) => {
          (db as any).data.predictions.push({
            id: `pred_${compId}_${u.id}`,
            userId: u.id,
            userName: u.name,
            competitionId: compId,
            totalPoints: 40 - idx * 10,
            correctScorePoints: 12,
            correctPredictions: 8,
            exactCorrectScores: 2,
            totalScoredPredictions: 5,
            submittedAt: new Date().toISOString()
          });
        });

        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        const totalCollectedMinor = s.totalPrizePoolMinorUnits || 0;
        const houseMinor = s.houseShareMinorUnits || 0;
        const playerMinor = s.playerPrizePoolMinorUnits || 0;
        const allocationsSumMinor = s.prizeAllocations.reduce((sum, a) => sum + (a.amountMinorUnits || 0), 0);

        const formulaBalanced = totalCollectedMinor === houseMinor + playerMinor;
        const payoutsBalanced = playerMinor === allocationsSumMinor;
        const discrepancyZero = (s.reconciliationDiscrepancyMinorUnits || 0) === 0 && s.reconciliationDiscrepancyETB === 0;

        const passed = formulaBalanced && payoutsBalanced && discrepancyZero;

        return {
          passed,
          expected: 'totalCollected === houseShare + playerPool, playerPool === sum(allocations), discrepancy === 0 minor units',
          actual: `Formula balanced: ${formulaBalanced}, Payouts balanced: ${payoutsBalanced}, Discrepancy: ${s.reconciliationDiscrepancyETB} ETB (${s.reconciliationDiscrepancyMinorUnits} minor)`,
          details: `Total: ${totalCollectedMinor} minor, House: ${houseMinor} minor, Player: ${playerMinor} minor, Allocations: ${allocationsSumMinor} minor`
        };
      }
    );

    // =========================================================================
    // T20-TIE-18: Historical Competition Rules Snapshot Remains Unchanged
    // =========================================================================
    await runTest(
      'T20-TIE-18',
      6,
      'IMMUTABILITY_AND_AUDIT',
      'Historical competition rules snapshot remains unchanged — settlement preserves frozen snapshot without mutation',
      async () => {
        const compId = 'comp_t20_18_snapshot';
        const initialSnapshot: CompetitionRulesSnapshot = {
          version: '2.0',
          capturedAt: '2026-01-01T00:00:00.000Z',
          marketPoints: {
            '1X2': 3,
            'OVER_UNDER_1_5': 0,
            'OVER_UNDER_2_5': 2,
            'BTTS': 1,
            'DOUBLE_CHANCE': 1,
            'CORRECT_SCORE': 6,
            'DRAW_NO_BET': 0,
            'ODD_EVEN': 0,
            'HALF_TIME_RESULT': 0,
            'HALF_TIME_FULL_TIME': 0
          },
          enabledMarkets: ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE'],
          scoringVersion: '2.0'
        };

        const comp = this.createFinishedCompetition(compId, 'T20 Snapshot Immutability Test', 100, 1000, initialSnapshot);

        const u1 = this.createTestUser('18', 1, 100);
        (db as any).data.predictions.push({
          id: `pred_${compId}_${u1.id}`,
          userId: u1.id,
          userName: u1.name,
          competitionId: compId,
          totalPoints: 13,
          correctScorePoints: 6,
          correctPredictions: 5,
          exactCorrectScores: 1,
          totalScoredPredictions: 1,
          submittedAt: new Date().toISOString()
        });

        const settlementRes = db.settleCompetition(compId, 'admin_system');
        const s = settlementRes.settlement!;

        const compAfter = db.getCompetitionById(compId);
        const snapshotAfter = compAfter?.rulesSnapshot;

        const passed = 
          snapshotAfter !== undefined &&
          snapshotAfter.capturedAt === '2026-01-01T00:00:00.000Z' &&
          snapshotAfter.marketPoints['1X2'] === 3 &&
          snapshotAfter.marketPoints['CORRECT_SCORE'] === 6 &&
          snapshotAfter.marketPoints['OVER_UNDER_2_5'] === 2 &&
          snapshotAfter.marketPoints['BTTS'] === 1 &&
          snapshotAfter.marketPoints['DOUBLE_CHANCE'] === 1 &&
          s.rulesSnapshotRef?.capturedAt === '2026-01-01T00:00:00.000Z';

        return {
          passed,
          expected: 'Competition rules snapshot is preserved with capturedAt=2026-01-01, 1X2=3, CS=6, O/U=2, BTTS=1, DC=1',
          actual: `CapturedAt: ${snapshotAfter?.capturedAt}, 1X2: ${snapshotAfter?.marketPoints['1X2']}, CS: ${snapshotAfter?.marketPoints['CORRECT_SCORE']}, Ref in settlement: ${s.rulesSnapshotRef?.capturedAt}`,
          details: `Rules snapshot remains completely immutable across scoring and settlement lifecycle.`
        };
      }
    );

    const totalCount = results.length;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = totalCount - passedCount;
    const passPercentage = Number(((passedCount / totalCount) * 100).toFixed(2));

    return {
      success: failedCount === 0,
      stage: 'TASK_20A_TIE_BREAKING_AND_MASS_TIE_PRIZE_DISTRIBUTION',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      totalCount,
      passedCount,
      failedCount,
      passPercentage,
      results
    };
  }
}
