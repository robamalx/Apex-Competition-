import { ReferralService } from '../src/server/referralService.js';
import { db } from '../src/server/db.js';
import { User, Competition, PredictionEntry } from '../src/types.js';

async function main() {
  console.log('================================================================');
  console.log('RISK 5: MULTI-INSTANCE CONCURRENCY & PERSISTENCE SAFETY TEST');
  console.log('================================================================\n');

  ReferralService.clearAllData();

  // 1. Process A: User Setup & Referral Registration
  console.log('1. Process A creating referrer and referee accounts...');
  const uReferrer: User = {
    id: 'proc_a_referrer',
    name: 'Multi-Process Referrer',
    username: 'proc_a_ref',
    email: 'proca@apex.et',
    phone: '0911500001',
    role: 'PLAYER',
    balanceETB: 1000,
    pendingBalanceETB: 0,
    referralCode: 'APX-PROC-001',
    isVerified: true,
    isPhoneVerified: true,
    createdAt: new Date().toISOString()
  };

  const uReferee: User = {
    id: 'proc_b_referee',
    name: 'Multi-Process Referee',
    username: 'proc_b_ref',
    email: 'procb@apex.et',
    phone: '0911500002',
    role: 'PLAYER',
    balanceETB: 500,
    pendingBalanceETB: 0,
    isVerified: true,
    isPhoneVerified: true,
    createdAt: new Date().toISOString()
  };

  db.data.users.push(uReferrer, uReferee);
  db.save(true);

  const regRes = ReferralService.registerReferral({
    referrerCode: 'APX-PROC-001',
    referredUser: uReferee
  });
  console.log(`   Referral registered: ${regRes.relationship?.id} (Status: ${regRes.relationship?.status})`);

  // 2. Process B: Phone Verification & Deposit Confirmation
  console.log('\n2. Process B loading state from disk & processing verification/deposit...');
  ReferralService.syncFromDisk();
  await ReferralService.handlePhoneVerified(uReferee.id);
  await ReferralService.handleDepositConfirmed({
    id: 'tx_dep_proc_b',
    userId: uReferee.id,
    userName: uReferee.name,
    type: 'DEPOSIT',
    direction: 'CREDIT',
    amountETB: 200,
    status: 'COMPLETED',
    createdAt: new Date().toISOString()
  });

  const overviewB = ReferralService.getPlayerReferralOverview(uReferrer.id);
  console.log(`   Process B overview: Total Referred = ${overviewB.totalReferred}, Total Deposited = ${overviewB.totalDeposited}`);
  if (overviewB.totalDeposited !== 1) {
    throw new Error('State was not persisted across Process B boundary!');
  }

  // 3. Process C & D: Concurrent 100 ETB Competition Qualification
  console.log('\n3. Simulating Process C and Process D executing simultaneous 100 ETB match completions...');
  const comp100: Competition = {
    id: 'comp_proc_100',
    title: 'Multi-Instance Matchweek 100 ETB',
    entryFeeETB: 100,
    totalPrizePoolETB: 10000,
    status: 'OPEN',
    matches: []
  };

  const entry: PredictionEntry = {
    id: 'entry_proc_100',
    userId: uReferee.id,
    userName: uReferee.name,
    competitionId: comp100.id,
    competitionTitle: comp100.title,
    entryFeeETB: 100,
    status: 'SUBMITTED',
    selections: [],
    totalPotentialPoints: 100,
    createdAt: new Date().toISOString()
  };

  // Run 5 simultaneous qualification requests
  const results = await Promise.all([
    ReferralService.handleCompetitionEntry(entry, comp100),
    ReferralService.handleCompetitionEntry(entry, comp100),
    ReferralService.handleCompetitionEntry(entry, comp100),
    ReferralService.handleCompetitionEntry(entry, comp100),
    ReferralService.handleCompetitionEntry(entry, comp100)
  ]);

  const awardedCount = results.filter(r => r.pointsAwarded === 10).length;
  console.log(`   Parallel instances qualification results: Awarded = ${awardedCount}, Blocked/Idempotent = ${5 - awardedCount}`);

  if (awardedCount !== 1) {
    throw new Error(`Race condition detected: Points awarded ${awardedCount} times instead of exactly 1!`);
  }

  // 4. Process E: Reversal simulation and point ledger verification
  console.log('\n4. Process E checking authoritative point ledger & executing reversal...');
  ReferralService.syncFromDisk();
  const balanceBefore = ReferralService.calculateAuthoritativePoints(uReferrer.id);
  console.log(`   Authoritative balance before reversal: ${balanceBefore} points`);

  const revRes = await ReferralService.handleCompetitionRefundOrVoid('entry_proc_100', 'Match abandoned');
  console.log(`   Reversal executed: ${revRes.reversed}, Deducted: ${revRes.pointsDeducted}`);

  const balanceAfter = ReferralService.calculateAuthoritativePoints(uReferrer.id);
  console.log(`   Authoritative balance after reversal: ${balanceAfter} points`);

  if (balanceAfter !== 0) {
    throw new Error(`Authoritative balance mismatch: Expected 0 points, got ${balanceAfter}`);
  }

  console.log('\n================================================================');
  console.log('MULTI-INSTANCE SAFETY VERIFICATION: ALL CHECKS PASSED');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal multi-instance test error:', err);
  process.exit(1);
});
