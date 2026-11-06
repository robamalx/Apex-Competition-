import { db, FIXED_MARKET_POINTS, resolveCanonicalMarketType, generateMarketsForMatch, APPROVED_MARKETS } from './db.js';
import { Competition, Match, MarketType, User } from '../types.js';
import bcrypt from 'bcryptjs';

export interface PublishMarketValidationTestResult {
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

export interface PublishMarketValidationTestSuiteResponse {
  success: boolean;
  passedCount: number;
  totalCount: number;
  passPercentage: number;
  durationMs: number;
  results: PublishMarketValidationTestResult[];
}

export class StageTask15PublishMarketValidationService {
  public static async runAcceptanceSuite(): Promise<PublishMarketValidationTestSuiteResponse> {
    const startTime = Date.now();
    const tests: PublishMarketValidationTestResult[] = [];
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

    const createTestUser = (role: 'SUPER_ADMIN' | 'COMPETITION_PUBLISHER' | 'PLAYER' = 'COMPETITION_PUBLISHER'): User => {
      const uid = `usr_t15_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const user: User = {
        id: uid,
        name: `Admin ${uid.slice(-4)}`,
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
      (user as any).status = 'ACTIVE';
      const hash = bcrypt.hashSync('Password123!', 6);
      db.createUser(user, hash);
      return user;
    };

    const setupFixturesAndDraft = (
      compTitle: string,
      enabledMarkets: MarketType[],
      fixtureCount: number = 8,
      marketBuilder?: (matchId: string, homeName: string, awayName: string) => any[]
    ): { comp: Competition; adminUser: User; initialBalance: number } => {
      const admin = createTestUser('COMPETITION_PUBLISHER');
      const fixtures: Match[] = [];

      for (let i = 1; i <= fixtureCount; i++) {
        const fixId = `fix_t15_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        const homeName = `Team A${i}`;
        const awayName = `Team B${i}`;

        const newFixture = {
          id: fixId,
          homeTeam: homeName,
          awayTeam: awayName,
          league: 'Premier League',
          matchDate: '2026-09-15',
          kickoffTime: '2026-09-15T18:00:00Z',
          kickoffTimeUtc: '2026-09-15T18:00:00Z',
          status: 'SCHEDULED',
          sourceProvenance: 'AUTHENTICATED_PROVIDER_FIXTURE',
          isVerified: true
        } as any;
        (db as any).data.fixtures.push(newFixture);

        const matchId = `match_${fixId}`;
        const matchMarkets = marketBuilder
          ? marketBuilder(matchId, homeName, awayName)
          : generateMarketsForMatch(matchId, enabledMarkets, homeName, awayName);

        fixtures.push({
          id: matchId,
          fixtureId: fixId,
          competitionId: '',
          homeTeam: { name: homeName, code: `TA${i}`, logoUrl: '' },
          awayTeam: { name: awayName, code: `TB${i}`, logoUrl: '' },
          league: 'Premier League',
          country: 'International',
          matchDate: '2026-09-15',
          kickoffTime: '2026-09-15T18:00:00Z',
          kickoffUtc: '2026-09-15T18:00:00Z',
          status: 'UPCOMING' as any,
          markets: matchMarkets
        });
      }

      const compId = `comp_t15_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const comp: Competition = {
        id: compId,
        title: compTitle,
        type: 'STANDARD',
        league: 'Premier League',
        country: 'England',
        entryFeeETB: 50,
        prizePoolETB: 0,
        collectedETB: 0,
        currentPlayers: 0,
        maxPlayers: 1000,
        startDate: '2026-09-15T17:00:00Z',
        endDate: '2026-09-15T22:00:00Z',
        registrationDeadline: '2026-09-15T17:50:00Z',
        status: 'DRAFT',
        featured: true,
        description: 'Test competition for market validation',
        rules: ['Predict outcomes.'],
        createdBy: admin.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matches: fixtures,
        enabledMarkets: [...enabledMarkets]
      };

      const createdComp = db.createCompetition(comp);
      return { comp: createdComp, adminUser: admin, initialBalance: admin.balanceETB };
    };

    // Test A: Publish with 1X2 only
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Comp 1X2 Only', ['1X2']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 1 && res.competition.enabledMarkets[0] === '1X2';
      record(
        'TEST_A_PUBLISH_1X2_ONLY',
        'Publish Competition with 1X2 market only',
        'SINGLE_MARKET',
        passed,
        'PUBLISHED with enabledMarkets=["1X2"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with 1X2 only.',
        t0
      );
    }

    // Test B: Publish with Over/Under only
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Comp OU Only', ['OVER_UNDER_2_5']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 1 && res.competition.enabledMarkets[0] === 'OVER_UNDER_2_5';
      record(
        'TEST_B_PUBLISH_OU_ONLY',
        'Publish Competition with Over/Under market only',
        'SINGLE_MARKET',
        passed,
        'PUBLISHED with enabledMarkets=["OVER_UNDER_2_5"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with Over/Under only.',
        t0
      );
    }

    // Test C: Publish with BTTS only
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Comp BTTS Only', ['BTTS']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 1 && res.competition.enabledMarkets[0] === 'BTTS';
      record(
        'TEST_C_PUBLISH_BTTS_ONLY',
        'Publish Competition with BTTS market only',
        'SINGLE_MARKET',
        passed,
        'PUBLISHED with enabledMarkets=["BTTS"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with BTTS only.',
        t0
      );
    }

    // Test D: Publish with Double Chance only
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Comp Double Chance Only', ['DOUBLE_CHANCE']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 1 && res.competition.enabledMarkets[0] === 'DOUBLE_CHANCE';
      record(
        'TEST_D_PUBLISH_DOUBLE_CHANCE_ONLY',
        'Publish Competition with Double Chance market only',
        'SINGLE_MARKET',
        passed,
        'PUBLISHED with enabledMarkets=["DOUBLE_CHANCE"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with Double Chance only.',
        t0
      );
    }

    // Test E: Publish with Correct Score only
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Comp Correct Score Only', ['CORRECT_SCORE']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 1 && res.competition.enabledMarkets[0] === 'CORRECT_SCORE';
      record(
        'TEST_E_PUBLISH_CORRECT_SCORE_ONLY',
        'Publish Competition with Correct Score market only',
        'SINGLE_MARKET',
        passed,
        'PUBLISHED with enabledMarkets=["CORRECT_SCORE"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with Correct Score only.',
        t0
      );
    }

    // Test F: Publish with all five markets
    {
      const t0 = Date.now();
      const allFive: MarketType[] = ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE'];
      const { comp } = setupFixturesAndDraft('Comp All 5 Markets', allFive);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 5;
      record(
        'TEST_F_PUBLISH_ALL_FIVE_MARKETS',
        'Publish Competition with all 5 canonical markets enabled simultaneously',
        'MULTI_MARKET',
        passed,
        'PUBLISHED with 5 canonical markets enabled',
        `Status: ${res.competition?.status}, count: ${res.competition?.enabledMarkets?.length}`,
        res.error || 'Successfully published with all 5 canonical markets.',
        t0
      );
    }

    // Test G: Publish with 1X2 + BTTS
    {
      const t0 = Date.now();
      const combo: MarketType[] = ['1X2', 'BTTS'];
      const { comp } = setupFixturesAndDraft('Comp 1X2 + BTTS', combo);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 2 &&
        res.competition.enabledMarkets.includes('1X2') && res.competition.enabledMarkets.includes('BTTS');
      record(
        'TEST_G_PUBLISH_1X2_AND_BTTS',
        'Publish Competition with 1X2 and BTTS combo',
        'COMBO_MARKET',
        passed,
        'PUBLISHED with ["1X2", "BTTS"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with 1X2 + BTTS.',
        t0
      );
    }

    // Test H: Publish with Over/Under + Correct Score
    {
      const t0 = Date.now();
      const combo: MarketType[] = ['OVER_UNDER_2_5', 'CORRECT_SCORE'];
      const { comp } = setupFixturesAndDraft('Comp OU + CS', combo);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        res.competition.enabledMarkets?.length === 2 &&
        res.competition.enabledMarkets.includes('OVER_UNDER_2_5') && res.competition.enabledMarkets.includes('CORRECT_SCORE');
      record(
        'TEST_H_PUBLISH_OU_AND_CORRECT_SCORE',
        'Publish Competition with Over/Under and Correct Score combo',
        'COMBO_MARKET',
        passed,
        'PUBLISHED with ["OVER_UNDER_2_5", "CORRECT_SCORE"]',
        `Status: ${res.competition?.status}, markets: ${JSON.stringify(res.competition?.enabledMarkets)}`,
        res.error || 'Successfully published with Over/Under + Correct Score.',
        t0
      );
    }

    // Test I: Publish with multiple markets on one match
    {
      const t0 = Date.now();
      const marketsList: MarketType[] = ['1X2', 'BTTS', 'OVER_UNDER_2_5'];
      const { comp } = setupFixturesAndDraft('Comp Multiple Markets Per Match', marketsList, 8, (matchId, homeName, awayName) => {
        return generateMarketsForMatch(matchId, marketsList, homeName, awayName);
      });
      const res = db.publishCompetition(comp.id);
      const allMatchesHaveMultiMarkets = (res.competition?.matches || []).every(m => (m.markets?.length || 0) === 3);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' && allMatchesHaveMultiMarkets;
      record(
        'TEST_I_PUBLISH_MULTI_MARKETS_PER_MATCH',
        'Publish with multiple markets attached to each match fixture',
        'MATCH_MARKETS',
        passed,
        'PUBLISHED and all matches contain 3 active markets',
        `Status: ${res.competition?.status}, allMatchesHaveMulti: ${allMatchesHaveMultiMarkets}`,
        res.error || 'All matches correctly populated with multi-market options.',
        t0
      );
    }

    // Test J: Raw market instance ID resolving to canonical market type
    {
      const t0 = Date.now();
      const rawIds = [
        'mk_match_fix_fd_560562_1x2',
        'mk_match_fix_fd_560562_over_under_2_5',
        'mk_match_fix_fd_560562_btts',
        'mk_match_fix_fd_560562_double_chance',
        'mk_match_fix_fd_560562_correct_score'
      ];
      const resolved = rawIds.map(id => resolveCanonicalMarketType(id));
      const expected = ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE'];
      const passed = JSON.stringify(resolved) === JSON.stringify(expected);
      record(
        'TEST_J_RAW_MARKET_INSTANCE_ID_RESOLUTION',
        'Verify resolveCanonicalMarketType converts raw market instance IDs to canonical types',
        'RESOLVER',
        passed,
        JSON.stringify(expected),
        JSON.stringify(resolved),
        'All raw instance IDs cleanly mapped to authoritative canonical types.',
        t0
      );
    }

    // Test K: Disabled market rejected
    {
      const t0 = Date.now();
      // Competition only has 1X2 enabled, but a match contains a BTTS market
      const { comp } = setupFixturesAndDraft('Comp Disabled Market Test', ['1X2'], 8, (matchId, homeName, awayName) => {
        return generateMarketsForMatch(matchId, ['1X2', 'BTTS'], homeName, awayName);
      });
      const res = db.publishCompetition(comp.id);
      const passed = res.success === false && Boolean(res.error?.includes('is not enabled for this competition'));
      record(
        'TEST_K_DISABLED_MARKET_REJECTED',
        'Reject publish when a match includes a market not in competition enabledMarkets',
        'VALIDATION',
        passed,
        'Rejected with "is not enabled for this competition"',
        `success=${res.success}, error=${res.error}`,
        res.error || 'Expected rejection was properly triggered.',
        t0
      );
    }

    // Test L: Unknown/malformed market rejected
    {
      const t0 = Date.now();
      const compId = `comp_malformed_${Date.now()}`;
      const fakeComp: any = {
        id: compId,
        title: 'Malformed Market Comp',
        type: 'STANDARD',
        entryFeeETB: 50,
        prizePoolETB: 0,
        currentPlayers: 0,
        maxPlayers: 100,
        matches: [{ id: 'm1', fixtureId: 'f1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' } }],
        enabledMarkets: ['1X2', 'CORNER_KICKS_INVALID_MARKET'],
        status: 'DRAFT'
      };
      db.createCompetition(fakeComp);
      const res = db.publishCompetition(compId);
      const passed = res.success === false && Boolean(res.error?.includes('Invalid market choice'));
      record(
        'TEST_L_UNKNOWN_MARKET_REJECTED',
        'Reject publish when unknown/malformed market choice is provided',
        'VALIDATION',
        passed,
        'Rejected with "Invalid market choice: <market>. Supported markets are 1X2, Over/Under, BTTS, Double Chance, and Correct Score."',
        `success=${res.success}, error=${res.error}`,
        res.error || 'Malformed market successfully rejected.',
        t0
      );
    }

    // Test M: Existing valid competition still publishes
    {
      const t0 = Date.now();
      const { comp } = setupFixturesAndDraft('Existing Standard Comp', ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE']);
      const res = db.publishCompetition(comp.id);
      const passed = res.success === true && res.competition?.status === 'PUBLISHED' &&
        Boolean(res.competition.rulesSnapshot);
      record(
        'TEST_M_EXISTING_VALID_COMPETITION_PUBLISHES',
        'Verify standard valid draft competition with all rules publishes seamlessly',
        'REGRESSION',
        passed,
        'PUBLISHED with immutable rulesSnapshot generated',
        `status=${res.competition?.status}, snapshotExists=${Boolean(res.competition?.rulesSnapshot)}`,
        'Seamless backwards compatibility confirmed.',
        t0
      );
    }

    // Test N: Historical settled competition remains unchanged
    {
      const t0 = Date.now();
      const compId = `comp_settled_${Date.now()}`;
      const settledComp: Competition = {
        id: compId,
        title: 'Historical Settled Comp',
        type: 'STANDARD',
        league: 'Premier League',
        country: 'England',
        entryFeeETB: 50,
        prizePoolETB: 500,
        collectedETB: 500,
        currentPlayers: 10,
        maxPlayers: 100,
        startDate: '2026-08-01T17:00:00Z',
        endDate: '2026-08-01T22:00:00Z',
        registrationDeadline: '2026-08-01T17:50:00Z',
        status: 'SETTLED',
        featured: false,
        description: 'Past settled competition',
        rules: ['Predict outcomes.'],
        createdBy: 'Admin',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T23:00:00Z',
        matches: [],
        enabledMarkets: ['1X2']
      };
      db.createCompetition(settledComp);
      const res = db.publishCompetition(compId);
      const storedAfter = db.getCompetitionById(compId);
      const passed = res.success === false && storedAfter?.status === 'SETTLED';
      record(
        'TEST_N_HISTORICAL_SETTLED_COMP_UNCHANGED',
        'Historical settled competition status and markets cannot be overwritten by publish',
        'IMMUTABILITY',
        passed,
        'Rejection to publish settled competition and status remains SETTLED',
        `publishSuccess=${res.success}, storedStatus=${storedAfter?.status}`,
        res.error || 'Settled competition immutability preserved.',
        t0
      );
    }

    // Test O: No wallet/ledger/entry side effects from publishing
    {
      const t0 = Date.now();
      const { comp, adminUser, initialBalance } = setupFixturesAndDraft('Zero Side Effect Publish', ['1X2', 'BTTS']);
      const txCountBefore = db.getTransactionsByUser(adminUser.id).length;

      const res = db.publishCompetition(comp.id, adminUser.id);
      const adminAfter = db.getUserById(adminUser.id);
      const txCountAfter = db.getTransactionsByUser(adminUser.id).length;

      const passed = res.success === true &&
        adminAfter?.balanceETB === initialBalance &&
        txCountAfter === txCountBefore;

      record(
        'TEST_O_ZERO_FINANCIAL_SIDE_EFFECTS_ON_PUBLISH',
        'Publishing does not debit admin balance, generate ledger transactions, or alter player wallets',
        'FINANCIAL_INTEGRITY',
        passed,
        `Balance remains ${initialBalance} ETB, zero new transactions`,
        `Balance: ${adminAfter?.balanceETB} ETB, txBefore: ${txCountBefore}, txAfter: ${txCountAfter}`,
        'Zero financial side effects verified.',
        t0
      );
    }

    const durationMs = Date.now() - startTime;
    const passedCount = tests.filter(t => t.passed).length;
    const totalCount = tests.length;
    const passPercentage = Math.round((passedCount / totalCount) * 100);

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
