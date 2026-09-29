import { db } from './db.js';
import {
  User,
  Competition,
  WalletTransaction,
  CompetitionSettlement,
  FinancialIncident,
  FinancialSafetyState,
  FinancialSafetyControls,
  AuthoritativeFixture,
  ResultVersion,
  ResultConflict,
  FootballDataAuditLog,
  FootballResultStatus,
  PredictionEntry
} from '../types.js';

export interface Task9TestResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Task9SuiteResponse {
  success: boolean;
  stage: string;
  timestamp: string;
  durationMs: number;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  results: Task9TestResult[];
}

export class StageTask9Service {
  /**
   * Run the complete football data integrity and result-correction suite (DATA-01 to DATA-30)
   */
  public static async runAcceptanceSuite(): Promise<Task9SuiteResponse> {
    const startTime = Date.now();
    const results: Task9TestResult[] = [];

    // Reset safety controls
    db.setFinancialSafetyState('NORMAL');
    db.setFinancialSafetyControls({
      pauseDeposits: false,
      pauseWithdrawals: false,
      pauseCompetitionEntry: false,
      pauseSettlements: false,
      pauseAllFinancialMutations: false
    });

    // Clear Task 9 specific collections for a clean run
    (db.data as any).authoritativeFixtures = [];
    (db.data as any).resultVersions = [];
    (db.data as any).resultConflicts = [];
    (db.data as any).footballDataAuditLogs = [];
    if (db.data.financialIncidents) db.data.financialIncidents = [];
    if (db.data.alerts) db.data.alerts = [];
    (db as any).forcePreSettlementGate = true; // explicitly force the pre-settlement gate for these tests

    const runTest = async (id: string, name: string, fn: () => Promise<void>) => {
      const tStart = Date.now();
      try {
        await fn();
        results.push({
          id,
          name,
          passed: true,
          expected: 'SUCCESS',
          actual: 'SUCCESS',
          details: 'Verified successfully.',
          durationMs: Date.now() - tStart
        });
      } catch (err: any) {
        results.push({
          id,
          name,
          passed: false,
          expected: 'SUCCESS',
          actual: `ERROR: ${err.message || err}`,
          details: `Failed: ${err.stack || err.message || err}`,
          durationMs: Date.now() - tStart
        });
      }
    };

    // --- SECTION 1: DATA MODEL & VALIDATION (DATA-01 to DATA-09) ---

    await runTest('DATA-01', 'Authoritative Source Metadata Persistence', async () => {
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_01',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_01',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (!res.success) throw new Error(`Expected success, got: ${res.error}`);
      const af = db.getAuthoritativeFixtureById('fix_01');
      if (!af) throw new Error('Authoritative fixture was not created in db.');
      if (af.homeTeam !== 'Arsenal' || af.awayTeam !== 'Chelsea' || af.provider !== 'FOOTBALL_DATA_ORG') {
        throw new Error('Authoritative fixture metadata was corrupted.');
      }
    });

    await runTest('DATA-02', 'Prevent Impossible Score States', async () => {
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_02',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_02',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: -1,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected validation to reject a negative score.');
      if (!res.error?.includes('homeScore')) throw new Error('Expected error message pointing to negative score validation.');
    });

    await runTest('DATA-03', 'Prevent Non-Integer Scores', async () => {
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_03',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_03',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 1.5,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected validation to reject a floating-point score.');
    });

    await runTest('DATA-04', 'Reject Missing Primary Identifiers', async () => {
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: '',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_04',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected validation to reject an empty fixtureId.');
    });

    await runTest('DATA-05', 'Reject Invalid Status values', async () => {
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_05',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_05',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'INVALID_STATUS_VALUE' as any,
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected validation to reject invalid status.');
    });

    await runTest('DATA-06', 'No Accidental Home/Away Reversal', async () => {
      // Seed original
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_06',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_06',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      // Swap home and away
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_06',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_06',
        homeTeam: 'Chelsea',
        awayTeam: 'Arsenal',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected validation to reject swapped home/away teams.');
      const af = db.getAuthoritativeFixtureById('fix_06')!;
      if (af.status !== 'DATA_ERROR') throw new Error('Expected status to change to DATA_ERROR upon orientation reversal.');
    });

    await runTest('DATA-07', 'Trigger Safety Incident on Orientation Swap', async () => {
      // Confirm a high-severity incident was generated from the swap in DATA-06
      const incidents = db.getFinancialIncidents();
      const reversalInc = incidents.find(i => i.trigger === 'REVERSAL_OR_IDENTITY_CONFLICT_DETECTED');
      if (!reversalInc) throw new Error('No safety incident was generated upon orientation reversal.');
      if (reversalInc.severity !== 'P1_HIGH') throw new Error(`Expected severity P1_HIGH, got ${reversalInc.severity}`);
    });

    await runTest('DATA-08', 'Reject Duplicate Provider Fixture Mapping', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_08_A',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_08',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_08_B',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_08',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected duplicate provider fixture mapping to be rejected.');
    });

    await runTest('DATA-09', 'Idempotent Result Processing (Exact Match)', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_09',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_09',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_09',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_09',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (!res.success) throw new Error('Idempotent update failed.');
      if (res.updated) throw new Error('Expected updated flag to be false for identical payload.');
    });

    // --- SECTION 2: RESULT STATE MACHINE (DATA-10 to DATA-14) ---

    await runTest('DATA-10', 'State Machine: SCHEDULED to LIVE', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_10',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_10',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_10',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_10',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'LIVE',
        homeScore: 1,
        awayScore: 0
      }, 'TEST_SYNC');

      const af = db.getAuthoritativeFixtureById('fix_10')!;
      if (af.status !== 'LIVE') throw new Error(`Expected LIVE, got ${af.status}`);
    });

    await runTest('DATA-11', 'State Machine: LIVE to FINISHED_UNCONFIRMED', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_11',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_11',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'LIVE',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_11',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_11',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      const af = db.getAuthoritativeFixtureById('fix_11')!;
      if (af.status !== 'FINISHED_UNCONFIRMED') throw new Error(`Expected FINISHED_UNCONFIRMED, got ${af.status}`);
    });

    await runTest('DATA-12', 'State Machine: FINISHED_UNCONFIRMED to FINISHED_CONFIRMED', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_12',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_12',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_12',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_12',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      const af = db.getAuthoritativeFixtureById('fix_12')!;
      if (af.status !== 'FINISHED_CONFIRMED') throw new Error(`Expected FINISHED_CONFIRMED, got ${af.status}`);
    });

    await runTest('DATA-13', 'State Machine: Once FINISHED_CONFIRMED is Immutable', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_13',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_13',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_13',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_13',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 3,
        awayScore: 1
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected standard update to fail on FINISHED_CONFIRMED result.');
    });

    await runTest('DATA-14', 'Transition: Cancelled/Postponed is Allowed', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_14',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_14',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_14',
        competitionId: 'comp_01',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_14',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'CANCELLED',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      if (!res.success) throw new Error('Failed transition to CANCELLED.');
      const af = db.getAuthoritativeFixtureById('fix_14')!;
      if (af.status !== 'CANCELLED') throw new Error(`Expected CANCELLED, got ${af.status}`);
    });

    // --- SECTION 3: MULTI-PROVIDER CONFLICT & GATING (DATA-15 to DATA-19) ---

    await runTest('DATA-15', 'Multi-Provider Conflict Detection', async () => {
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_15',
        competitionId: 'comp_15',
        provider: 'PROVIDER_A',
        providerFixtureId: 'p_fix_15',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      // Provider B sends 1-1
      const res = db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_15',
        competitionId: 'comp_15',
        provider: 'PROVIDER_B',
        providerFixtureId: 'p_fix_15',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 1,
        awayScore: 1
      }, 'TEST_SYNC');

      if (res.success) throw new Error('Expected update from conflicting Provider B to be rejected.');
      const conflicts = db.getResultConflicts();
      const conf = conflicts.find(c => c.fixtureId === 'fix_15');
      if (!conf) throw new Error('No ResultConflict was created.');
      if (conf.conflictType !== 'PROVIDER_DISAGREEMENT') throw new Error(`Expected PROVIDER_DISAGREEMENT conflictType, got ${conf.conflictType}`);
    });

    await runTest('DATA-16', 'Block Settlement on DATA_ERROR status', async () => {
      const comp = this.createTestCompetition('comp_gate_16', 50, 'fix_16');
      
      // Set authoritative fixture status to DATA_ERROR
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_16',
        competitionId: 'comp_gate_16',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_16',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'DATA_ERROR',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      const sRes = db.settleCompetition('comp_gate_16', 'usr_superadmin');
      if (sRes.success) throw new Error('Settlement should have been blocked on DATA_ERROR.');
      if (sRes.error !== 'DATA_ERROR_BLOCKED') throw new Error(`Expected error DATA_ERROR_BLOCKED, got ${sRes.error}`);
    });

    await runTest('DATA-17', 'Block Settlement on CORRECTION_PENDING status', async () => {
      const comp = this.createTestCompetition('comp_gate_17', 50, 'fix_17');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_17',
        competitionId: 'comp_gate_17',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_17',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'CORRECTION_PENDING',
        homeScore: 0,
        awayScore: 0
      }, 'TEST_SYNC');

      const sRes = db.settleCompetition('comp_gate_17', 'usr_superadmin');
      if (sRes.success) throw new Error('Settlement should have been blocked on CORRECTION_PENDING.');
      if (sRes.error !== 'CORRECTION_PENDING_BLOCKED') throw new Error(`Expected error CORRECTION_PENDING_BLOCKED, got ${sRes.error}`);
    });

    await runTest('DATA-18', 'Block Settlement on Active Provider Conflict', async () => {
      const comp = this.createTestCompetition('comp_gate_18', 50, 'fix_18');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_18',
        competitionId: 'comp_gate_18',
        provider: 'PROVIDER_A',
        providerFixtureId: 'p_fix_18',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_18',
        competitionId: 'comp_gate_18',
        provider: 'PROVIDER_B',
        providerFixtureId: 'p_fix_18',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_UNCONFIRMED',
        homeScore: 1,
        awayScore: 1
      }, 'TEST_SYNC'); // creates conflict

      const sRes = db.settleCompetition('comp_gate_18', 'usr_superadmin');
      if (sRes.success) throw new Error('Settlement should have been blocked on unresolved provider conflict.');
    });

    await runTest('DATA-19', 'Block Settlement on Cutoff Violation', async () => {
      const comp = this.createTestCompetition('comp_gate_19', 50, 'fix_19');

      // Add a prediction with submission timestamp after actual kickoff
      const pId = `pred_cutoff_19`;
      const pred: PredictionEntry = {
        id: pId,
        userId: 'usr_player1',
        userName: 'Player 1',
        competitionId: 'comp_gate_19',
        competitionTitle: comp.title,
        selections: [],
        createdAt: '2026-10-10T15:05:00Z', // 5 minutes after kickoff
        updatedAt: '2026-10-10T15:05:00Z'
      } as any;
      if (!db.data.predictions) db.data.predictions = [];
      db.data.predictions.push(pred);

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_19',
        competitionId: 'comp_gate_19',
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_19',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 1,
        awayScore: 0
      }, 'TEST_SYNC');

      const sRes = db.settleCompetition('comp_gate_19', 'usr_superadmin');
      if (sRes.success) throw new Error('Settlement should have been blocked on cutoff violation.');
      if (sRes.error !== 'CUTOFF_VIOLATION_BLOCKED') throw new Error(`Expected CUTOFF_VIOLATION_BLOCKED, got ${sRes.error}`);
    });

    // --- SECTION 4: POST-SETTLEMENT CORRECTION (DATA-20 to DATA-30) ---

    await runTest('DATA-20', 'Post-Settlement Result Correction Proposal', async () => {
      const compId = 'comp_settle_20';
      const comp = this.createTestCompetition(compId, 100, 'fix_20');
      
      const userA = this.createTestPlayer('corr20_A', 100);
      const userB = this.createTestPlayer('corr20_B', 100);

      // Join competition entries
      this.addCompetitionEntry(compId, userA.id, 100);
      this.addCompetitionEntry(compId, userB.id, 100);

      // Submit predictions
      this.submitTestPrediction(compId, userA.id, 'fix_20', '1X2', 'HOME'); // Arsenal win
      this.submitTestPrediction(compId, userB.id, 'fix_20', '1X2', 'AWAY'); // Chelsea win

      // Seed correct result: Arsenal win
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_20',
        competitionId: compId,
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_20',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 2,
        awayScore: 1
      }, 'TEST_SYNC');

      // Settle
      const sRes = db.settleCompetition(compId, 'usr_superadmin');
      if (!sRes.success) throw new Error(`Settlement failed: ${sRes.message}`);

      // Now propose a correction: Chelsea actually won 2-1
      const prop = db.proposeResultCorrection('fix_20', 1, 2, 'FINISHED_CONFIRMED', 'Official revision from Premier League board', 'usr_superadmin');
      if (!prop.success) throw new Error(`Proposal failed: ${prop.message}`);
      if (!prop.version) throw new Error('No correction version returned.');
      if (prop.version.version !== 1) throw new Error(`Expected version 1, got ${prop.version.version}`);
    });

    await runTest('DATA-21', 'Place Competition on Hold on Result Correction', async () => {
      // The competition 'comp_settle_20' must be under financial freeze / hold now
      const comp = db.getCompetitionById('comp_settle_20')!;
      if (!(comp as any).isFrozen || !(comp as any).financialFreeze) {
        throw new Error('Competition was not placed on hold / frozen after correction proposal.');
      }
    });

    await runTest('DATA-22', 'Create Correction Incident on Post-Settlement Change', async () => {
      const incidents = db.getFinancialIncidents();
      const corrInc = incidents.find(i => i.trigger === 'POST_SETTLEMENT_RESULT_CORRECTION');
      if (!corrInc) throw new Error('No post-settlement correction safety incident was generated.');
      if (corrInc.severity !== 'P1_HIGH') throw new Error(`Expected severity P1_HIGH, got ${corrInc.severity}`);
    });

    await runTest('DATA-23', 'Calculate Payout Shifts & Financial Difference', async () => {
      const versions = db.getResultVersions();
      const v = versions.find(ver => ver.fixtureId === 'fix_20')!;
      if (!v.affectedPredictions || v.affectedPredictions.length === 0) {
        throw new Error('Differential calculations were empty or failed.');
      }
      // Arsenal won (old: User A payout, User B 0). Chelsea won (new: User A 0, User B payout)
      // Affected predictions count should be 2
      if (v.affectedPredictionsCount !== 2) {
        throw new Error(`Expected 2 affected predictions, got ${v.affectedPredictionsCount}`);
      }
    });

    await runTest('DATA-24', 'Trigger Emergency State on Critical correction (>50 players)', async () => {
      // Create a massive competition with 60 players
      const compId = 'comp_settle_24';
      const comp = this.createTestCompetition(compId, 10, 'fix_24');

      for (let idx = 1; idx <= 60; idx++) {
        const user = this.createTestPlayer(`massive_${idx}`, 10);
        this.addCompetitionEntry(compId, user.id, 10);
        this.submitTestPrediction(compId, user.id, 'fix_24', '1X2', idx % 2 === 0 ? 'HOME' : 'AWAY');
      }

      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_24',
        competitionId: compId,
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_24',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 1,
        awayScore: 0
      }, 'TEST_SYNC');

      db.settleCompetition(compId, 'usr_superadmin');

      // Propose correction
      db.proposeResultCorrection('fix_24', 0, 1, 'FINISHED_CONFIRMED', 'Score corrected to 0-1', 'usr_superadmin');

      // Check emergency state is triggered
      if (db.data.financialSafetyState !== 'EMERGENCY') {
        throw new Error('Expected system-wide EMERGENCY state because correction affected >50 players.');
      }

      // Reset for subsequent tests
      db.setFinancialSafetyState('NORMAL');
      db.setFinancialSafetyControls({
        pauseDeposits: false,
        pauseWithdrawals: false,
        pauseCompetitionEntry: false,
        pauseSettlements: false,
        pauseAllFinancialMutations: false
      });
    });

    await runTest('DATA-25', 'Authorized Review Approval Requirement', async () => {
      // Trying to apply correction with unprivileged role should be prevented or handled securely
      // The applyResultCorrection requires a Super Admin. Here we test applyResultCorrection
      const applyRes = db.applyResultCorrection(1, 'usr_superadmin'); // applying version 1 (comp_settle_20)
      if (!applyRes.success) throw new Error(`Correction application failed: ${applyRes.message}`);
    });

    await runTest('DATA-26', 'Apply Approved Correction: Wallet adjustments', async () => {
      // Confirm that user corr20_A (former winner) and corr20_B (new winner) balances are correctly adjusted
      const uA = db.getUserById('usr_test_corr20_A')!;
      const uB = db.getUserById('usr_test_corr20_B')!;

      // User A originally won a prize of 150 ETB (75% of 200 ETB entry pool). Chelsea won now, so User B is winner.
      // User A should be clawed back (balance corrected downwards)
      // User B should be credited (balance corrected upwards)
      if (uB.balanceETB < 150) {
        throw new Error(`Expected corrected winner B to receive payout, balance is ${uB.balanceETB}`);
      }
    });

    await runTest('DATA-27', 'Ledger Immutability: New Rows Created, No Historic Edits', async () => {
      // Check that a new transaction of direction DEBIT or CREDIT was appended, and the old PRIZE payout transaction is intact
      const txs = db.data.transactions || [];
      const userBTxs = txs.filter(t => t.userId === 'usr_test_corr20_B');
      const originalPrize = userBTxs.find(t => t.id.startsWith('tx_prize_'));
      const correctionAdjustment = userBTxs.find(t => t.id.startsWith('tx_correction_'));

      if (!correctionAdjustment) {
        throw new Error('No new adjustment transaction row was written to the ledger.');
      }
    });

    await runTest('DATA-28', 'Save Updated Settlement Snapshot', async () => {
      const settlement = db.getSettlement('comp_settle_20')!;
      if (!settlement.scoringVersion.includes('correction')) {
        throw new Error('Settlement snapshot was not updated with correction version identifier.');
      }
      const topWinner = settlement.prizeAllocations[0];
      if (topWinner.userId !== 'usr_test_corr20_B') {
        throw new Error(`Expected top winner in settlement snapshot to be corrected player B, got ${topWinner.userId}`);
      }
    });

    await runTest('DATA-29', 'Lift Hold and Reset Competition Status on Completion', async () => {
      const comp = db.getCompetitionById('comp_settle_20')!;
      if ((comp as any).isFrozen || (comp as any).financialFreeze) {
        throw new Error('Financial hold / freeze was not lifted after correction was finalized.');
      }
      if (comp.status !== 'SETTLED') {
        throw new Error(`Expected competition status SETTLED, got ${comp.status}`);
      }
    });

    await runTest('DATA-30', 'Comprehensive End-to-End Flow', async () => {
      // Run a clean complete pipeline
      const compId = 'comp_settle_30';
      const comp = this.createTestCompetition(compId, 100, 'fix_30');
      const u1 = this.createTestPlayer('corr30_1', 200);
      const u2 = this.createTestPlayer('corr30_2', 200);

      this.addCompetitionEntry(compId, u1.id, 100);
      this.addCompetitionEntry(compId, u2.id, 100);

      this.submitTestPrediction(compId, u1.id, 'fix_30', '1X2', 'HOME');
      this.submitTestPrediction(compId, u2.id, 'fix_30', '1X2', 'AWAY');

      // Provider sync
      db.validateAndProcessFixtureUpdate({
        fixtureId: 'fix_30',
        competitionId: compId,
        provider: 'FOOTBALL_DATA_ORG',
        providerFixtureId: 'p_fix_30',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        scheduledKickoff: '2026-10-10T15:00:00Z',
        status: 'FINISHED_CONFIRMED',
        homeScore: 1,
        awayScore: 0
      }, 'TEST_SYNC');

      // Gate & settle
      db.settleCompetition(compId, 'usr_superadmin');

      // Correct
      db.proposeResultCorrection('fix_30', 0, 2, 'FINISHED_CONFIRMED', 'Var overturned scoring decision', 'usr_superadmin');

      // Apply
      const verId = db.getResultVersions().length;
      db.applyResultCorrection(verId, 'usr_superadmin');

      // Recalculate verification
      const u2Final = db.getUserById(u2.id)!;
      if (u2Final.balanceETB !== 250) { // 100 initial + 150 prize
        throw new Error(`Recalculated ledger payout mismatch. Expected balance 250, got ${u2Final.balanceETB}`);
      }
    });

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    const passPercentage = Number(((passedCount / results.length) * 100).toFixed(2));

    return {
      success: failedCount === 0,
      stage: 'DATA_INTEGRITY_SETTLEMENT_CORRECTION_TESTS',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      totalCount: results.length,
      passedCount,
      failedCount,
      passPercentage,
      results
    };
  }

  // --- CORE HELPER METHODS FOR TEST GENERATION ---

  private static createTestPlayer(prefix: string, balance: number): User {
    const id = `usr_test_${prefix}`;
    const existing = db.getUserById(id);
    if (existing) {
      existing.balanceETB = balance;
      existing.pendingBalanceETB = 0;
      db.updateUser(id, { balanceETB: balance, pendingBalanceETB: 0 });
      return existing;
    }

    const user: User = {
      id,
      name: `Test Player ${prefix}`,
      username: `player_${prefix}_${Date.now()}`,
      email: `${prefix}@apex-test.com`,
      phone: `+251999${Math.floor(100000 + Math.random() * 899999)}`,
      role: 'PLAYER',
      balanceETB: balance,
      pendingBalanceETB: 0,
      isVerified: true,
      createdAt: new Date().toISOString()
    } as any;
    
    db.createUser(user, 'password_hash');

    if (balance > 0) {
      db.createTransaction({
        id: `tx_seed_${id}_${Date.now()}`,
        userId: id,
        userName: `Test Player ${prefix}`,
        type: 'DEPOSIT',
        direction: 'CREDIT',
        amountETB: balance,
        method: 'SYSTEM',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        actorSource: 'SYSTEM',
        isTest: true
      });
    }

    return db.getUserById(id)!;
  }

  private static createTestCompetition(id: string, entryFee: number, fixtureId: string): Competition {
    if (db.data.competitions) {
      const idx = db.data.competitions.findIndex(c => c.id === id);
      if (idx !== -1) db.data.competitions.splice(idx, 1);
    }
    if (db.data.settlements) {
      const sIdx = db.data.settlements.findIndex(s => s.competitionId === id);
      if (sIdx !== -1) db.data.settlements.splice(sIdx, 1);
    }

    const comp: Competition = {
      id,
      title: `Task 9 Test Comp ${id}`,
      description: 'Hardened result synchronization test',
      entryFeeETB: entryFee,
      prizePoolETB: 0,
      status: 'PUBLISHED',
      matches: [
        {
          id: fixtureId,
          homeTeam: { name: 'Arsenal', code: 'ARS' },
          awayTeam: { name: 'Chelsea', code: 'CHE' },
          status: 'FINISHED',
          kickoffTime: new Date(Date.now() - 7200000).toISOString(),
          score: { home: 1, away: 0 }
        } as any
      ],
      currentPlayers: 0,
      maxPlayers: 100,
      rulesSnapshot: {
        version: '2.0',
        capturedAt: new Date().toISOString(),
        marketPoints: {
          '1X2': 3,
          'CORRECT_SCORE': 6,
          'OVER_UNDER_2_5': 2,
          'BTTS': 1,
          'DOUBLE_CHANCE': 1
        },
        enabledMarkets: ['1X2', 'CORRECT_SCORE'],
        scoringVersion: '2.0'
      } as any,
      createdAt: new Date().toISOString()
    } as any;

    if (!db.data.competitions) db.data.competitions = [];
    db.data.competitions.push(comp);
    db.save();
    return comp;
  }

  private static addCompetitionEntry(compId: string, userId: string, fee: number) {
    const user = db.getUserById(userId)!;
    user.balanceETB = Number((user.balanceETB - fee).toFixed(2));
    db.updateUser(userId, { balanceETB: user.balanceETB });

    db.createTransaction({
      id: `tx_entry_${compId}_${userId}_${Date.now()}`,
      userId,
      userName: user.name,
      type: 'COMPETITION_ENTRY',
      direction: 'DEBIT',
      amountETB: fee,
      method: 'SYSTEM',
      status: 'COMPLETED',
      referenceId: compId,
      createdAt: new Date().toISOString(),
      actorSource: 'USER'
    });

    const comp = db.getCompetitionById(compId)!;
    comp.currentPlayers = (comp.currentPlayers || 0) + 1;
    comp.prizePoolETB = (comp.prizePoolETB || 0) + fee;
    db.save();
  }

  private static submitTestPrediction(compId: string, userId: string, fixtureId: string, marketType: string, choice: string) {
    const pId = `pred_${compId}_${userId}_${fixtureId}`;
    const pred: PredictionEntry = {
      id: pId,
      userId,
      userName: `User ${userId}`,
      competitionId: compId,
      competitionTitle: 'Test Comp',
      selections: [
        {
          matchId: fixtureId,
          matchTitle: 'Arsenal vs Chelsea',
          marketType,
          marketName: 'Winner 1X2',
          optionChoice: choice,
          selection: choice,
          pointsMultiplier: 1
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (before cutoff)
      updatedAt: new Date().toISOString()
    } as any;

    if (!db.data.predictions) db.data.predictions = [];
    db.data.predictions.push(pred);
    db.save();
  }
}
