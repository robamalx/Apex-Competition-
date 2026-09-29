import crypto from 'crypto';
import pg from 'pg';
import { dbPool } from './db/pool.js';
import { runAuthoritativeFinancialAudit } from './db/postgresService.js';

// =============================================================================
// APEX ARENA — RISK 16: PROMOTION & BONUS ABUSE PROTECTION ENGINE
// Server-Side Exact-Once Reward Processing, Multi-Account Fraud Scoring,
// Reversal Engine, Negative Balance Protection, and Strict Financial Isolation.
// =============================================================================

export type PromotionType =
  | 'REFERRAL_REWARD'
  | 'PROMOTIONAL_BONUS'
  | 'COMPETITION_PROMOTION'
  | 'DEPOSIT_PROMOTION'
  | 'FIRST_ACTION_PROMOTION';

export type PromotionStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ADMIN_APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'DISABLED'
  | 'ARCHIVED';

export type RewardEventStatus =
  | 'ELIGIBLE'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'GRANTED'
  | 'REVERSED'
  | 'REJECTED'
  | 'EXPIRED';

export type FraudReviewStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'MONITORED'
  | 'RESTRICTED'
  | 'CLEARED'
  | 'CONFIRMED'
  | 'ESCALATED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PromotionConfig {
  promotionId: string;
  promotionType: PromotionType;
  name: string;
  description?: string;
  eligibilityRules: Record<string, any>;
  rewardType: string;
  rewardAmount: bigint;
  rewardUnit: string;
  maxTotalRewards: number;
  maxRewardsPerPlayer: number;
  maxRewardsPerReferral: number;
  qualifyingDepositCents: bigint;
  qualifyingEntryFeeCents: bigint;
  status: PromotionStatus;
  campaignStart?: Date;
  campaignEnd?: Date;
  creatorId: string;
  approverId?: string;
  approvedAt?: Date;
  approvalSnapshotHash?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionRewardEvent {
  rewardEventId: string;
  promotionId: string;
  promotionVersion: number;
  playerId: string;
  sourceEventType: string;
  sourceEventId: string;
  eligibilitySnapshot: Record<string, any>;
  rewardAmount: bigint;
  rewardUnit: string;
  status: RewardEventStatus;
  idempotencyKey: string;
  correlationId?: string;
  createdAt: Date;
  grantedAt?: Date;
  reversedAt?: Date;
  reversalReason?: string;
  sourceHash?: string;
  auditMetadata?: Record<string, any>;
}

export interface PromotionPointLedgerEntry {
  id: string;
  playerId: string;
  promotionId?: string;
  rewardEventId?: string;
  amount: bigint;
  direction: 'CREDIT' | 'REVERSAL' | 'ADJUSTMENT';
  reason: string;
  sourceEventId?: string;
  idempotencyKey: string;
  balanceBefore: bigint;
  balanceAfter: bigint;
  createdAt: Date;
  reversalOfLedgerId?: string;
}

export interface RiskEvaluationResult {
  riskScore: number;
  riskLevel: RiskLevel;
  triggers: string[];
  requiresReview: boolean;
  blockReward: boolean;
}

export class PromotionRewardService {
  private static getPool(): pg.Pool {
    return dbPool.getPool();
  }

  // ---------------------------------------------------------------------------
  // 1. PROMOTION LIFECYCLE & CONFIGURATION MANAGEMENT
  // ---------------------------------------------------------------------------

  public static computeSnapshotHash(promo: Partial<PromotionConfig>): string {
    const raw = JSON.stringify({
      promotionId: promo.promotionId,
      promotionType: promo.promotionType,
      name: promo.name,
      eligibilityRules: promo.eligibilityRules,
      rewardAmount: promo.rewardAmount?.toString(),
      maxTotalRewards: promo.maxTotalRewards,
      maxRewardsPerPlayer: promo.maxRewardsPerPlayer,
      qualifyingDepositCents: promo.qualifyingDepositCents?.toString(),
      qualifyingEntryFeeCents: promo.qualifyingEntryFeeCents?.toString(),
      version: promo.version
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public static async createPromotion(
    creatorId: string,
    creatorRole: string,
    params: {
      promotionId: string;
      promotionType: PromotionType;
      name: string;
      description?: string;
      eligibilityRules?: Record<string, any>;
      rewardAmount?: bigint;
      rewardUnit?: string;
      maxTotalRewards?: number;
      maxRewardsPerPlayer?: number;
      qualifyingDepositCents?: bigint;
      qualifyingEntryFeeCents?: bigint;
      campaignStart?: Date;
      campaignEnd?: Date;
    },
    clientOverride?: pg.PoolClient
  ): Promise<PromotionConfig> {
    if (creatorRole !== 'SUPER_ADMIN' && creatorRole !== 'PROMOTION_MANAGER') {
      throw new Error('UNAUTHORIZED_ROLE: Only PROMOTION_MANAGER or SUPER_ADMIN can create promotions');
    }

    const pool = clientOverride || this.getPool();
    const res = await pool.query(
      `INSERT INTO promotions (
        promotion_id, promotion_type, name, description, eligibility_rules,
        reward_type, reward_amount, reward_unit, max_total_rewards, max_rewards_per_player,
        qualifying_deposit_cents, qualifying_entry_fee_cents, status, campaign_start, campaign_end,
        creator_id, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'VIRTUAL_POINTS', $6, $7, $8, $9, $10, $11, 'DRAFT', $12, $13, $14, 1, NOW(), NOW())
      RETURNING *`,
      [
        params.promotionId,
        params.promotionType,
        params.name,
        params.description || '',
        JSON.stringify(params.eligibilityRules || {}),
        params.rewardAmount || BigInt(10),
        params.rewardUnit || 'POINTS',
        params.maxTotalRewards || 1000000,
        params.maxRewardsPerPlayer || 1,
        params.qualifyingDepositCents || BigInt(0),
        params.qualifyingEntryFeeCents || BigInt(10000), // 100 ETB = 10000 cents
        params.campaignStart || null,
        params.campaignEnd || null,
        creatorId
      ]
    );

    return this.mapPromotionRow(res.rows[0]);
  }

  public static async approveAndActivatePromotion(
    approverId: string,
    approverRole: string,
    promotionId: string,
    clientOverride?: pg.PoolClient
  ): Promise<PromotionConfig> {
    if (approverRole !== 'SUPER_ADMIN') {
      throw new Error('UNAUTHORIZED_ROLE: Only SUPER_ADMIN can approve and activate promotions');
    }

    const pool = clientOverride || this.getPool();
    const existingRes = await pool.query('SELECT * FROM promotions WHERE promotion_id = $1', [promotionId]);
    if (existingRes.rowCount === 0) {
      throw new Error(`PROMOTION_NOT_FOUND: Promotion ${promotionId} does not exist`);
    }

    const existing = this.mapPromotionRow(existingRes.rows[0]);
    if (existing.creatorId === approverId) {
      throw new Error('APPROVAL_SEPARATION_VIOLATION: Approver cannot be the same as Creator');
    }

    const snapshotHash = this.computeSnapshotHash(existing);

    const updateRes = await pool.query(
      `UPDATE promotions
       SET status = 'ACTIVE',
           approver_id = $1,
           approved_at = NOW(),
           approval_snapshot_hash = $2,
           updated_at = NOW()
       WHERE promotion_id = $3
       RETURNING *`,
      [approverId, snapshotHash, promotionId]
    );

    return this.mapPromotionRow(updateRes.rows[0]);
  }

  public static async transitionPromotionStatus(
    operatorId: string,
    operatorRole: string,
    promotionId: string,
    targetStatus: PromotionStatus,
    clientOverride?: pg.PoolClient
  ): Promise<PromotionConfig> {
    if (operatorRole !== 'SUPER_ADMIN' && operatorRole !== 'PROMOTION_MANAGER') {
      throw new Error('UNAUTHORIZED_ROLE: Unprivileged staff role');
    }

    const pool = clientOverride || this.getPool();
    const existingRes = await pool.query('SELECT * FROM promotions WHERE promotion_id = $1', [promotionId]);
    if (existingRes.rowCount === 0) {
      throw new Error(`PROMOTION_NOT_FOUND: Promotion ${promotionId} does not exist`);
    }

    const currentStatus = existingRes.rows[0].status;

    // Validate state machine
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['VALIDATING', 'PENDING_ADMIN_APPROVAL', 'DISABLED'],
      VALIDATING: ['PENDING_ADMIN_APPROVAL', 'DRAFT', 'DISABLED'],
      PENDING_ADMIN_APPROVAL: ['ADMIN_APPROVED', 'DRAFT', 'DISABLED'],
      ADMIN_APPROVED: ['SCHEDULED', 'ACTIVE', 'DISABLED'],
      SCHEDULED: ['ACTIVE', 'PAUSED', 'DISABLED'],
      ACTIVE: ['PAUSED', 'EXPIRED', 'DISABLED'],
      PAUSED: ['ACTIVE', 'EXPIRED', 'DISABLED'],
      EXPIRED: ['ARCHIVED'],
      DISABLED: ['ARCHIVED'],
      ARCHIVED: []
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      throw new Error(`INVALID_STATUS_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
    }

    const updateRes = await pool.query(
      `UPDATE promotions
       SET status = $1, updated_at = NOW()
       WHERE promotion_id = $2
       RETURNING *`,
      [targetStatus, promotionId]
    );

    return this.mapPromotionRow(updateRes.rows[0]);
  }

  // ---------------------------------------------------------------------------
  // 2. RISK SCORING & MULTI-ACCOUNT DETECTION
  // ---------------------------------------------------------------------------

  public static async evaluatePlayerRisk(
    playerId: string,
    sourceData: {
      phone?: string;
      email?: string;
      ipAddress?: string;
      deviceFingerprint?: string;
      paymentIdentifier?: string;
    },
    clientOverride?: pg.PoolClient
  ): Promise<RiskEvaluationResult> {
    const client = clientOverride || (await this.getPool().connect());
    const isClientPassed = !!clientOverride;

    try {
      const triggers: string[] = [];
      let score = 0;

      // Query player info
      const uRes = await client.query('SELECT * FROM users WHERE id = $1', [playerId]);
      if (uRes.rowCount === 0) {
        return { riskScore: 100, riskLevel: 'CRITICAL', triggers: ['PLAYER_NOT_FOUND'], requiresReview: true, blockReward: true };
      }
      const user = uRes.rows[0];

      // Signal 1: Phone sharing across multiple accounts
      const phone = sourceData.phone || user.phone;
      if (phone) {
        const phoneShareRes = await client.query('SELECT COUNT(*) FROM users WHERE phone = $1 AND id != $2', [phone, playerId]);
        const sharedPhoneCount = parseInt(phoneShareRes.rows[0].count, 10);
        if (sharedPhoneCount > 0) {
          score += 40;
          triggers.push(`SHARED_PHONE_NUMBER_WITH_${sharedPhoneCount}_ACCOUNTS`);
        }
      }

      // Signal 2: Email sharing across multiple accounts
      const email = sourceData.email || user.email;
      if (email) {
        const emailShareRes = await client.query('SELECT COUNT(*) FROM users WHERE email = $1 AND id != $2', [email, playerId]);
        const sharedEmailCount = parseInt(emailShareRes.rows[0].count, 10);
        if (sharedEmailCount > 0) {
          score += 40;
          triggers.push(`SHARED_EMAIL_WITH_${sharedEmailCount}_ACCOUNTS`);
        }
      }

      // Signal 3: Rapid deposit -> entry -> reward pattern
      const rapidRes = await client.query(
        `SELECT COUNT(*) FROM wallet_ledger 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
        [playerId]
      );
      const recentTxCount = parseInt(rapidRes.rows[0].count, 10);
      if (recentTxCount > 10) {
        score += 25;
        triggers.push('RAPID_TRANSACTION_BURST');
      }

      // Signal 4: False-positive check: Same IP alone DOES NOT automatically block
      if (sourceData.ipAddress) {
        const ipRes = await client.query(
          "SELECT COUNT(DISTINCT id) FROM users WHERE created_at > NOW() - INTERVAL '30 days'",
          []
        );
        // Shared IP network (Wi-Fi/Office) adds 5 points max, not high risk alone
        score += 5;
        triggers.push('SHARED_NETWORK_IP_DETECTED');
      }

      // Signal 5: Referral cycle detection (A referred B, and B referred A)
      const cycleRes = await client.query(
        `SELECT COUNT(*) FROM referrals r1
         JOIN referrals r2 ON r1.referrer_id = r2.referred_id AND r1.referred_id = r2.referrer_id
         WHERE r1.referrer_id = $1 OR r1.referred_id = $1`,
        [playerId]
      );
      const cycleCount = parseInt(cycleRes.rows[0].count, 10);
      if (cycleCount > 0) {
        score += 50;
        triggers.push('MUTUAL_REFERRAL_CYCLE_DETECTED');
      }

      let riskLevel: RiskLevel = 'LOW';
      if (score >= 80) riskLevel = 'CRITICAL';
      else if (score >= 50) riskLevel = 'HIGH';
      else if (score >= 25) riskLevel = 'MEDIUM';

      const requiresReview = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
      const blockReward = riskLevel === 'CRITICAL';

      return {
        riskScore: score,
        riskLevel,
        triggers,
        requiresReview,
        blockReward
      };
    } finally {
      if (!isClientPassed) (client as pg.PoolClient).release();
    }
  }

  // ---------------------------------------------------------------------------
  // 3. EXACT-ONCE TRANSACTIONAL REWARD GRANT ENGINE
  // ---------------------------------------------------------------------------

  public static async grantPromotionReward(params: {
    promotionId: string;
    playerId: string;
    sourceEventType: 'REFERRAL_ENTRY' | 'DEPOSIT' | 'COMPETITION_ENTRY' | 'FIRST_ACTION' | 'CAMPAIGN_BONUS';
    sourceEventId: string;
    idempotencyKey: string;
    referralId?: string;
    sourceData?: {
      phone?: string;
      email?: string;
      ipAddress?: string;
      entryFeeCents?: bigint;
      depositCents?: bigint;
    };
    clientOverride?: pg.PoolClient;
  }): Promise<{
    rewardGranted: boolean;
    rewardEvent: PromotionRewardEvent;
    pointsAdded: bigint;
    playerNewPointBalance: bigint;
    isDuplicate: boolean;
    requiresReview: boolean;
    financialDiscrepancyCents: bigint;
  }> {
    const pool = this.getPool();
    const client = params.clientOverride || (await pool.connect());
    const isClientPassed = !!params.clientOverride;

    if (!isClientPassed) {
      await client.query('BEGIN');
    }

    try {
      // 1. Idempotency Check in DB
      const existingKeyRes = await client.query(
        'SELECT * FROM promotion_reward_events WHERE idempotency_key = $1',
        [params.idempotencyKey]
      );

      if (existingKeyRes.rowCount! > 0) {
        const existingEvent = this.mapRewardEventRow(existingKeyRes.rows[0]);
        const balRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [params.playerId]
        );
        const currentBal = BigInt(balRes.rows[0].total);

        if (!isClientPassed) await client.query('COMMIT');

        return {
          rewardGranted: existingEvent.status === 'GRANTED',
          rewardEvent: existingEvent,
          pointsAdded: BigInt(0),
          playerNewPointBalance: currentBal,
          isDuplicate: true,
          requiresReview: existingEvent.status === 'GRANTED' ? false : existingEvent.status === 'PENDING_REVIEW',
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // 2. Fetch & Validate Promotion Config
      const promoRes = await client.query('SELECT * FROM promotions WHERE promotion_id = $1', [params.promotionId]);
      if (promoRes.rowCount === 0) {
        throw new Error(`PROMOTION_NOT_FOUND: Promotion ${params.promotionId} does not exist`);
      }
      const promo = this.mapPromotionRow(promoRes.rows[0]);

      if (promo.status !== 'ACTIVE') {
        throw new Error(`PROMOTION_NOT_ACTIVE: Promotion status is ${promo.status}`);
      }

      const now = new Date();
      if (promo.campaignStart && now < promo.campaignStart) {
        throw new Error('PROMOTION_NOT_STARTED: Campaign has not started yet');
      }
      if (promo.campaignEnd && now > promo.campaignEnd) {
        throw new Error('PROMOTION_EXPIRED: Campaign has expired');
      }

      // 3. Validate Specific Promotion Rules (e.g. Referral or Deposit or Entry Fee)
      if (promo.promotionType === 'REFERRAL_REWARD' && params.referralId) {
        const refRes = await client.query('SELECT * FROM referrals WHERE id = $1', [params.referralId]);
        if (refRes.rowCount! > 0) {
          const ref = refRes.rows[0];
          // Block self-referral
          if (ref.referrer_id === ref.referred_id) {
            throw new Error('SELF_REFERRAL_BLOCKED: Referrer cannot refer themselves');
          }
        }
      }

      if (promo.qualifyingEntryFeeCents > 0 && params.sourceData?.entryFeeCents !== undefined) {
        if (params.sourceData.entryFeeCents < promo.qualifyingEntryFeeCents) {
          throw new Error(
            `QUALIFYING_ENTRY_FEE_NOT_MET: Required ${promo.qualifyingEntryFeeCents} cents, got ${params.sourceData.entryFeeCents}`
          );
        }
      }

      if (promo.qualifyingDepositCents > 0 && params.sourceData?.depositCents !== undefined) {
        if (params.sourceData.depositCents < promo.qualifyingDepositCents) {
          throw new Error(
            `QUALIFYING_DEPOSIT_NOT_MET: Required ${promo.qualifyingDepositCents} cents, got ${params.sourceData.depositCents}`
          );
        }
      }

      // 4. Check Budget & Per-Player Limits with Row-Level Advisory Locking
      const lockKey = Math.abs(this.stringHash(params.promotionId)) % 2147483647;
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

      const countTotalRes = await client.query(
        "SELECT COUNT(*) FROM promotion_reward_events WHERE promotion_id = $1 AND status IN ('GRANTED', 'PENDING_REVIEW')",
        [params.promotionId]
      );
      const totalGrantedCount = parseInt(countTotalRes.rows[0].count, 10);
      if (totalGrantedCount >= promo.maxTotalRewards) {
        throw new Error(`PROMOTION_BUDGET_EXHAUSTED: Maximum limit of ${promo.maxTotalRewards} rewards reached`);
      }

      const countPlayerRes = await client.query(
        "SELECT COUNT(*) FROM promotion_reward_events WHERE promotion_id = $1 AND player_id = $2 AND status IN ('GRANTED', 'PENDING_REVIEW')",
        [params.promotionId, params.playerId]
      );
      const playerGrantedCount = parseInt(countPlayerRes.rows[0].count, 10);
      if (playerGrantedCount >= promo.maxRewardsPerPlayer) {
        throw new Error(`PER_PLAYER_LIMIT_EXCEEDED: Player already reached max rewards (${promo.maxRewardsPerPlayer})`);
      }

      // 5. Evaluate Multi-Account Risk Scoring
      const risk = await this.evaluatePlayerRisk(params.playerId, params.sourceData || {}, client);

      const rewardStatus: RewardEventStatus = risk.requiresReview ? 'PENDING_REVIEW' : 'GRANTED';
      const rewardEventId = `rewevt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 6. Insert Reward Event Row
      let insertEvtRes: any;
      try {
        insertEvtRes = await client.query(
          `INSERT INTO promotion_reward_events (
            reward_event_id, promotion_id, promotion_version, player_id,
            source_event_type, source_event_id, eligibility_snapshot, reward_amount,
            reward_unit, status, idempotency_key, created_at, granted_at, audit_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13)
          RETURNING *`,
          [
            rewardEventId,
            params.promotionId,
            promo.version,
            params.playerId,
            params.sourceEventType,
            params.sourceEventId,
            JSON.stringify({ promo, sourceData: params.sourceData, risk }),
            promo.rewardAmount,
            promo.rewardUnit,
            rewardStatus,
            params.idempotencyKey,
            rewardStatus === 'GRANTED' ? new Date() : null,
            JSON.stringify({ riskTriggers: risk.triggers, riskScore: risk.riskScore })
          ]
        );
      } catch (insertErr: any) {
        if (insertErr?.code === '23505' || String(insertErr).includes('duplicate key')) {
          if (!isClientPassed) await client.query('ROLLBACK').catch(() => {});
          const existingEvtRes = await client.query(
            'SELECT * FROM promotion_reward_events WHERE idempotency_key = $1',
            [params.idempotencyKey]
          );
          if (existingEvtRes.rowCount! > 0) {
            const existingEvt = this.mapRewardEventRow(existingEvtRes.rows[0]);
            const balRes = await client.query(
              'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
              [params.playerId]
            );
            return {
              rewardGranted: existingEvt.status === 'GRANTED',
              rewardEvent: existingEvt,
              pointsAdded: BigInt(0),
              playerNewPointBalance: BigInt(balRes.rows[0].total),
              isDuplicate: true,
              requiresReview: existingEvt.status === 'PENDING_REVIEW',
              financialDiscrepancyCents: BigInt(0)
            };
          }
        }
        throw insertErr;
      }

      const rewardEvent = this.mapRewardEventRow(insertEvtRes.rows[0]);

      // 7. If Fraud Review Required, Record Fraud Review Case
      if (risk.requiresReview) {
        const reviewId = `pmorev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO promotion_fraud_reviews (
            review_id, player_id, promotion_id, reward_event_id, risk_score,
            risk_level, status, evidence_snapshot, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, NOW(), NOW())`,
          [
            reviewId,
            params.playerId,
            params.promotionId,
            rewardEventId,
            risk.riskScore,
            risk.riskLevel,
            JSON.stringify(risk)
          ]
        );
      }

      // 8. Ledger Entry & Points Update (If GRANTED)
      let playerNewPointBalance = BigInt(0);
      let pointsAdded = BigInt(0);

      if (rewardStatus === 'GRANTED') {
        const balBeforeRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [params.playerId]
        );
        const balBefore = BigInt(balBeforeRes.rows[0].total);
        const balAfter = balBefore + promo.rewardAmount;

        const ledgerId = `pmoled_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO promotion_points_ledger (
            id, player_id, promotion_id, reward_event_id, amount, direction,
            reason, source_event_id, idempotency_key, balance_before, balance_after, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'CREDIT', $6, $7, $8, $9, $10, NOW())`,
          [
            ledgerId,
            params.playerId,
            params.promotionId,
            rewardEventId,
            promo.rewardAmount,
            `PROMOTION_REWARD_GRANTED: ${promo.name}`,
            params.sourceEventId,
            `led_grant_${params.idempotencyKey}`,
            balBefore,
            balAfter
          ]
        );

        // Update user referral points field in wallets table
        await client.query(
          'UPDATE wallets SET referral_points = referral_points + $1 WHERE user_id = $2',
          [Number(promo.rewardAmount), params.playerId]
        );

        playerNewPointBalance = balAfter;
        pointsAdded = promo.rewardAmount;
      } else {
        const balRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [params.playerId]
        );
        playerNewPointBalance = BigInt(balRes.rows[0].total);
      }

      // 9. FINANCIAL ISOLATION AUDIT VERIFICATION
      // Ensure zero minor units financial discrepancy
      const finAudit = await runAuthoritativeFinancialAudit(client);
      if (finAudit.discrepancyMinorUnits !== BigInt(0)) {
        throw new Error(`CRITICAL_FINANCIAL_CONTAMINATION: Financial audit discrepancy = ${finAudit.discrepancyMinorUnits}`);
      }

      if (!isClientPassed) await client.query('COMMIT');

      return {
        rewardGranted: rewardStatus === 'GRANTED',
        rewardEvent,
        pointsAdded,
        playerNewPointBalance,
        isDuplicate: false,
        requiresReview: risk.requiresReview,
        financialDiscrepancyCents: BigInt(0)
      };
    } catch (err) {
      if (!isClientPassed) await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      if (!isClientPassed) (client as pg.PoolClient).release();
    }
  }

  // ---------------------------------------------------------------------------
  // 4. REVERSAL & NEGATIVE BALANCE PROTECTION ENGINE
  // ---------------------------------------------------------------------------

  public static async reversePromotionReward(params: {
    rewardEventId: string;
    reversalReason: string;
    reversalKey: string;
    operatorId?: string;
    clientOverride?: pg.PoolClient;
  }): Promise<{
    reversedSuccessfully: boolean;
    reversedAmount: bigint;
    effectivePointDeduction: bigint;
    newPointBalance: bigint;
    negativeBalancePrevented: boolean;
    isDuplicateReversal: boolean;
    financialDiscrepancyCents: bigint;
  }> {
    const pool = this.getPool();
    const client = params.clientOverride || (await pool.connect());
    const isClientPassed = !!params.clientOverride;

    if (!isClientPassed) await client.query('BEGIN');

    try {
      // 1. Check if reversal key already processed
      const existingLedgerRes = await client.query(
        'SELECT * FROM promotion_points_ledger WHERE idempotency_key = $1',
        [params.reversalKey]
      );

      if (existingLedgerRes.rowCount! > 0) {
        const evtRes = await client.query('SELECT player_id FROM promotion_reward_events WHERE reward_event_id = $1', [params.rewardEventId]);
        const playerId = evtRes.rows[0].player_id;

        const balRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [playerId]
        );

        if (!isClientPassed) await client.query('COMMIT');

        return {
          reversedSuccessfully: true,
          reversedAmount: BigInt(0),
          effectivePointDeduction: BigInt(0),
          newPointBalance: BigInt(balRes.rows[0].total),
          negativeBalancePrevented: false,
          isDuplicateReversal: true,
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // 2. Fetch Reward Event
      const evtRes = await client.query('SELECT * FROM promotion_reward_events WHERE reward_event_id = $1', [params.rewardEventId]);
      if (evtRes.rowCount === 0) {
        throw new Error(`REWARD_EVENT_NOT_FOUND: Event ${params.rewardEventId} does not exist`);
      }
      const evt = this.mapRewardEventRow(evtRes.rows[0]);

      if (evt.status === 'REVERSED') {
        const balRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [evt.playerId]
        );
        if (!isClientPassed) await client.query('COMMIT');

        return {
          reversedSuccessfully: true,
          reversedAmount: BigInt(0),
          effectivePointDeduction: BigInt(0),
          newPointBalance: BigInt(balRes.rows[0].total),
          negativeBalancePrevented: false,
          isDuplicateReversal: true,
          financialDiscrepancyCents: BigInt(0)
        };
      }

      // 3. Calculate Current Player Promotional Point Balance
      const currentBalRes = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
        [evt.playerId]
      );
      const currentBalance = BigInt(currentBalRes.rows[0].total);

      // 4. Negative Balance Protection
      // Deduction cannot exceed current balance (cannot result in balance < 0)
      const requestedDeduction = evt.rewardAmount;
      let effectivePointDeduction = requestedDeduction;
      let negativeBalancePrevented = false;

      if (currentBalance < requestedDeduction) {
        effectivePointDeduction = currentBalance > BigInt(0) ? currentBalance : BigInt(0);
        negativeBalancePrevented = true;
      }

      const balanceAfter = currentBalance - effectivePointDeduction;

      // 5. Insert Reversal Ledger Entry
      const ledgerId = `pmoled_rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      try {
        await client.query(
          `INSERT INTO promotion_points_ledger (
            id, player_id, promotion_id, reward_event_id, amount, direction,
            reason, source_event_id, idempotency_key, balance_before, balance_after, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'REVERSAL', $6, $7, $8, $9, $10, NOW())`,
          [
            ledgerId,
            evt.playerId,
            evt.promotionId,
            evt.rewardEventId,
            -effectivePointDeduction,
            `REVERSAL: ${params.reversalReason}`,
            evt.sourceEventId,
            params.reversalKey,
            currentBalance,
            balanceAfter
          ]
        );
      } catch (insertErr: any) {
        if (insertErr?.code === '23505' || String(insertErr).includes('duplicate key')) {
          if (!isClientPassed) await client.query('ROLLBACK').catch(() => {});
          const balRes = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
            [evt.playerId]
          );
          return {
            reversedSuccessfully: true,
            reversedAmount: BigInt(0),
            effectivePointDeduction: BigInt(0),
            newPointBalance: BigInt(balRes.rows[0].total),
            negativeBalancePrevented: false,
            isDuplicateReversal: true,
            financialDiscrepancyCents: BigInt(0)
          };
        }
        throw insertErr;
      }

      // 6. Update Reward Event Status
      await client.query(
        `UPDATE promotion_reward_events
         SET status = 'REVERSED', reversed_at = NOW(), reversal_reason = $1
         WHERE reward_event_id = $2`,
        [params.reversalReason, params.rewardEventId]
      );

      // 7. Update User referral points in wallets table
      await client.query(
        'UPDATE wallets SET referral_points = GREATEST(0, referral_points - $1) WHERE user_id = $2',
        [Number(effectivePointDeduction), evt.playerId]
      );

      // 8. If partial deduction due to negative balance protection, flag for review
      if (negativeBalancePrevented) {
        const reviewId = `pmorev_neg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO promotion_fraud_reviews (
            review_id, player_id, promotion_id, reward_event_id, risk_score,
            risk_level, status, evidence_snapshot, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 75, 'HIGH', 'OPEN', $5, NOW(), NOW())`,
          [
            reviewId,
            evt.playerId,
            evt.promotionId,
            evt.rewardEventId,
            JSON.stringify({
              reason: 'NEGATIVE_BALANCE_PROTECTION_TRIGGERED',
              requestedDeduction: requestedDeduction.toString(),
              effectivePointDeduction: effectivePointDeduction.toString(),
              balanceBefore: currentBalance.toString()
            })
          ]
        );
      }

      // 9. Financial Invariant Check
      const finAudit = await runAuthoritativeFinancialAudit(client);
      if (finAudit.discrepancyMinorUnits !== BigInt(0)) {
        throw new Error(`CRITICAL_FINANCIAL_CONTAMINATION: Financial audit discrepancy = ${finAudit.discrepancyMinorUnits}`);
      }

      if (!isClientPassed) await client.query('COMMIT');

      return {
        reversedSuccessfully: true,
        reversedAmount: requestedDeduction,
        effectivePointDeduction,
        newPointBalance: balanceAfter,
        negativeBalancePrevented,
        isDuplicateReversal: false,
        financialDiscrepancyCents: BigInt(0)
      };
    } catch (err) {
      if (!isClientPassed) await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      if (!isClientPassed) (client as pg.PoolClient).release();
    }
  }

  // ---------------------------------------------------------------------------
  // 5. STAFF MANUAL ADJUSTMENT ENGINE
  // ---------------------------------------------------------------------------

  public static async executeManualPointAdjustment(params: {
    operatorId: string;
    operatorRole: string;
    secondOperatorId?: string;
    secondOperatorRole?: string;
    targetPlayerId: string;
    adjustmentAmount: bigint;
    reason: string;
    idempotencyKey: string;
    clientOverride?: pg.PoolClient;
  }): Promise<{
    adjustmentApplied: boolean;
    newBalance: bigint;
    ledgerEntryId: string;
    financialDiscrepancyCents: bigint;
  }> {
    if (params.operatorRole !== 'SUPER_ADMIN') {
      throw new Error('UNAUTHORIZED_ROLE: Only SUPER_ADMIN can execute manual point adjustments');
    }

    // Two-person authorization requirement for adjustments > 100 points
    if (Math.abs(Number(params.adjustmentAmount)) > 100) {
      if (!params.secondOperatorId || params.secondOperatorRole !== 'SUPER_ADMIN') {
        throw new Error('TWO_PERSON_AUTHORIZATION_REQUIRED: Adjustments exceeding 100 points require a second SUPER_ADMIN approval');
      }
      if (params.secondOperatorId === params.operatorId) {
        throw new Error('DUPLICATE_OPERATOR_AUTHORIZATION: Second operator must be distinct');
      }
    }

    const pool = this.getPool();
    const client = params.clientOverride || (await pool.connect());
    const isClientPassed = !!params.clientOverride;

    if (!isClientPassed) await client.query('BEGIN');

    try {
      // Check idempotency
      const existingKeyRes = await client.query(
        'SELECT * FROM promotion_points_ledger WHERE idempotency_key = $1',
        [params.idempotencyKey]
      );

      if (existingKeyRes.rowCount! > 0) {
        const balRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
          [params.targetPlayerId]
        );
        if (!isClientPassed) await client.query('COMMIT');

        return {
          adjustmentApplied: true,
          newBalance: BigInt(balRes.rows[0].total),
          ledgerEntryId: existingKeyRes.rows[0].id,
          financialDiscrepancyCents: BigInt(0)
        };
      }

      const balBeforeRes = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM promotion_points_ledger WHERE player_id = $1',
        [params.targetPlayerId]
      );
      const balBefore = BigInt(balBeforeRes.rows[0].total);
      const balAfter = balBefore + params.adjustmentAmount;

      if (balAfter < BigInt(0)) {
        throw new Error(`NEGATIVE_BALANCE_PROHIBITED: Adjustment would result in negative balance (${balAfter})`);
      }

      const ledgerId = `pmoled_adj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await client.query(
        `INSERT INTO promotion_points_ledger (
          id, player_id, amount, direction, reason, idempotency_key, balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, 'ADJUSTMENT', $4, $5, $6, $7, NOW())`,
        [
          ledgerId,
          params.targetPlayerId,
          params.adjustmentAmount,
          `MANUAL_ADJUSTMENT: ${params.reason} (Operator: ${params.operatorId})`,
          params.idempotencyKey,
          balBefore,
          balAfter
        ]
      );

      await client.query(
        'UPDATE wallets SET referral_points = GREATEST(0, referral_points + $1) WHERE user_id = $2',
        [Number(params.adjustmentAmount), params.targetPlayerId]
      );

      // Financial Audit Check
      const finAudit = await runAuthoritativeFinancialAudit(client);
      if (finAudit.discrepancyMinorUnits !== BigInt(0)) {
        throw new Error(`CRITICAL_FINANCIAL_CONTAMINATION: Financial audit discrepancy = ${finAudit.discrepancyMinorUnits}`);
      }

      if (!isClientPassed) await client.query('COMMIT');

      return {
        adjustmentApplied: true,
        newBalance: balAfter,
        ledgerEntryId: ledgerId,
        financialDiscrepancyCents: BigInt(0)
      };
    } catch (err) {
      if (!isClientPassed) await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      if (!isClientPassed) (client as pg.PoolClient).release();
    }
  }

  // ---------------------------------------------------------------------------
  // 6. PROMOTIONAL ACCOUNTING & BALANCE RECONCILIATION
  // ---------------------------------------------------------------------------

  public static async getPlayerPromotionalBalance(
    playerId: string,
    clientOverride?: pg.PoolClient
  ): Promise<{
    currentBalance: bigint;
    totalGranted: bigint;
    totalReversed: bigint;
    ledgerCount: number;
    financialDiscrepancyCents: bigint;
  }> {
    const pool = this.getPool();
    const client = clientOverride || (await pool.connect());
    const isClientPassed = !!clientOverride;

    try {
      const sumRes = await client.query(
        `SELECT 
          COALESCE(SUM(amount), 0) as net_balance,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) as total_reversed,
          COUNT(*) as ledger_count
         FROM promotion_points_ledger
         WHERE player_id = $1`,
        [playerId]
      );

      const row = sumRes.rows[0];
      const finAudit = await runAuthoritativeFinancialAudit(client);

      return {
        currentBalance: BigInt(row.net_balance),
        totalGranted: BigInt(row.total_granted),
        totalReversed: BigInt(row.total_reversed),
        ledgerCount: parseInt(row.ledger_count, 10),
        financialDiscrepancyCents: finAudit.discrepancyMinorUnits
      };
    } finally {
      if (!isClientPassed) (client as pg.PoolClient).release();
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER MAPPERS
  // ---------------------------------------------------------------------------

  private static stringHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private static mapPromotionRow(row: any): PromotionConfig {
    return {
      promotionId: row.promotion_id,
      promotionType: row.promotion_type,
      name: row.name,
      description: row.description,
      eligibilityRules: typeof row.eligibility_rules === 'string' ? JSON.parse(row.eligibility_rules) : row.eligibility_rules || {},
      rewardType: row.reward_type,
      rewardAmount: BigInt(row.reward_amount),
      rewardUnit: row.reward_unit,
      maxTotalRewards: parseInt(row.max_total_rewards, 10),
      maxRewardsPerPlayer: parseInt(row.max_rewards_per_player, 10),
      maxRewardsPerReferral: parseInt(row.max_rewards_per_referral || '1', 10),
      qualifyingDepositCents: BigInt(row.qualifying_deposit_cents || '0'),
      qualifyingEntryFeeCents: BigInt(row.qualifying_entry_fee_cents || '10000'),
      status: row.status,
      campaignStart: row.campaign_start ? new Date(row.campaign_start) : undefined,
      campaignEnd: row.campaign_end ? new Date(row.campaign_end) : undefined,
      creatorId: row.creator_id,
      approverId: row.approver_id,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      approvalSnapshotHash: row.approval_snapshot_hash,
      version: parseInt(row.version, 10),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private static mapRewardEventRow(row: any): PromotionRewardEvent {
    return {
      rewardEventId: row.reward_event_id,
      promotionId: row.promotion_id,
      promotionVersion: parseInt(row.promotion_version, 10),
      playerId: row.player_id,
      sourceEventType: row.source_event_type,
      sourceEventId: row.source_event_id,
      eligibilitySnapshot: typeof row.eligibility_snapshot === 'string' ? JSON.parse(row.eligibility_snapshot) : row.eligibility_snapshot || {},
      rewardAmount: BigInt(row.reward_amount),
      rewardUnit: row.reward_unit,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      correlationId: row.correlation_id,
      createdAt: new Date(row.created_at),
      grantedAt: row.granted_at ? new Date(row.granted_at) : undefined,
      reversedAt: row.reversed_at ? new Date(row.reversed_at) : undefined,
      reversalReason: row.reversal_reason,
      sourceHash: row.source_hash,
      auditMetadata: typeof row.audit_metadata === 'string' ? JSON.parse(row.audit_metadata) : row.audit_metadata || {}
    };
  }
}
