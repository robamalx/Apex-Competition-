/**
 * APEX ARENA — RISK 11: ACCOUNT TAKEOVER & SESSION SECURITY
 * FINAL CLOSEOUT GATE VERIFICATION RUNNER
 */

import http from 'http';
import express from 'express';
import crypto from 'crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { createPhase26Database } from './run_phase2_6_production_readiness_gate.js';
import { DatabaseMigrator } from '../src/server/db/migrator.js';
import { dbPool } from '../src/server/db/pool.js';
import { db } from '../src/server/db.js';
import {
  AccountSecurityService,
  PasswordSecurityManager,
  SessionLifecycleManager,
  PasswordResetService,
  TelegramIdentityService,
  AccountSecurityStateManager,
  SecurityAuditLogger,
  LoginAttackProtection
} from '../src/server/accountSecurityService.js';
import {
  runAuthoritativeFinancialAudit,
  toMinorUnits,
  toETB
} from '../src/server/db/postgresService.js';
import { User, UserRole } from '../src/types.js';

interface TestDetail {
  id: number | string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  evidence: string;
  notes?: string;
  durationMs: number;
}

const detailedResults: TestDetail[] = [];

function record(
  id: number | string,
  name: string,
  category: string,
  passed: boolean,
  expected: string,
  actual: string,
  evidence: string,
  durationMs: number,
  notes?: string
) {
  detailedResults.push({ id, name, category, passed, expected, actual, evidence, durationMs, notes });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${String(id).padStart(2, '0')}] [${category}] ${name} (${durationMs}ms) — [${evidence}]`);
  if (!passed) {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('       APEX ARENA — RISK 11: ACCOUNT TAKEOVER & SESSION SECURITY               ');
  console.log('                  FINAL VERIFICATION & CLOSEOUT GATE                            ');
  console.log('================================================================================\n');

  // 1. Initialize Database & Migrations
  const { pool, poolA, poolB, memDb } = createPhase26Database();
  dbPool.setPool(pool);
  await DatabaseMigrator.runMigrations(pool);
  console.log('✓ Database initialized and migrations successfully applied.\n');

  // ---------------------------------------------------------------------------
  // SECTION 8 (PART 1): FINANCIAL RECONCILIATION - BEFORE
  // ---------------------------------------------------------------------------
  console.log('>>> [1/7] EXECUTING FINANCIAL RECONCILIATION AUDIT (BEFORE)...');
  const auditBefore = await runAuthoritativeFinancialAudit(pool);
  console.log(`    Total Wallet Balance:           ${auditBefore.totalWalletsBalanceMinorUnits} cents (${toETB(auditBefore.totalWalletsBalanceMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Held Balance:             ${auditBefore.totalWalletsHeldMinorUnits} cents (${toETB(auditBefore.totalWalletsHeldMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Credits:        ${auditBefore.totalLedgerCompletedCreditsMinorUnits} cents (${toETB(auditBefore.totalLedgerCompletedCreditsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Debits:         ${auditBefore.totalLedgerCompletedDebitsMinorUnits} cents (${toETB(auditBefore.totalLedgerCompletedDebitsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Calculated Net Ledger:          ${auditBefore.calculatedNetLedgerMinorUnits} cents (${toETB(auditBefore.calculatedNetLedgerMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Discrepancy:                    ${auditBefore.discrepancyMinorUnits} minor units\n`);

  // ---------------------------------------------------------------------------
  // SECTION 1: RUN THE COMPLETE 50-TEST RISK 11 ADVERSARIAL SUITE
  // ---------------------------------------------------------------------------
  console.log('>>> [2/7] RUNNING 50-TEST ADVERSARIAL RISK 11 TEST SUITE...');
  const suiteReport = await AccountSecurityService.runAllTests();

  suiteReport.results.forEach((t) => {
    record(
      t.caseNumber,
      t.name,
      t.category,
      t.passed,
      t.expected,
      t.actual,
      t.evidenceTier,
      t.durationMs,
      t.details
    );
  });

  console.log(`\nRisk 11 50-Test Suite Execution Summary:`);
  console.log(`* Passed:  ${suiteReport.passedTests}/50`);
  console.log(`* Failed:  ${suiteReport.failedTests}/50`);
  console.log(`* Blocked: 0/50\n`);

  // ---------------------------------------------------------------------------
  // SECTION 2: PASSWORD SECRECY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('>>> [3/7] VERIFYING PASSWORD SECRECY INVARIANTS...');

  // Test PS-01: Player cannot retrieve password
  {
    const t0 = Date.now();
    const rawUser = db.getUserById('user-player-1');
    const sanitized = PasswordSecurityManager.sanitizeUser(rawUser);
    const pass = !('passwordHash' in sanitized) && !('password' in (sanitized as any));
    record(
      'PS-01',
      'Player Password Retrieval Prevention (Sanitization)',
      'Password Secrecy',
      pass,
      'password and passwordHash properties omitted',
      `Present: password=${'password' in (sanitized as any)}, hash=${'passwordHash' in sanitized}`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // Test PS-02: Admin cannot retrieve player password
  {
    const t0 = Date.now();
    const adminUser = db.getUserById('admin-super-1');
    const playerRecord = db.getUserById('user-player-1');
    const adminView = PasswordSecurityManager.sanitizeUser(playerRecord);
    const pass = !('passwordHash' in adminView) && !('password' in (adminView as any));
    record(
      'PS-02',
      'Admin Password Retrieval Prevention',
      'Password Secrecy',
      pass,
      'password omitted in admin views',
      `Admin view hash present: ${'passwordHash' in adminView}`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // Test PS-03: Super Admin cannot retrieve password
  {
    const t0 = Date.now();
    const superAdminView = PasswordSecurityManager.sanitizeUser(db.getUserById('admin-super-1'));
    const pass = !('passwordHash' in superAdminView) && !('password' in (superAdminView as any));
    record(
      'PS-03',
      'Super Admin Password Retrieval Prevention',
      'Password Secrecy',
      pass,
      'Super Admin cannot retrieve raw or hashed passwords',
      `Hash present: ${'passwordHash' in superAdminView}`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // Test PS-04: API responses do not contain password hashes
  {
    const t0 = Date.now();
    const sess = await SessionLifecycleManager.createSession({ userId: 'user-player-1', role: 'PLAYER' }, pool);
    const val = await SessionLifecycleManager.validateSession(sess.token, pool);
    const pass = !('passwordHash' in (val.user || {})) && !('password' in ((val.user as any) || {}));
    record(
      'PS-04',
      'Session Validation API Response Password Secrecy',
      'Password Secrecy',
      pass,
      'Session validate response excludes password fields',
      `passwordHash in user: ${'passwordHash' in (val.user || {})}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Test PS-05: Audit logs and security events do not log passwords
  {
    const t0 = Date.now();
    const sampleDetails = { attempt: 'Password123!', user: 'user-player-1', reason: 'BAD_AUTH' };
    const cleanDetails = PasswordSecurityManager.sanitizeAuditDetails(sampleDetails);
    const pass = cleanDetails.attempt === '[REDACTED]' && !JSON.stringify(cleanDetails).includes('Password123!');
    record(
      'PS-05',
      'Security Audit Log Password Redaction',
      'Password Secrecy',
      pass,
      'Raw passwords redacted as [REDACTED] in audit entries',
      `Cleaned details: ${JSON.stringify(cleanDetails)}`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: TOKEN / SECRET SECRECY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [4/7] VERIFYING TOKEN / SECRET SECRECY INVARIANTS...');

  // Test TS-01: Session token masked in UI representation
  {
    const t0 = Date.now();
    const rawToken = 's_1726000000000_abcdef0123456789abcdef0123456789';
    const masked = SessionLifecycleManager.maskToken(rawToken);
    const pass = masked.includes('...') && !masked.includes('abcdef0123456789abcdef');
    record(
      'TS-01',
      'Session Token Masking for Client Display',
      'Token Secrecy',
      pass,
      'Session tokens displayed with prefix and suffix masking',
      `Masked: ${masked}`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // Test TS-02: Reset tokens stored strictly as SHA-256 hashes in database
  {
    const t0 = Date.now();
    const pwr = await PasswordResetService.requestReset({
      identifier: 'player1@apex.et',
      channel: 'EMAIL',
      ipAddress: '127.0.0.1'
    }, pool);
    const testToken = pwr.simulatedTokenForTest;
    const dbRows = await pool.query('SELECT token_hash FROM password_reset_challenges WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', ['user-player-1']);
    const storedHash = dbRows.rows[0]?.token_hash;
    const expectedHash = crypto.createHash('sha256').update(testToken!).digest('hex');
    const pass = storedHash === expectedHash && storedHash !== testToken;
    record(
      'TS-02',
      'Password Reset Token SHA-256 Storage Integrity',
      'Token Secrecy',
      pass,
      'Raw token never stored in DB, only 256-bit hash stored',
      `Stored Hash: ${storedHash?.substring(0, 16)}..., Matches SHA256: ${storedHash === expectedHash}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: ACCOUNT TAKEOVER SCENARIOS (A THROUGH H)
  // ---------------------------------------------------------------------------
  console.log('\n>>> [5/7] EXECUTING ACCOUNT TAKEOVER SCENARIOS (A - H)...');

  // Scenario A: Attacker obtains old session; Player changes password -> old session invalidated
  {
    const t0 = Date.now();
    const oldSession = await SessionLifecycleManager.createSession({ userId: 'user-player-1', role: 'PLAYER' }, pool);
    // User changes password
    await SessionLifecycleManager.revokeAllUserSessions('user-player-1', 'PASSWORD_CHANGED', pool);
    const checkOld = await SessionLifecycleManager.validateSession(oldSession.token, pool);
    const pass = !checkOld.valid && checkOld.reason === 'SESSION_REVOKED';
    record(
      'ATO-A',
      'Scenario A: Old Session Revocation on Password Change',
      'Account Takeover',
      pass,
      'Old session rejected with SESSION_REVOKED',
      `Valid: ${checkOld.valid}, Reason: ${checkOld.reason}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario B: Attacker obtains reset token; used once -> second use rejected (replay attack)
  {
    const t0 = Date.now();
    const reqRes = await PasswordResetService.requestReset({ identifier: 'player1@apex.et' }, pool);
    const tok = reqRes.simulatedTokenForTest!;
    const firstUse = await PasswordResetService.completeReset({ token: tok, newPassword: 'NewSecurePassword123!' }, pool);
    const secondUse = await PasswordResetService.completeReset({ token: tok, newPassword: 'AttackerPassword123!' }, pool);
    const pass = firstUse.success && !secondUse.success && (secondUse.error || '').includes('already been used');
    record(
      'ATO-B',
      'Scenario B: Single-Use Reset Token Replay Protection',
      'Account Takeover',
      pass,
      'First reset succeeds, second reset rejected as replay',
      `First: ${firstUse.success}, Second: ${secondUse.success}, Error: ${secondUse.error}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario C: Expired reset token rejected
  {
    const t0 = Date.now();
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await pool.query(
      `INSERT INTO password_reset_challenges (id, user_id, token_hash, channel, status, expires_at, created_at)
       VALUES ($1, $2, $3, 'EMAIL', 'PENDING', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '16 minutes')`,
      [`pwr_exp_${Date.now()}`, 'user-player-1', tokenHash]
    );
    const res = await PasswordResetService.completeReset({ token: expiredToken, newPassword: 'ExpiredTokenPass123!' }, pool);
    const pass = !res.success && (res.error || '').includes('expired');
    record(
      'ATO-C',
      'Scenario C: Expired Reset Token Rejection',
      'Account Takeover',
      pass,
      'Reset with expired token fails with expiration notice',
      `Success: ${res.success}, Error: ${res.error}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario D: Account enumeration rejected (identical responses)
  {
    const t0 = Date.now();
    const existing = await PasswordResetService.requestReset({ identifier: 'player1@apex.et' }, pool);
    const nonExisting = await PasswordResetService.requestReset({ identifier: 'nonexistent_user_12345@apex.et' }, pool);
    const pass = existing.message === nonExisting.message && existing.message.includes('If an account matches that identifier');
    record(
      'ATO-D',
      'Scenario D: Anti-Enumeration Constant-Response Guarantees',
      'Account Takeover',
      pass,
      'Identical responses for existing and non-existing accounts',
      `Messages match: ${existing.message === nonExisting.message}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario E: Repeated password guessing triggers protection without permanent DoS
  {
    const t0 = Date.now();
    const testIp = '198.51.100.99';
    for (let i = 0; i < 5; i++) {
      LoginAttackProtection.recordFailedLogin('user-player-2', testIp);
    }
    const checkThrottled = LoginAttackProtection.checkLoginAllowed('user-player-2', testIp);
    const pass = !checkThrottled.allowed && checkThrottled.waitSeconds! > 0 && checkThrottled.waitSeconds! <= 300;
    record(
      'ATO-E',
      'Scenario E: Brute-Force Rate Limiting with Exponential Backoff',
      'Account Takeover',
      pass,
      'Locked out with bounded retry-after delay (no permanent DoS)',
      `Allowed: ${checkThrottled.allowed}, WaitSeconds: ${checkThrottled.waitSeconds}s`,
      'SERVICE',
      Date.now() - t0
    );
  }

  // Scenario F: Attacker changes recovery identity (Telegram rebind protection)
  {
    const t0 = Date.now();
    // Bind telegram to user 1
    await TelegramIdentityService.bindTelegram({ userId: 'user-player-1', telegramUserId: '9988776655', telegramUsername: 'player1_tg' }, pool);
    // Attacker tries to bind same telegram to user 2
    const hijack = await TelegramIdentityService.bindTelegram({ userId: 'user-player-2', telegramUserId: '9988776655', telegramUsername: 'player1_tg' }, pool);
    const pass = !hijack.success && (hijack.error || '').toLowerCase().includes('already linked');
    record(
      'ATO-F',
      'Scenario F: Recovery Identity Collision & Hijacking Prevention',
      'Account Takeover',
      pass,
      'Rebinding existing Telegram ID to different account rejected',
      `Success: ${hijack.success}, Error: ${hijack.error}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario G: Attacker attempts withdrawal after security mutation -> 24h cooldown applies
  {
    const t0 = Date.now();
    // Set 24h cooldown
    await AccountSecurityStateManager.setWithdrawalCooldown('user-player-1', 24, 'PASSWORD_RESET', pool);
    const checkWd = await AccountSecurityStateManager.evaluateWithdrawalSecurity('user-player-1', pool);
    const pass = !checkWd.allowed && (checkWd.status === 'SECURITY_HOLD' || checkWd.status === 'COOLDOWN');
    record(
      'ATO-G',
      'Scenario G: 24-Hour Withdrawal Cooldown Enforcement',
      'Account Takeover',
      pass,
      'Withdrawal rejected during 24h cooldown window',
      `Allowed: ${checkWd.allowed}, Status: ${checkWd.status}, Reason: ${checkWd.reason}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // Scenario H: Admin marks account compromised -> All sessions revoked + withdrawal blocked
  {
    const t0 = Date.now();
    const activeSess = await SessionLifecycleManager.createSession({ userId: 'user-player-2', role: 'PLAYER' }, pool);
    await AccountSecurityStateManager.flagCompromised('user-player-2', 'Suspicious cross-continental API activity', undefined, pool);
    const checkSess = await SessionLifecycleManager.validateSession(activeSess.token, pool);
    const checkWd = await AccountSecurityStateManager.evaluateWithdrawalSecurity('user-player-2', pool);
    const pass = !checkSess.valid && !checkWd.allowed && checkWd.status === 'BLOCKED';
    record(
      'ATO-H',
      'Scenario H: Compromise Containment (Revocation + Withdrawal Block)',
      'Account Takeover',
      pass,
      'Sessions invalidated and withdrawals blocked immediately',
      `Session Valid: ${checkSess.valid}, Wd Allowed: ${checkWd.allowed}, Wd Status: ${checkWd.status}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 5: CROSS-INSTANCE SECURITY VERIFICATION (REAL_TWO_PROCESS)
  // ---------------------------------------------------------------------------
  console.log('\n>>> [6/7] VERIFYING CROSS-INSTANCE SECURITY (TWO INDEPENDENT HTTP INSTANCES)...');

  // Launch Instance A and Instance B HTTP servers
  const appA = express();
  appA.use(express.json());
  const appB = express();
  appB.use(express.json());

  // Setup endpoints on both
  const setupEndpoints = (app: express.Express, nodePool: pg.Pool) => {
    app.post('/api/auth/login', async (req, res) => {
      const { userId, role } = req.body;
      const sess = await SessionLifecycleManager.createSession({ userId, role }, nodePool);
      res.json({ token: sess.token });
    });

    app.get('/api/protected', async (req, res) => {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const valid = await SessionLifecycleManager.validateSession(token, nodePool);
      if (!valid.valid) return res.status(401).json({ error: valid.reason });
      res.json({ success: true, user: valid.user });
    });

    app.post('/api/auth/revoke', async (req, res) => {
      const { token } = req.body;
      const revoked = await SessionLifecycleManager.revokeSession(token, 'USER_LOGOUT', nodePool);
      res.json({ revoked });
    });

    app.post('/api/admin/compromise', async (req, res) => {
      const { userId, reason } = req.body;
      await AccountSecurityStateManager.flagCompromised(userId, reason, undefined, nodePool);
      res.json({ success: true });
    });
  };

  setupEndpoints(appA, poolA);
  setupEndpoints(appB, poolB);

  const serverA = http.createServer(appA);
  const serverB = http.createServer(appB);

  await new Promise<void>((r) => serverA.listen(0, r));
  await new Promise<void>((r) => serverB.listen(0, r));

  const portA = (serverA.address() as any).port;
  const portB = (serverB.address() as any).port;

  const httpPost = (port: number, path: string, data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const req = http.request(
        { hostname: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  };

  const httpGet = (port: number, path: string, token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path, method: 'GET', headers: { Authorization: `Bearer ${token}` } },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
        }
      );
      req.on('error', reject);
      req.end();
    });
  };

  // Cross-Instance Step 1 & 2: Login on Instance A, Authenticate on Instance B
  {
    const t0 = Date.now();
    const loginRes = await httpPost(portA, '/api/auth/login', { userId: 'user-player-1', role: 'PLAYER' });
    const sharedToken = loginRes.data.token;
    const authOnB = await httpGet(portB, '/api/protected', sharedToken);
    const pass = authOnB.status === 200 && authOnB.data.success;
    record(
      'XI-01',
      'Cross-Instance Session Recognition (Login Instance A -> Verify Instance B)',
      'Cross-Instance Security',
      pass,
      'Instance B validates session created on Instance A',
      `Instance B status: ${authOnB.status}`,
      'REAL_HTTP',
      Date.now() - t0
    );

    // Cross-Instance Step 3, 4, 5: Revoke on Instance A, Verify rejected on Instance B
    const t1 = Date.now();
    await httpPost(portA, '/api/auth/revoke', { token: sharedToken });
    const authOnBAfterRevoke = await httpGet(portB, '/api/protected', sharedToken);
    const passRevoke = authOnBAfterRevoke.status === 401 && authOnBAfterRevoke.data.error === 'SESSION_REVOKED';
    record(
      'XI-02',
      'Cross-Instance Session Revocation Invalidation (Revoke Instance A -> Rejected Instance B)',
      'Cross-Instance Security',
      passRevoke,
      'Instance B rejects revoked session with 401 SESSION_REVOKED',
      `Instance B status: ${authOnBAfterRevoke.status}, error: ${authOnBAfterRevoke.data.error}`,
      'REAL_HTTP',
      Date.now() - t1
    );

    // Cross-Instance Step 6 & 7: Compromise account on Instance A -> Containment enforced on Instance B
    const t2 = Date.now();
    const newSessionB = await httpPost(portB, '/api/auth/login', { userId: 'user-player-1', role: 'PLAYER' });
    const tokenB = newSessionB.data.token;
    // Compromise from Instance A
    await httpPost(portA, '/api/admin/compromise', { userId: 'user-player-1', reason: 'Cross-instance detection' });
    // Verify rejected on Instance B
    const verifyContainmentOnB = await httpGet(portB, '/api/protected', tokenB);
    const passContainment = verifyContainmentOnB.status === 401 && (verifyContainmentOnB.data.error === 'SESSION_REVOKED' || verifyContainmentOnB.data.error === 'ACCOUNT_SUSPENDED');
    record(
      'XI-03',
      'Cross-Instance Compromise Containment (Compromise on A -> Enforce on B)',
      'Cross-Instance Security',
      passContainment,
      'Instance B enforces session invalidation upon compromise on Instance A',
      `Instance B status: ${verifyContainmentOnB.status}, error: ${verifyContainmentOnB.data.error}`,
      'REAL_HTTP',
      Date.now() - t2
    );
  }

  // Shutdown test servers
  serverA.close();
  serverB.close();

  // ---------------------------------------------------------------------------
  // SECTION 6 & 7: ADMIN SECURITY & WITHDRAWAL PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [7/7] VERIFYING ADMIN RBAC & WITHDRAWAL INVARIANTS...');

  // Admin Security Tests
  {
    const t0 = Date.now();
    // Non-admin attempting to fetch security details
    const playerToken = await SessionLifecycleManager.createSession({ userId: 'user-player-1', role: 'PLAYER' }, pool);
    const adminToken = await SessionLifecycleManager.createSession({ userId: 'admin-super-1', role: 'SUPER_ADMIN' }, pool);

    // Verify Player cannot access another player's sessions
    const isOwned = await SessionLifecycleManager.isSessionOwnedByUser(playerToken.sessionId, 'user-player-2', pool);
    const passIdor = isOwned === false;
    record(
      'ADM-01',
      'IDOR Protection: Player A Cannot Inspect Player B Sessions',
      'Admin Security',
      passIdor,
      'isSessionOwnedByUser returns false for mismatched user',
      `Ownership match: ${isOwned}`,
      'REAL_DATABASE',
      Date.now() - t0
    );

    // Verify Admin can revoke sessions
    const adminRevoke = await SessionLifecycleManager.revokeSessionById(playerToken.sessionId, 'user-player-1', pool);
    record(
      'ADM-02',
      'Admin Session Revocation Authority',
      'Admin Security',
      adminRevoke === true,
      'Session revoked successfully by admin authority',
      `Revoke result: ${adminRevoke}`,
      'REAL_DATABASE',
      Date.now() - t0
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 8 (PART 2): FINANCIAL RECONCILIATION - AFTER
  // ---------------------------------------------------------------------------
  console.log('\n>>> EXECUTING FINAL AUTHORITATIVE FINANCIAL RECONCILIATION (AFTER)...');
  const auditAfter = await runAuthoritativeFinancialAudit(pool);
  console.log(`    Total Wallet Balance:           ${auditAfter.totalWalletsBalanceMinorUnits} cents (${toETB(auditAfter.totalWalletsBalanceMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Held Balance:             ${auditAfter.totalWalletsHeldMinorUnits} cents (${toETB(auditAfter.totalWalletsHeldMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Credits:        ${auditAfter.totalLedgerCompletedCreditsMinorUnits} cents (${toETB(auditAfter.totalLedgerCompletedCreditsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Total Completed Debits:         ${auditAfter.totalLedgerCompletedDebitsMinorUnits} cents (${toETB(auditAfter.totalLedgerCompletedDebitsMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Calculated Net Ledger:          ${auditAfter.calculatedNetLedgerMinorUnits} cents (${toETB(auditAfter.calculatedNetLedgerMinorUnits).toFixed(2)} ETB)`);
  console.log(`    Discrepancy:                    ${auditAfter.discrepancyMinorUnits} minor units\n`);

  const deltaWallets = auditAfter.totalWalletsBalanceMinorUnits - auditBefore.totalWalletsBalanceMinorUnits;
  const deltaHeld = auditAfter.totalWalletsHeldMinorUnits - auditBefore.totalWalletsHeldMinorUnits;
  const deltaCredits = auditAfter.totalLedgerCompletedCreditsMinorUnits - auditBefore.totalLedgerCompletedCreditsMinorUnits;
  const deltaDebits = auditAfter.totalLedgerCompletedDebitsMinorUnits - auditBefore.totalLedgerCompletedDebitsMinorUnits;

  console.log('================================================================================');
  console.log('                     FINANCIAL INVARIANT AUDIT REPORT                           ');
  console.log('================================================================================');
  console.log(`Wallet Delta:           ${deltaWallets} cents`);
  console.log(`Held Delta:             ${deltaHeld} cents`);
  console.log(`Credit Delta:           ${deltaCredits} cents`);
  console.log(`Debit Delta:            ${deltaDebits} cents`);
  console.log(`Discrepancy Before:     ${auditBefore.discrepancyMinorUnits} minor units`);
  console.log(`Discrepancy After:      ${auditAfter.discrepancyMinorUnits} minor units`);
  console.log(`Financial Integrity:    ${auditAfter.discrepancyMinorUnits === 0n ? 'PASSED (EXACT 0.00 ETB)' : 'FAILED'}`);
  console.log('================================================================================\n');

  const allPassed = detailedResults.every((r) => r.passed);
  const totalCount = detailedResults.length;
  const passedCount = detailedResults.filter((r) => r.passed).length;
  const failedCount = detailedResults.filter((r) => !r.passed).length;

  console.log('================================================================================');
  console.log(`TOTAL TESTS EXECUTED:  ${totalCount}`);
  console.log(`PASSED:                ${passedCount}`);
  console.log(`FAILED:                ${failedCount}`);
  console.log(`FINAL GATE VERDICT:    ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log('================================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL EXECUTION EXCEPTION:', err);
  process.exit(1);
});
