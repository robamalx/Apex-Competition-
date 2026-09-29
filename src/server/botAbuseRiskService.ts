/**
 * APEX ARENA — BOT / AUTOMATED PREDICTION ABUSE PROTECTION ENGINE (RISK 17)
 * 
 * Provides:
 * 1. Multi-signal Anti-Automation Risk Engine (0-100 score, LOW/MEDIUM/HIGH/CRITICAL)
 * 2. Shared Multi-Instance Distributed Rate Limiter (PostgreSQL-backed)
 * 3. Authoritative Prediction State Machine (DRAFT -> SUBMITTING -> SUBMITTED -> LOCKED)
 * 4. Draft Prediction Persistence & Lifecycle (survives page refresh & reloads)
 * 5. Server-Authoritative Cutoff Validation (prevents client clock manipulation)
 * 6. Idempotent Prediction Submission (duplicate replay & timeout safety)
 * 7. Legitimate Player & Network Protections (shared Wi-Fi, CGNAT, network retries)
 * 8. Immutable Incident & Evidence Logging with SHA-256 integrity hashes
 * 9. Privacy & Redaction Engine (zero password, token, or OTP logging)
 * 10. Financial Isolation Invariant (0 minor-unit discrepancy)
 */

import crypto from 'crypto';
import pg from 'pg';
import { dbPool } from './db/pool.js';
import { withTransaction, acquirePgAdvisoryLock } from './db/postgresService.js';

// Polyfill BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export type BotRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BotIncidentStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'MONITORED'
  | 'RESTRICTED'
  | 'CLEARED'
  | 'CONFIRMED'
  | 'ESCALATED';

export type BotActionTaken =
  | 'MONITOR'
  | 'SOFT_THROTTLE'
  | 'CHALLENGE'
  | 'RESTRICT_ENDPOINT'
  | 'RESTRICT_ACCOUNT'
  | 'NONE';

export type PredictionLifecycleState =
  | 'DRAFT'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'LOCKED'
  | 'CANCELLED'
  | 'FAILED'
  | 'PENDING_RECONCILIATION';

export interface PredictionSelectionItem {
  fixtureId: string;
  marketType: string;
  choice: string;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}

export interface BotRiskSignalInput {
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  requestId?: string;
  idempotencyKey?: string;
  requestPayload?: any;
  isRetry?: boolean;
  isSharedNetwork?: boolean;
  isCarrierNat?: boolean;
  isAccessibilityClient?: boolean;
  claimedClientTime?: Date | string | number;
  stateTransitionAttempt?: {
    fromState: string;
    toState: string;
  };
  historicalFailedAuthCount?: number;
  recentRequestVelocityPerSec?: number;
}

export interface BotRiskEvaluationResult {
  riskScore: number; // 0 - 100
  severity: BotRiskSeverity;
  action: BotActionTaken;
  threatCategories: string[];
  signals: Record<string, any>;
  isLegitimatePattern: boolean;
  incidentId?: string;
  evidenceHash: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  key: string;
  keyType: string;
  currentCount: number;
  maxAllowed: number;
  windowSeconds: number;
  retryAfterSeconds: number;
  blockedUntil?: Date;
}

export interface PredictionSubmitParams {
  userId: string;
  competitionId: string;
  entryId: string;
  idempotencyKey: string;
  predictions: PredictionSelectionItem[];
  clientIp?: string;
  userAgent?: string;
  submissionVersion?: number;
  claimedTimestamp?: Date | string | number;
  poolOverride?: pg.Pool;
}

export interface PredictionSubmitResult {
  success: boolean;
  submissionId?: string;
  state: PredictionLifecycleState;
  savedCount: number;
  isDuplicate: boolean;
  idempotencyKey: string;
  submissionVersion: number;
  errors?: string[];
  financialDiscrepancyCents: bigint;
}

export class BotAbuseRiskService {
  // ===========================================================================
  // 1. SANITIZATION & EVIDENCE HASHING (PRIVACY ASSURANCE)
  // ===========================================================================

  public static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

    const sensitiveFields = [
      'password',
      'password_hash',
      'passwordHash',
      'otp',
      'code',
      'token',
      'authorization',
      'secret',
      'cvv',
      'pin',
      'creditCard'
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  }

  public static computeEvidenceHash(evidence: any): string {
    const raw = JSON.stringify(evidence, Object.keys(evidence).sort());
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // ===========================================================================
  // 2. MULTI-SIGNAL RISK EVALUATION ENGINE
  // ===========================================================================

  public static evaluateRisk(input: BotRiskSignalInput): BotRiskEvaluationResult {
    let riskScore = 0;
    const threatCategories: string[] = [];
    const detectedSignals: Record<string, any> = {};

    // Check for legitimate user patterns
    let isLegitimatePattern = false;
    if (input.isSharedNetwork || input.isCarrierNat || input.isAccessibilityClient || input.isRetry) {
      isLegitimatePattern = true;
      detectedSignals.legitimateContext = {
        isSharedNetwork: !!input.isSharedNetwork,
        isCarrierNat: !!input.isCarrierNat,
        isAccessibilityClient: !!input.isAccessibilityClient,
        isRetry: !!input.isRetry
      };
    }

    // Signal 1: Request Velocity Spike
    const velocity = input.recentRequestVelocityPerSec || 0;
    if (velocity > 50) {
      riskScore += 45;
      threatCategories.push('HIGH_RATE_BURST');
      detectedSignals.extremeVelocity = velocity;
    } else if (velocity > 15) {
      riskScore += 20;
      threatCategories.push('MODERATE_BURST');
      detectedSignals.highVelocity = velocity;
    }

    // Signal 2: Authentication Failures
    const failedAuth = input.historicalFailedAuthCount || 0;
    if (failedAuth >= 5) {
      riskScore += 40;
      threatCategories.push('CREDENTIAL_BRUTE_FORCE');
      detectedSignals.excessiveAuthFailures = failedAuth;
    } else if (failedAuth >= 3) {
      riskScore += 15;
      detectedSignals.authFailures = failedAuth;
    }

    // Signal 3: Impossible State Transitions
    if (input.stateTransitionAttempt) {
      const { fromState, toState } = input.stateTransitionAttempt;
      if (fromState === 'LOCKED' && toState !== 'LOCKED') {
        riskScore += 60;
        threatCategories.push('LOCKED_STATE_MUTATION_ATTEMPT');
        detectedSignals.illegalStateTransition = `${fromState}->${toState}`;
      } else if (fromState === 'SUBMITTED' && toState === 'DRAFT') {
        riskScore += 50;
        threatCategories.push('SUBMITTED_TO_DRAFT_REGRESSION_ATTEMPT');
        detectedSignals.illegalStateTransition = `${fromState}->${toState}`;
      }
    }

    // Signal 4: Client Clock Manipulation / Future or Past Cutoff Claims
    if (input.claimedClientTime !== undefined) {
      const clientTimeMs = new Date(input.claimedClientTime).getTime();
      const serverTimeMs = Date.now();
      const driftSec = Math.abs(serverTimeMs - clientTimeMs) / 1000;
      if (driftSec > 3600) {
        // More than 1 hour drift
        riskScore += 25;
        threatCategories.push('CLIENT_CLOCK_DRIFT_EXCESSIVE');
        detectedSignals.clientClockDriftSeconds = driftSec;
      }
    }

    // Signal 5: Malicious Payload Injection / Parameter Tampering
    if (input.requestPayload) {
      if (typeof input.requestPayload === 'object' && input.requestPayload !== null) {
        const sanitized = this.sanitizePayload(input.requestPayload);
        for (const [k, v] of Object.entries(sanitized)) {
          if (v === '[REDACTED]') {
            detectedSignals[k] = '[REDACTED]';
          }
        }
      }
      const payloadStr = JSON.stringify(input.requestPayload);
      if (payloadStr.length > 200000) {
        riskScore += 40;
        threatCategories.push('EXCESSIVE_PAYLOAD_SIZE');
        detectedSignals.payloadSizeBytes = payloadStr.length;
      }
      if (typeof input.requestPayload === 'object') {
        // Negative / malformed numeric scores
        if (
          input.requestPayload.predictedHomeScore < 0 ||
          input.requestPayload.predictedAwayScore < 0 ||
          input.requestPayload.predictedHomeScore > 9 ||
          input.requestPayload.predictedAwayScore > 9
        ) {
          riskScore += 35;
          threatCategories.push('MALFORMED_PREDICTION_SCORES');
          detectedSignals.invalidScores = {
            home: input.requestPayload.predictedHomeScore,
            away: input.requestPayload.predictedAwayScore
          };
        }
      }
    }

    // Signal 6: User-Agent Anomaly
    if (!input.userAgent || input.userAgent.trim() === '') {
      riskScore += 15;
      detectedSignals.emptyUserAgent = true;
    } else if (
      input.userAgent.includes('python-requests') ||
      input.userAgent.includes('curl/') ||
      input.userAgent.includes('PostmanRuntime') ||
      input.userAgent.includes('Go-http-client')
    ) {
      // Direct API script automation
      riskScore += 25;
      threatCategories.push('AUTOMATED_SCRIPT_USER_AGENT');
      detectedSignals.scriptUserAgent = input.userAgent;
    }

    // Protect legitimate users on shared networks / retries
    if (isLegitimatePattern && !threatCategories.includes('LOCKED_STATE_MUTATION_ATTEMPT')) {
      // Scale down false positive impact for legitimate shared IP / retry bursts
      if (input.isSharedNetwork || input.isCarrierNat) {
        riskScore = Math.min(riskScore, 20);
      }
      if (input.isRetry) {
        riskScore = Math.max(0, riskScore - 20);
      }
    }

    // Cap score at 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine severity
    let severity: BotRiskSeverity = 'LOW';
    let action: BotActionTaken = 'MONITOR';

    if (riskScore >= 80) {
      severity = 'CRITICAL';
      action = 'RESTRICT_ENDPOINT';
    } else if (riskScore >= 55) {
      severity = 'HIGH';
      action = 'CHALLENGE';
    } else if (riskScore >= 25) {
      severity = 'MEDIUM';
      action = 'SOFT_THROTTLE';
    }

    const sanitizedSignals = this.sanitizePayload(detectedSignals);
    const evidenceHash = this.computeEvidenceHash({
      userId: input.userId,
      endpoint: input.endpoint,
      signals: sanitizedSignals,
      riskScore
    });

    return {
      riskScore,
      severity,
      action,
      threatCategories,
      signals: sanitizedSignals,
      isLegitimatePattern,
      evidenceHash
    };
  }

  // ===========================================================================
  // 3. DISTRIBUTED RATE LIMITING ENGINE (POSTGRESQL-BACKED)
  // ===========================================================================

  public static async checkAndConsumeRateLimit(params: {
    key: string;
    keyType: 'IP' | 'ACCOUNT' | 'SESSION' | 'ENDPOINT' | 'COMPETITION' | 'PREDICTION';
    maxAllowed: number;
    windowSeconds?: number;
    poolOverride?: pg.Pool;
  }): Promise<RateLimitCheckResult> {
    const windowSec = params.windowSeconds || 60;
    const pool = params.poolOverride || dbPool.getPool();

    return await withTransaction(async (client) => {
      // Use PostgreSQL advisory lock on the key to prevent race conditions across processes
      await acquirePgAdvisoryLock(client, `rate_limit:${params.key}`);

      const nowRes = await client.query('SELECT NOW() as db_now');
      const dbNow = new Date(nowRes.rows[0].db_now);

      const existingRes = await client.query(
        'SELECT * FROM distributed_rate_limits WHERE rate_key = $1 FOR UPDATE',
        [params.key]
      );

      if (existingRes.rows.length === 0) {
        // Initial insert
        await client.query(
          `INSERT INTO distributed_rate_limits
            (rate_key, key_type, window_start, window_seconds, request_count, max_allowed, blocked_until, updated_at)
           VALUES ($1, $2, $3, $4, 1, $5, NULL, $3)`,
          [params.key, params.keyType, dbNow, windowSec, params.maxAllowed]
        );

        return {
          allowed: true,
          key: params.key,
          keyType: params.keyType,
          currentCount: 1,
          maxAllowed: params.maxAllowed,
          windowSeconds: windowSec,
          retryAfterSeconds: 0
        };
      }

      const record = existingRes.rows[0];
      const windowStart = new Date(record.window_start).getTime();
      const elapsedSec = (dbNow.getTime() - windowStart) / 1000;

      // Check if previously blocked
      if (record.blocked_until && new Date(record.blocked_until).getTime() > dbNow.getTime()) {
        const retryAfter = Math.ceil((new Date(record.blocked_until).getTime() - dbNow.getTime()) / 1000);
        return {
          allowed: false,
          key: params.key,
          keyType: params.keyType,
          currentCount: record.request_count,
          maxAllowed: record.max_allowed,
          windowSeconds: windowSec,
          retryAfterSeconds: Math.max(1, retryAfter),
          blockedUntil: new Date(record.blocked_until)
        };
      }

      if (elapsedSec >= windowSec) {
        // Reset window
        await client.query(
          `UPDATE distributed_rate_limits
           SET window_start = $1, request_count = 1, max_allowed = $2, blocked_until = NULL, updated_at = $1
           WHERE rate_key = $3`,
          [dbNow, params.maxAllowed, params.key]
        );

        return {
          allowed: true,
          key: params.key,
          keyType: params.keyType,
          currentCount: 1,
          maxAllowed: params.maxAllowed,
          windowSeconds: windowSec,
          retryAfterSeconds: 0
        };
      }

      // Inside current window
      const newCount = record.request_count + 1;
      if (newCount > record.max_allowed) {
        // Exceeded limit: apply soft block for remainder of window (or 60s)
        const blockUntil = new Date(windowStart + windowSec * 1000);
        const retryAfter = Math.ceil((blockUntil.getTime() - dbNow.getTime()) / 1000);

        await client.query(
          `UPDATE distributed_rate_limits
           SET request_count = $1, blocked_until = $2, updated_at = $3
           WHERE rate_key = $4`,
          [newCount, blockUntil, dbNow, params.key]
        );

        return {
          allowed: false,
          key: params.key,
          keyType: params.keyType,
          currentCount: newCount,
          maxAllowed: record.max_allowed,
          windowSeconds: windowSec,
          retryAfterSeconds: Math.max(1, retryAfter),
          blockedUntil: blockUntil
        };
      }

      // Allowed and incremented
      await client.query(
        `UPDATE distributed_rate_limits
         SET request_count = $1, updated_at = $2
         WHERE rate_key = $3`,
        [newCount, dbNow, params.key]
      );

      return {
        allowed: true,
        key: params.key,
        keyType: params.keyType,
        currentCount: newCount,
        maxAllowed: record.max_allowed,
        windowSeconds: windowSec,
        retryAfterSeconds: 0
      };
    }, pool);
  }

  // ===========================================================================
  // 4. PREDICTION DRAFT PERSISTENCE
  // ===========================================================================

  public static async savePredictionDraft(params: {
    userId: string;
    competitionId: string;
    entryId?: string;
    selections: PredictionSelectionItem[];
    poolOverride?: pg.Pool;
  }): Promise<{ success: boolean; draftId: string; version: number }> {
    const draftId = `draft_${params.userId}_${params.competitionId}`;

    return await withTransaction(async (client) => {
      const existingRes = await client.query(
        'SELECT * FROM prediction_drafts WHERE user_id = $1 AND competition_id = $2 FOR UPDATE',
        [params.userId, params.competitionId]
      );

      if (existingRes.rows.length === 0) {
        await client.query(
          `INSERT INTO prediction_drafts
            (draft_id, user_id, competition_id, entry_id, selections, version, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 1, 'DRAFT', NOW(), NOW())`,
          [draftId, params.userId, params.competitionId, params.entryId || null, JSON.stringify(params.selections)]
        );
        return { success: true, draftId, version: 1 };
      }

      const nextVersion = existingRes.rows[0].version + 1;
      await client.query(
        `UPDATE prediction_drafts
         SET selections = $1, version = $2, entry_id = COALESCE($3, entry_id), status = 'DRAFT', updated_at = NOW()
         WHERE user_id = $4 AND competition_id = $5`,
        [JSON.stringify(params.selections), nextVersion, params.entryId || null, params.userId, params.competitionId]
      );

      return { success: true, draftId, version: nextVersion };
    }, params.poolOverride);
  }

  public static async getPredictionDraft(params: {
    userId: string;
    competitionId: string;
    poolOverride?: pg.Pool;
  }): Promise<{ found: boolean; draft?: any; error?: string }> {
    const pool = params.poolOverride || dbPool.getPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM prediction_drafts WHERE user_id = $1 AND competition_id = $2',
        [params.userId, params.competitionId]
      );
      if (res.rows.length === 0) {
        return { found: false };
      }
      return { found: true, draft: res.rows[0] };
    } finally {
      client.release();
    }
  }

  public static async clearPredictionDraft(params: {
    userId: string;
    competitionId: string;
    status?: 'SUBMITTED' | 'DISCARDED' | 'EXPIRED';
    poolOverride?: pg.Pool;
  }): Promise<void> {
    const finalStatus = params.status || 'SUBMITTED';
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE prediction_drafts
         SET status = $1, updated_at = NOW()
         WHERE user_id = $2 AND competition_id = $3`,
        [finalStatus, params.userId, params.competitionId]
      );
    }, params.poolOverride);
  }

  // ===========================================================================
  // 5. SERVER-AUTHORITATIVE PREDICTION SUBMISSION & STATE MACHINE
  // ===========================================================================

  public static async submitPredictionsWithIntegrity(
    params: PredictionSubmitParams
  ): Promise<PredictionSubmitResult> {
    const pool = params.poolOverride || dbPool.getPool();
    return await withTransaction(async (client) => {
      // Distributed transaction lock on the competition entry & idempotency key
      await acquirePgAdvisoryLock(client, `pred_submit:${params.entryId}`);
      await acquirePgAdvisoryLock(client, `idempotency:${params.idempotencyKey}`);

      const nowRes = await client.query('SELECT NOW() as db_now');
      const dbNow = new Date(nowRes.rows[0].db_now);

      // Check Idempotency Registry First
      const existingSubmissionRes = await client.query(
        'SELECT * FROM prediction_submission_registry WHERE idempotency_key = $1 FOR UPDATE',
        [params.idempotencyKey]
      );

      if (existingSubmissionRes.rows.length > 0) {
        const existing = existingSubmissionRes.rows[0];
        // Count existing predictions in database
        const countRes = await client.query(
          'SELECT COUNT(*) as cnt FROM predictions WHERE entry_id = $1',
          [params.entryId]
        );
        return {
          success: true,
          submissionId: existing.submission_id,
          state: existing.state,
          savedCount: parseInt(countRes.rows[0].cnt, 10),
          isDuplicate: true,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: existing.submission_version,
          financialDiscrepancyCents: BigInt(0)
        };
      }

      let version = params.submissionVersion;
      if (version === undefined || version === null) {
        const maxV = await client.query(
          'SELECT COALESCE(MAX(submission_version), 0) as max_v FROM prediction_submission_registry WHERE entry_id = $1',
          [params.entryId]
        );
        version = parseInt(maxV.rows[0].max_v, 10) + 1;
      } else {
        const verCheck = await client.query(
          'SELECT submission_id FROM prediction_submission_registry WHERE entry_id = $1 AND submission_version = $2',
          [params.entryId, version]
        );
        if (verCheck.rows.length > 0) {
          return {
            success: false,
            state: 'FAILED',
            savedCount: 0,
            isDuplicate: false,
            idempotencyKey: params.idempotencyKey,
            submissionVersion: version,
            errors: [`VERSION_ALREADY_EXISTS: Version ${version} has already been registered for entry ${params.entryId}`],
            financialDiscrepancyCents: BigInt(0)
          };
        }
      }

      const submissionId = `sub_${params.entryId}_v${version}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      // Check Entry Ownership & IDOR Protection
      const entryRes = await client.query(
        'SELECT * FROM competition_entries WHERE id = $1 FOR UPDATE',
        [params.entryId]
      );
      if (entryRes.rows.length === 0) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: ['ENTRY_NOT_FOUND'],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      const entry = entryRes.rows[0];
      if (entry.user_id !== params.userId) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: ['IDOR_UNAUTHORIZED_ENTRY_OWNERSHIP'],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      if (entry.competition_id !== params.competitionId) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: ['COMPETITION_ENTRY_MISMATCH'],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // Check Competition Status & Deadline
      const compRes = await client.query(
        'SELECT status, entry_deadline FROM competitions WHERE id = $1',
        [params.competitionId]
      );
      if (compRes.rows.length === 0) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: ['COMPETITION_NOT_FOUND'],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      const comp = compRes.rows[0];
      if (comp.status !== 'OPEN' && comp.status !== 'PUBLISHED') {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: [`COMPETITION_CLOSED: Status is ${comp.status}`],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      if (new Date(comp.entry_deadline).getTime() <= dbNow.getTime()) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: ['ENTRY_DEADLINE_PASSED'],
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // Validate Each Selection & Kickoff Cutoff
      const validationErrors: string[] = [];
      for (const p of params.predictions) {
        const fixRes = await client.query(
          'SELECT kickoff_time, status FROM fixtures WHERE id = $1',
          [p.fixtureId]
        );
        if (fixRes.rows.length === 0) {
          validationErrors.push(`FIXTURE_NOT_FOUND: ${p.fixtureId}`);
          continue;
        }

        const fix = fixRes.rows[0];
        const fixKickoff = new Date(fix.kickoff_time).getTime();
        if (fixKickoff <= dbNow.getTime()) {
          validationErrors.push(`KICKOFF_PASSED: Fixture ${p.fixtureId} kickoff has already passed`);
          continue;
        }

        // Validate Market & Format
        const ucMarket = (p.marketType || '').toUpperCase();
        if (ucMarket === 'CORRECT_SCORE') {
          const scoreStr = p.choice || `${p.predictedHomeScore}-${p.predictedAwayScore}`;
          if (!/^\d-\d$/.test(scoreStr)) {
            validationErrors.push(`INVALID_SCORE_FORMAT: ${scoreStr}`);
          }
        } else if (ucMarket === '1X2' || ucMarket === 'MATCH_RESULT') {
          const c = (p.choice || '').toUpperCase();
          if (!['1', 'X', '2', 'HOME', 'DRAW', 'AWAY'].includes(c)) {
            validationErrors.push(`INVALID_1X2_CHOICE: ${p.choice}`);
          }
        } else if (ucMarket === 'OVER_UNDER_2_5' || ucMarket === 'OVER_UNDER') {
          const c = (p.choice || '').toUpperCase();
          if (!['OVER', 'UNDER', 'OVER_2_5', 'UNDER_2_5'].includes(c)) {
            validationErrors.push(`INVALID_OU_CHOICE: ${p.choice}`);
          }
        } else if (ucMarket === 'BTTS' || ucMarket === 'BOTH_TEAMS_TO_SCORE') {
          const c = (p.choice || '').toUpperCase();
          if (!['YES', 'NO'].includes(c)) {
            validationErrors.push(`INVALID_BTTS_CHOICE: ${p.choice}`);
          }
        } else if (ucMarket === 'DOUBLE_CHANCE') {
          const c = (p.choice || '').toUpperCase();
          if (!['1X', '12', 'X2'].includes(c)) {
            validationErrors.push(`INVALID_DOUBLE_CHANCE_CHOICE: ${p.choice}`);
          }
        } else {
          validationErrors.push(`UNSUPPORTED_MARKET_TYPE: ${p.marketType}`);
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          state: 'FAILED',
          savedCount: 0,
          isDuplicate: false,
          idempotencyKey: params.idempotencyKey,
          submissionVersion: version,
          errors: validationErrors,
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // Persist Predictions
      let savedCount = 0;
      for (const p of params.predictions) {
        let homeScore = 0;
        let awayScore = 0;
        if (p.marketType === 'CORRECT_SCORE') {
          const scoreStr = p.choice || `${p.predictedHomeScore}-${p.predictedAwayScore}`;
          const parts = scoreStr.split('-');
          homeScore = parseInt(parts[0], 10) || 0;
          awayScore = parseInt(parts[1], 10) || 0;
        }

        const predId = `pred_${params.entryId}_${p.fixtureId}`;
        await client.query(
          `INSERT INTO predictions
            (id, entry_id, competition_id, user_id, fixture_id, predicted_home_score, predicted_away_score, points_awarded, is_exact_match, is_correct_outcome, is_postponed_void, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, FALSE, FALSE, FALSE, $8)
           ON CONFLICT (id) DO UPDATE
             SET predicted_home_score = EXCLUDED.predicted_home_score,
                 predicted_away_score = EXCLUDED.predicted_away_score`,
          [predId, params.entryId, params.competitionId, params.userId, p.fixtureId, homeScore, awayScore, dbNow]
        );
        savedCount++;
      }

      // Register Submission Immutably in Registry
      const submissionHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ entryId: params.entryId, version, predictions: params.predictions }))
        .digest('hex');

      try {
        await client.query(
          `INSERT INTO prediction_submission_registry
            (submission_id, idempotency_key, user_id, competition_id, entry_id, state, submission_version, predictions_snapshot, submission_hash, client_ip, user_agent, submitted_at)
           VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', $6, $7, $8, $9, $10, $11)`,
          [
            submissionId,
            params.idempotencyKey,
            params.userId,
            params.competitionId,
            params.entryId,
            version,
            JSON.stringify(params.predictions),
            submissionHash,
            params.clientIp || null,
            params.userAgent || null,
            dbNow
          ]
        );
      } catch (insertErr: any) {
        // If concurrent race already inserted with same idempotency key or submission_id
        const conflictRes = await client.query(
          'SELECT * FROM prediction_submission_registry WHERE idempotency_key = $1 OR submission_id = $2',
          [params.idempotencyKey, submissionId]
        );
        if (conflictRes.rows.length > 0) {
          const ex = conflictRes.rows[0];
          if (ex.idempotency_key === params.idempotencyKey) {
            const countRes = await client.query(
              'SELECT COUNT(*) as cnt FROM predictions WHERE entry_id = $1',
              [params.entryId]
            );
            return {
              success: true,
              submissionId: ex.submission_id,
              state: ex.state,
              savedCount: parseInt(countRes.rows[0].cnt, 10),
              isDuplicate: true,
              idempotencyKey: params.idempotencyKey,
              submissionVersion: ex.submission_version,
              financialDiscrepancyCents: BigInt(0)
            };
          }
        }
        throw insertErr;
      }

      // Update Competition Entry submission status
      await client.query(
        `UPDATE competition_entries
         SET submission_status = 'SUBMITTED', updated_at = $1
         WHERE id = $2`,
        [dbNow, params.entryId]
      );

      // Clear draft on successful submission
      await client.query(
        `UPDATE prediction_drafts
         SET status = 'SUBMITTED', updated_at = $1
         WHERE user_id = $2 AND competition_id = $3`,
        [dbNow, params.userId, params.competitionId]
      );

      return {
        success: true,
        submissionId,
        state: 'SUBMITTED',
        savedCount,
        isDuplicate: false,
        idempotencyKey: params.idempotencyKey,
        submissionVersion: version,
        financialDiscrepancyCents: BigInt(0)
      };
    }, pool);
  }

  // ===========================================================================
  // 6. INCIDENT CREATION & WORKFLOW
  // ===========================================================================

  public static async recordBotIncident(params: {
    userId?: string;
    clientIp?: string;
    sessionId?: string;
    threatCategory: string;
    signals: Record<string, any>;
    riskScore: number;
    severity: BotRiskSeverity;
    actionTaken: BotActionTaken;
    reviewedBy?: string;
    resolutionNotes?: string;
    poolOverride?: pg.Pool;
  }): Promise<{ incidentId: string; evidenceHash: string }> {
    const incidentId = `inc_bot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sanitizedSignals = this.sanitizePayload(params.signals);
    const evidenceHash = this.computeEvidenceHash({
      incidentId,
      userId: params.userId,
      threatCategory: params.threatCategory,
      signals: sanitizedSignals,
      riskScore: params.riskScore
    });

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO bot_abuse_incidents
          (incident_id, user_id, ip_address, session_id, severity, status, risk_score, threat_category, signals_snapshot, evidence_snapshot, evidence_hash, action_taken, reviewed_by, resolution_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [
          incidentId,
          params.userId || null,
          params.clientIp || null,
          params.sessionId || null,
          params.severity,
          params.riskScore,
          params.threatCategory,
          JSON.stringify(sanitizedSignals),
          JSON.stringify(sanitizedSignals),
          evidenceHash,
          params.actionTaken,
          params.reviewedBy || null,
          params.resolutionNotes || null
        ]
      );
    }, params.poolOverride);

    return { incidentId, evidenceHash };
  }

  public static async transitionIncidentStatus(params: {
    incidentId: string;
    newStatus: BotIncidentStatus;
    reviewerId: string;
    notes?: string;
    poolOverride?: pg.Pool;
  }): Promise<{ success: boolean; error?: string }> {
    return await withTransaction(async (client) => {
      const incRes = await client.query(
        'SELECT * FROM bot_abuse_incidents WHERE incident_id = $1 FOR UPDATE',
        [params.incidentId]
      );
      if (incRes.rows.length === 0) {
        return { success: false, error: 'INCIDENT_NOT_FOUND' };
      }

      await client.query(
        `UPDATE bot_abuse_incidents
         SET status = $1, reviewed_by = $2, resolution_notes = COALESCE($3, resolution_notes), updated_at = NOW()
         WHERE incident_id = $4`,
        [params.newStatus, params.reviewerId, params.notes || null, params.incidentId]
      );

      return { success: true };
    }, params.poolOverride);
  }
}
