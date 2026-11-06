import { db } from './db.js';
import crypto from 'crypto';
import {
  User,
  WalletTransaction,
  Competition,
  RiskSeverity,
  UserRiskState,
  RiskEventType,
  RiskEventRecord,
  SuspiciousActivityIncident,
  SuspiciousIncidentStatus,
  IncidentEvidence,
  WithdrawalReviewRecord,
  WithdrawalReviewStatus,
  FraudAuditLog,
  CollusionSignal,
  AccountCluster,
  FraudRiskDashboardMetrics
} from '../types.js';

export class FraudRiskService {
  /**
   * Helper to ensure database collections for Task 10 are initialized
   */
  private static ensureCollections() {
    if (!db.data.suspiciousActivityIncidents) db.data.suspiciousActivityIncidents = [];
    if (!db.data.riskEventRecords) db.data.riskEventRecords = [];
    if (!db.data.withdrawalReviews) db.data.withdrawalReviews = [];
    if (!db.data.fraudAuditLogs) db.data.fraudAuditLogs = [];
    if (!db.data.collusionSignals) db.data.collusionSignals = [];
    if (!db.data.accountClusters) db.data.accountClusters = [];
  }

  // =========================================================================
  // 1. RISK EVENT EVALUATION & DETECTION ENGINE
  // =========================================================================

  public static evaluateRiskEvent(
    params: {
      userId: string;
      eventType: RiskEventType;
      source: string;
      relatedEntityId?: string;
      metadata?: Record<string, any>;
      idempotencyKey?: string;
    }
  ): {
    riskEvent: RiskEventRecord;
    incident?: SuspiciousActivityIncident;
    containmentApplied?: boolean;
    humanReasons: string[];
    severity: RiskSeverity;
    riskScore: number;
  } {
    this.ensureCollections();

    // Check event idempotency
    if (params.idempotencyKey) {
      const existing = db.data.riskEventRecords?.find(
        r => (r as any).idempotencyKey === params.idempotencyKey || r.metadata?.idempotencyKey === params.idempotencyKey
      );
      if (existing) {
        const existingIncident = db.data.suspiciousActivityIncidents?.find(
          i => i.idempotencyKey === params.idempotencyKey
        );
        return {
          riskEvent: existing,
          incident: existingIncident,
          containmentApplied: false,
          humanReasons: ['Idempotent duplicate event ignored.'],
          severity: existing.severity,
          riskScore: existing.riskScore
        };
      }
    }

    const signals: string[] = [];
    const humanReasons: string[] = [];
    let riskScore = 0;
    const user = db.getUserById(params.userId);

    // Rule 1: Account Creation & Velocity
    if (params.eventType === 'ACCOUNT_CREATION') {
      const device = params.metadata?.deviceFingerprint;
      const ip = params.metadata?.ipAddress;
      const recentAccounts = (db.data.users || []).filter(u => {
        const diffMs = Date.now() - new Date(u.createdAt).getTime();
        return diffMs < 10 * 60 * 1000 && (
          (device && (u as any).deviceFingerprint === device) ||
          (ip && (u as any).ipAddress === ip)
        );
      });

      if (recentAccounts.length >= 4) {
        riskScore += 70;
        signals.push('HIGH_ACCOUNT_CREATION_VELOCITY');
        humanReasons.push(`${recentAccounts.length} accounts created with same device/network within 10 minutes`);
      } else if (recentAccounts.length >= 2) {
        riskScore += 25;
        signals.push('MODERATE_ACCOUNT_CREATION_VELOCITY');
      }
    }

    // Rule 2: Deposit Abuse & Duplicate Payment References
    if (params.eventType === 'DEPOSIT' || params.eventType === 'DEPOSIT_APPROVAL') {
      const ref = params.metadata?.paymentReference || params.metadata?.reference;
      if (ref) {
        const allTransactions = db.data.transactions || [];
        const sameRefOtherUsers = allTransactions.filter(
          t => t.userId !== params.userId &&
               (t.paymentReference === ref || t.reference === ref) &&
               t.status === 'COMPLETED'
        );

        if (sameRefOtherUsers.length > 0) {
          riskScore += 100;
          signals.push('CONFIRMED_DUPLICATE_PAYMENT_REFERENCE');
          humanReasons.push(`Payment reference ${ref} was previously redeemed by another account (${sameRefOtherUsers[0].userId})`);
        }

        // Rapid deposit attempts by this user
        const userRecentDeposits = allTransactions.filter(
          t => t.userId === params.userId &&
               t.type === 'DEPOSIT' &&
               Date.now() - new Date(t.createdAt).getTime() < 3 * 60 * 1000
        );
        if (userRecentDeposits.length >= 5) {
          riskScore += 50;
          signals.push('RAPID_DEPOSIT_ATTEMPTS');
          humanReasons.push(`${userRecentDeposits.length} deposit attempts within 3 minutes`);
        }
      }
    }

    // Rule 3: Withdrawal Risk & Rapid Withdrawal after Deposit
    if (params.eventType === 'WITHDRAWAL_REQUEST') {
      const amount = Number(params.metadata?.amountETB || 0);
      const allTx = db.data.transactions || [];
      const userDeposits = allTx.filter(t => t.userId === params.userId && t.type === 'DEPOSIT' && t.status === 'COMPLETED');
      const latestDeposit = userDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestDeposit) {
        const timeSinceDepositMs = Date.now() - new Date(latestDeposit.createdAt).getTime();
        // Deposited recently (< 5 minutes ago)
        if (timeSinceDepositMs < 5 * 60 * 1000) {
          // Check if any predictions made since deposit
          const predictionsSince = (db.data.predictions || []).filter(
            p => p.userId === params.userId && new Date(p.createdAt || 0).getTime() > new Date(latestDeposit.createdAt).getTime()
          );
          if (predictionsSince.length === 0) {
            riskScore += 65;
            signals.push('RAPID_WITHDRAWAL_WITHOUT_ACTIVITY');
            humanReasons.push('Withdrawal requested within 5 minutes of deposit approval with zero competition predictions');
          }
        }
      }

      if (amount >= 25000) {
        riskScore += 55;
        signals.push('HIGH_VALUE_WITHDRAWAL');
        humanReasons.push(`High value withdrawal of ${amount} ETB`);
      }
    }

    // Rule 4: Bot & Automation Velocity
    if (params.eventType === 'PREDICTION_SUBMISSION' || params.eventType === 'BOT_AUTOMATION') {
      const requestTimings: number[] = params.metadata?.requestTimestamps || [];
      if (requestTimings.length >= 5) {
        const sorted = [...requestTimings].sort((a, b) => a - b);
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          intervals.push(sorted[i] - sorted[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avgInterval < 50) { // under 50ms average
          riskScore += 80;
          signals.push('IMPOSSIBLE_HUMAN_INTERACTION_TIMING');
          humanReasons.push(`Automated request velocity detected with average interval of ${Math.round(avgInterval)}ms`);
        }
      }
    }

    // Rule 5: Referral Abuse (Self-referral or circular chain)
    if (params.eventType === 'REFERRAL_ACTIVITY' || params.eventType === 'REFERRAL_ABUSE') {
      const referrerId = params.metadata?.referrerId;
      const referredUserId = params.metadata?.referredUserId || params.userId;
      if (referrerId === referredUserId) {
        riskScore += 90;
        signals.push('SELF_REFERRAL_DETECTED');
        humanReasons.push('User attempted to refer their own account');
      } else if (referrerId) {
        // Circular check: did referred user previously refer the referrer?
        const circular = (db.data.referrals || []).some(
          r => r.referrerId === referredUserId && r.referredUserId === referrerId
        );
        if (circular) {
          riskScore += 85;
          signals.push('CIRCULAR_REFERRAL_CHAIN');
          humanReasons.push('Circular referral relationship detected between accounts');
        }
      }
    }

    // Rule 6: Staff Anomaly
    if (params.eventType === 'STAFF_ACTION' || params.eventType === 'STAFF_ANOMALY') {
      const actorRole = params.metadata?.actorRole;
      const action = params.metadata?.action;
      if (actorRole === 'CUSTOMER_SUPPORT' && action === 'MANUAL_WALLET_CREDIT') {
        riskScore += 95;
        signals.push('STAFF_PERMISSION_VIOLATION');
        humanReasons.push('Customer support attempted manual wallet credit outside role permissions');
      }
    }

    // Calculate Severity
    let severity: RiskSeverity = 'LOW';
    if (riskScore >= 75) {
      severity = 'CRITICAL';
    } else if (riskScore >= 50) {
      severity = 'HIGH';
    } else if (riskScore >= 25) {
      severity = 'MEDIUM';
    }

    // Preserve the Risk Event Record
    const riskEventRecord: RiskEventRecord = {
      riskEventId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: params.userId,
      eventType: params.eventType,
      riskScore,
      riskSignals: signals,
      severity,
      detectedAt: new Date().toISOString(),
      source: params.source,
      relatedEntityId: params.relatedEntityId,
      status: severity === 'HIGH' || severity === 'CRITICAL' ? 'OPEN' : 'PROCESSED',
      metadata: {
        ...(params.metadata || {}),
        idempotencyKey: params.idempotencyKey
      }
    };
    (riskEventRecord as any).idempotencyKey = params.idempotencyKey;

    db.data.riskEventRecords?.push(riskEventRecord);

    let incident: SuspiciousActivityIncident | undefined = undefined;
    let containmentApplied = false;

    // Automatic Incident Creation for HIGH or CRITICAL
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      incident = this.createSuspiciousActivityIncident({
        userId: params.userId,
        severity,
        riskLevel: severity,
        trigger: params.eventType,
        riskSignals: signals,
        humanReasons: humanReasons.length > 0 ? humanReasons : [`Elevated risk score ${riskScore}`],
        relatedCompetitionIds: params.metadata?.competitionId ? [params.metadata.competitionId] : [],
        relatedTransactionIds: params.metadata?.transactionId ? [params.metadata.transactionId] : [],
        relatedPredictionIds: params.metadata?.predictionId ? [params.metadata.predictionId] : [],
        relatedAccounts: params.metadata?.relatedAccounts || [],
        idempotencyKey: params.idempotencyKey
      });

      // High-confidence containment (e.g. confirmed duplicate payment reference)
      if (signals.includes('CONFIRMED_DUPLICATE_PAYMENT_REFERENCE')) {
        containmentApplied = true;
        // Mark user deposit restricted
        if (user) {
          user.isDepositRestricted = true;
          user.userRiskState = 'RESTRICTED';
          user.restrictionReason = 'Payment reference verification anomaly';
          user.restrictedAt = new Date().toISOString();
          user.restrictedBy = 'SYSTEM_AUTO_CONTAINMENT';
          db.saveUser(user);
        }
      }
    }

    return {
      riskEvent: riskEventRecord,
      incident,
      containmentApplied,
      humanReasons,
      severity,
      riskScore
    };
  }

  // =========================================================================
  // 2. INCIDENT LIFECYCLE & EVIDENCE IMMUTABILITY
  // =========================================================================

  public static createSuspiciousActivityIncident(
    data: Partial<SuspiciousActivityIncident>
  ): SuspiciousActivityIncident {
    this.ensureCollections();

    if (data.idempotencyKey) {
      const existing = db.data.suspiciousActivityIncidents?.find(
        i => i.idempotencyKey === data.idempotencyKey
      );
      if (existing) return existing;
    }

    const userId = data.userId || 'usr_unknown';
    const user = db.getUserById(userId);

    const incidentId = data.incidentId || `inc_fraud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Snapshot immutable evidence
    const evidence: IncidentEvidence = {
      capturedAt: now,
      eventTimestamps: [now],
      transactionIds: data.relatedTransactionIds || [],
      competitionIds: data.relatedCompetitionIds || [],
      predictionIds: data.relatedPredictionIds || [],
      requestMetadata: {},
      riskSignals: [...(data.riskSignals || [])],
      auditEvents: [],
      staffActions: [],
      immutableHash: crypto
        .createHash('sha256')
        .update(`${incidentId}_${userId}_${now}_${JSON.stringify(data.riskSignals || [])}`)
        .digest('hex')
    };

    const incident: SuspiciousActivityIncident = {
      incidentId,
      userId,
      userName: user?.name || 'Unknown User',
      userEmail: user?.email || '',
      severity: data.severity || 'MEDIUM',
      riskLevel: data.riskLevel || data.severity || 'MEDIUM',
      status: data.status || 'OPEN',
      trigger: data.trigger || 'ANOMALY_DETECTION',
      riskSignals: data.riskSignals || [],
      humanReasons: data.humanReasons || [],
      relatedCompetitionIds: data.relatedCompetitionIds || [],
      relatedTransactionIds: data.relatedTransactionIds || [],
      relatedPredictionIds: data.relatedPredictionIds || [],
      relatedAccounts: data.relatedAccounts || [],
      detectedAt: now,
      actionsTaken: ['INCIDENT_OPENED'],
      evidence,
      idempotencyKey: data.idempotencyKey
    };

    db.data.suspiciousActivityIncidents?.push(incident);

    // Write audit log
    this.createFraudAuditLog({
      actor: 'SYSTEM',
      actorRole: 'SYSTEM_RISK_ENGINE',
      action: 'INCIDENT_CREATED',
      target: userId,
      reason: incident.trigger,
      incidentId,
      beforeState: 'NONE',
      afterState: incident.status
    });

    return incident;
  }

  public static updateSuspiciousActivityIncident(
    incidentId: string,
    action: 'ASSIGN' | 'ADD_NOTE' | 'MONITOR' | 'RESTRICT' | 'CLEAR' | 'ESCALATE' | 'CONFIRM' | 'CLOSE',
    actor: { id: string; name: string; role: string },
    payload?: {
      assignedTo?: string;
      note?: string;
      reason?: string;
      restrictions?: {
        isWithdrawalRestricted?: boolean;
        isCompetitionRestricted?: boolean;
        isDepositRestricted?: boolean;
      };
    }
  ): { success: boolean; incident?: SuspiciousActivityIncident; error?: string } {
    this.ensureCollections();

    const incident = db.data.suspiciousActivityIncidents?.find(i => i.incidentId === incidentId);
    if (!incident) {
      return { success: false, error: `Incident ${incidentId} not found` };
    }

    const targetUser = db.getUserById(incident.userId);
    const beforeState = incident.status;

    // RBAC Permissions Check
    const role = actor.role.toUpperCase();

    // Customer Support: READ ONLY, no restrictions, no confirmation
    if (role === 'CUSTOMER_SUPPORT' && ['RESTRICT', 'CONFIRM', 'ESCALATE'].includes(action)) {
      return { success: false, error: 'Customer support role is not authorized to restrict accounts or confirm fraud' };
    }

    // Competition Publisher: Can only monitor or annotate competition cases; no wallet restrictions
    if (role === 'COMPETITION_PUBLISHER' && ['RESTRICT', 'CONFIRM'].includes(action)) {
      return { success: false, error: 'Competition publisher is not authorized to apply restrictions or confirm fraud' };
    }

    // Wallet Manager: Can request review or monitor, but cannot confirm fraud alone
    if (role === 'WALLET_MANAGER' && action === 'CONFIRM') {
      return { success: false, error: 'Wallet manager cannot confirm fraud without admin approval' };
    }

    // Payment Verifier: Cannot confirm fraud
    if (role === 'PAYMENT_VERIFIER' && ['CONFIRM', 'ESCALATE'].includes(action)) {
      return { success: false, error: 'Payment verifier cannot confirm fraud or escalate emergency' };
    }

    switch (action) {
      case 'ASSIGN':
        incident.assignedTo = payload?.assignedTo || actor.id;
        incident.status = 'UNDER_REVIEW';
        incident.actionsTaken.push(`ASSIGNED_TO_${incident.assignedTo}`);
        break;

      case 'ADD_NOTE':
        incident.reviewNotes = (incident.reviewNotes ? incident.reviewNotes + '\n' : '') +
          `[${new Date().toISOString()}] ${actor.name} (${actor.role}): ${payload?.note || ''}`;
        incident.actionsTaken.push('NOTE_ADDED');
        break;

      case 'MONITOR':
        incident.status = 'MONITORED';
        incident.actionsTaken.push(`MARKED_MONITORED_BY_${actor.id}`);
        if (targetUser && targetUser.userRiskState !== 'RESTRICTED') {
          targetUser.userRiskState = 'MONITORED';
          db.saveUser(targetUser);
        }
        break;

      case 'RESTRICT':
        incident.status = 'RESTRICTED';
        incident.actionsTaken.push(`RESTRICTION_APPLIED_BY_${actor.id}`);
        if (targetUser) {
          targetUser.userRiskState = 'RESTRICTED';
          targetUser.isRestricted = true;
          if (payload?.restrictions) {
            targetUser.isWithdrawalRestricted = payload.restrictions.isWithdrawalRestricted ?? true;
            targetUser.isCompetitionRestricted = payload.restrictions.isCompetitionRestricted ?? false;
            targetUser.isDepositRestricted = payload.restrictions.isDepositRestricted ?? false;
          } else {
            targetUser.isWithdrawalRestricted = true;
          }
          targetUser.restrictionReason = payload?.reason || 'Account under administrative review';
          targetUser.restrictedAt = new Date().toISOString();
          targetUser.restrictedBy = actor.id;
          db.saveUser(targetUser);
        }
        break;

      case 'CLEAR':
        incident.status = 'CLEARED';
        incident.resolvedAt = new Date().toISOString();
        incident.resolution = payload?.reason || 'Cleared after review: no policy violation found';
        incident.resolutionActor = actor.id;
        incident.actionsTaken.push(`CLEARED_BY_${actor.id}`);
        if (targetUser) {
          targetUser.userRiskState = 'NORMAL';
          targetUser.isRestricted = false;
          targetUser.isWithdrawalRestricted = false;
          targetUser.isCompetitionRestricted = false;
          targetUser.isDepositRestricted = false;
          targetUser.restrictionReason = undefined;
          db.saveUser(targetUser);
        }
        break;

      case 'CONFIRM':
        // Only Admin or Super Admin
        if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
          return { success: false, error: 'Only Admin or Super Admin can confirm fraud' };
        }
        incident.status = 'CONFIRMED';
        incident.resolvedAt = new Date().toISOString();
        incident.resolution = payload?.reason || 'Fraud confirmed following investigation';
        incident.resolutionActor = actor.id;
        incident.actionsTaken.push(`FRAUD_CONFIRMED_BY_${actor.id}`);
        if (targetUser) {
          targetUser.userRiskState = 'FRAUD_CONFIRMED';
          targetUser.isRestricted = true;
          targetUser.isWithdrawalRestricted = true;
          targetUser.isCompetitionRestricted = true;
          targetUser.restrictionReason = 'Account restricted due to confirmed policy violation';
          targetUser.restrictedAt = new Date().toISOString();
          targetUser.restrictedBy = actor.id;
          db.saveUser(targetUser);
        }
        break;

      case 'ESCALATE':
        // Super Admin or Admin can escalate to Task 8 emergency freeze
        incident.status = 'ESCALATED';
        incident.actionsTaken.push(`ESCALATED_TO_EMERGENCY_BY_${actor.id}`);
        db.setFinancialSafetyState('EMERGENCY');
        db.setFinancialSafetyControls({
          pauseDeposits: true,
          pauseWithdrawals: true,
          pauseCompetitionEntry: true,
          pauseSettlements: true,
          pauseAllFinancialMutations: true
        });
        break;

      case 'CLOSE':
        incident.status = incident.status === 'CONFIRMED' ? 'CONFIRMED' : 'CLEARED';
        incident.resolvedAt = new Date().toISOString();
        incident.resolution = payload?.reason || 'Incident closed';
        incident.resolutionActor = actor.id;
        incident.actionsTaken.push(`CLOSED_BY_${actor.id}`);
        break;
    }

    // Record immutable audit log
    this.createFraudAuditLog({
      actor: actor.id,
      actorRole: actor.role,
      action: `INCIDENT_${action}`,
      target: incident.userId,
      reason: payload?.reason || payload?.note || `Action ${action} executed`,
      incidentId,
      beforeState,
      afterState: incident.status
    });

    return { success: true, incident };
  }

  // =========================================================================
  // 3. WITHDRAWAL RISK REVIEW WORKFLOW
  // =========================================================================

  public static requestWithdrawalWithRiskReview(
    userId: string,
    amountETB: number,
    paymentMethod: string,
    paymentReference: string
  ): {
    success: boolean;
    transaction?: WalletTransaction;
    reviewRecord?: WithdrawalReviewRecord;
    status: WithdrawalReviewStatus;
    message: string;
  } {
    this.ensureCollections();

    const user = db.getUserById(userId);
    if (!user) {
      return { success: false, status: 'REJECTED', message: 'User not found' };
    }

    if (user.balanceETB < amountETB) {
      return { success: false, status: 'REJECTED', message: 'Insufficient balance' };
    }

    // Check Task 8 safety controls
    const safetyConfig = db.getFinancialSafetyConfig();
    if (safetyConfig.controls.pauseWithdrawals || safetyConfig.controls.pauseAllFinancialMutations) {
      return {
        success: false,
        status: 'HELD',
        message: 'Withdrawals are temporarily paused for routine system maintenance.'
      };
    }

    // Evaluate risk on withdrawal
    const riskEval = this.evaluateRiskEvent({
      userId,
      eventType: 'WITHDRAWAL_REQUEST',
      source: 'USER_PORTAL',
      metadata: { amountETB, paymentMethod, paymentReference }
    });

    const isRestricted = user.isWithdrawalRestricted || user.userRiskState === 'RESTRICTED';
    const isHighRisk = riskEval.severity === 'HIGH' || riskEval.severity === 'CRITICAL' || isRestricted;

    // Deduct active balance and place into pending
    user.balanceETB -= amountETB;
    user.pendingBalanceETB = (user.pendingBalanceETB || 0) + amountETB;
    db.saveUser(user);

    const txId = `tx_wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tx: WalletTransaction = {
      id: txId,
      userId,
      userName: user.name,
      type: 'WITHDRAWAL',
      direction: 'DEBIT',
      amountETB,
      method: paymentMethod as any,
      paymentMethod: paymentMethod as any,
      paymentReference,
      reference: paymentReference,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      actorSource: 'USER',
      description: `Withdrawal via ${paymentMethod}`,
      metadata: {
        riskScore: riskEval.riskScore,
        riskLevel: riskEval.severity,
        isUnderReview: isHighRisk
      }
    } as any;
    db.createTransaction(tx);

    let reviewRecord: WithdrawalReviewRecord | undefined = undefined;

    if (isHighRisk) {
      reviewRecord = {
        id: `wrev_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        transactionId: txId,
        userId,
        userName: user.name,
        amountETB,
        paymentMethod,
        paymentReference,
        status: 'RISK_REVIEW',
        requestedAt: new Date().toISOString(),
        incidentId: riskEval.incident?.incidentId,
        riskScore: riskEval.riskScore,
        riskSignals: riskEval.riskEvent.riskSignals
      };
      db.data.withdrawalReviews?.push(reviewRecord);

      return {
        success: true,
        transaction: tx,
        reviewRecord,
        status: 'RISK_REVIEW',
        message: 'Your withdrawal is currently under routine review. No action is required from you at this time.'
      };
    }

    return {
      success: true,
      transaction: tx,
      status: 'REQUESTED',
      message: 'Withdrawal requested successfully.'
    };
  }

  public static processWithdrawalReview(
    transactionId: string,
    action: 'APPROVE' | 'REJECT' | 'HOLD',
    actor: { id: string; name: string; role: string },
    reason: string
  ): {
    success: boolean;
    transaction?: WalletTransaction;
    error?: string;
  } {
    this.ensureCollections();

    const tx = db.getTransactionById(transactionId);
    if (!tx || tx.type !== 'WITHDRAWAL') {
      return { success: false, error: 'Withdrawal transaction not found' };
    }

    if (tx.status !== 'PENDING') {
      return { success: false, error: `Cannot process withdrawal with status ${tx.status}` };
    }

    const user = db.getUserById(tx.userId);
    if (!user) {
      return { success: false, error: 'Associated user not found' };
    }

    const review = db.data.withdrawalReviews?.find(r => r.transactionId === transactionId);

    if (action === 'APPROVE') {
      tx.status = 'COMPLETED';
      user.pendingBalanceETB = Math.max(0, (user.pendingBalanceETB || 0) - tx.amountETB);
      db.saveUser(user);
      db.updateTransaction(tx.id, { status: 'COMPLETED' });

      if (review) {
        review.status = 'APPROVED';
        review.reviewedAt = new Date().toISOString();
        review.reviewedBy = actor.id;
        review.reason = reason;
      }

      this.createFraudAuditLog({
        actor: actor.id,
        actorRole: actor.role,
        action: 'WITHDRAWAL_REVIEW_APPROVED',
        target: tx.userId,
        reason,
        incidentId: review?.incidentId,
        beforeState: 'PENDING',
        afterState: 'COMPLETED'
      });

      return { success: true, transaction: tx };
    }

    if (action === 'REJECT') {
      // Return funds to active balance
      tx.status = 'REJECTED';
      user.pendingBalanceETB = Math.max(0, (user.pendingBalanceETB || 0) - tx.amountETB);
      user.balanceETB += tx.amountETB;
      db.saveUser(user);
      db.updateTransaction(tx.id, { status: 'REJECTED' });

      if (review) {
        review.status = 'REJECTED';
        review.reviewedAt = new Date().toISOString();
        review.reviewedBy = actor.id;
        review.reason = reason;
      }

      this.createFraudAuditLog({
        actor: actor.id,
        actorRole: actor.role,
        action: 'WITHDRAWAL_REVIEW_REJECTED',
        target: tx.userId,
        reason,
        incidentId: review?.incidentId,
        beforeState: 'PENDING',
        afterState: 'REJECTED'
      });

      return { success: true, transaction: tx };
    }

    if (action === 'HOLD') {
      if (review) {
        review.status = 'HELD';
        review.reviewedAt = new Date().toISOString();
        review.reviewedBy = actor.id;
        review.reason = reason;
      }

      this.createFraudAuditLog({
        actor: actor.id,
        actorRole: actor.role,
        action: 'WITHDRAWAL_REVIEW_HELD',
        target: tx.userId,
        reason,
        incidentId: review?.incidentId,
        beforeState: 'PENDING',
        afterState: 'HELD'
      });

      return { success: true, transaction: tx };
    }

    return { success: false, error: 'Invalid action' };
  }

  // =========================================================================
  // 4. ADVANCED ABUSE DETECTION LAYERS
  // =========================================================================

  /**
   * Duplicate Account Cluster Analysis
   */
  public static analyzeDuplicateAccounts(user: User): {
    clusterFound: boolean;
    cluster?: AccountCluster;
    matchingAccounts: string[];
    signals: string[];
  } {
    this.ensureCollections();

    const users = db.data.users || [];
    const matchingUsers: User[] = [];
    const signals: string[] = [];

    for (const u of users) {
      if (u.id === user.id) continue;

      let matchPoints = 0;
      if (user.phone && u.phone && user.phone === u.phone) {
        matchPoints += 3;
        signals.push('IDENTICAL_PHONE_NUMBER');
      }
      if (user.deviceFingerprint && (u as any).deviceFingerprint && user.deviceFingerprint === (u as any).deviceFingerprint) {
        matchPoints += 2;
        signals.push('SHARED_DEVICE_FINGERPRINT');
      }
      if (user.ipAddress && (u as any).ipAddress && user.ipAddress === (u as any).ipAddress) {
        matchPoints += 1;
        signals.push('SHARED_NETWORK_IP');
      }

      if (matchPoints >= 2) {
        matchingUsers.push(u);
      }
    }

    if (matchingUsers.length > 0) {
      const cluster: AccountCluster = {
        clusterId: `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        primaryUserId: user.id,
        relatedUserIds: matchingUsers.map(u => u.id),
        sharedDeviceFingerprint: user.deviceFingerprint,
        sharedIp: user.ipAddress,
        confidenceScore: matchingUsers.length >= 3 ? 90 : 60,
        detectedAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      db.data.accountClusters?.push(cluster);
      return {
        clusterFound: true,
        cluster,
        matchingAccounts: matchingUsers.map(u => u.id),
        signals
      };
    }

    return { clusterFound: false, matchingAccounts: [], signals: [] };
  }

  /**
   * Collusion Detection between players in a competition
   */
  public static analyzeCompetitionCollusion(competitionId: string): {
    collusionDetected: boolean;
    signals: CollusionSignal[];
  } {
    this.ensureCollections();

    const predictions = (db.data.predictions || []).filter(p => p.competitionId === competitionId);
    if (predictions.length < 2) {
      return { collusionDetected: false, signals: [] };
    }

    const signalsFound: CollusionSignal[] = [];

    // Group predictions by user
    const byUser: Record<string, typeof predictions> = {};
    for (const p of predictions) {
      if (!byUser[p.userId]) byUser[p.userId] = [];
      byUser[p.userId].push(p);
    }

    const userIds = Object.keys(byUser);
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const u1 = userIds[i];
        const u2 = userIds[j];
        const preds1 = byUser[u1];
        const preds2 = byUser[u2];

        // Compare predictions and selections
        const picks1 = preds1.flatMap(p => p.selections && p.selections.length > 0 ? p.selections : [p as any]);
        const picks2 = preds2.flatMap(p => p.selections && p.selections.length > 0 ? p.selections : [p as any]);

        let identicalPicks = 0;
        let totalPicks = 0;

        for (const p1 of picks1) {
          const matchP2 = picks2.find(p => p.matchId === p1.matchId && (p.marketType === p1.marketType || !p.marketType || !p1.marketType));
          if (matchP2) {
            totalPicks++;
            const opt1 = p1.predictedOptionId || (p1 as any).selection || (p1 as any).optionId;
            const opt2 = matchP2.predictedOptionId || (matchP2 as any).selection || (matchP2 as any).optionId;
            if (opt1 && opt1 === opt2) {
              identicalPicks++;
            }
          }
        }

        if (totalPicks >= 5 && (identicalPicks / totalPicks) >= 0.9) {
          const userObj1 = db.getUserById(u1);
          const userObj2 = db.getUserById(u2);
          const sharedNetwork = Boolean(
            (userObj1 as any)?.deviceFingerprint &&
            (userObj1 as any)?.deviceFingerprint === (userObj2 as any)?.deviceFingerprint
          );

          const signal: CollusionSignal = {
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            competitionId,
            involvedUserIds: [u1, u2],
            predictionSimilarityScore: identicalPicks / totalPicks,
            synchronizedTiming: false,
            sharedDeviceOrNetwork: sharedNetwork,
            detectedAt: new Date().toISOString(),
            details: `High prediction similarity (${identicalPicks}/${totalPicks} picks identical)${sharedNetwork ? ' with shared device fingerprint' : ''}`,
            status: 'PENDING_INVESTIGATION'
          };

          db.data.collusionSignals?.push(signal);
          signalsFound.push(signal);
        }
      }
    }

    return {
      collusionDetected: signalsFound.length > 0,
      signals: signalsFound
    };
  }

  // =========================================================================
  // 5. AUDIT LOGGING & METRICS
  // =========================================================================

  public static createFraudAuditLog(entry: Omit<FraudAuditLog, 'id' | 'timestamp'>): FraudAuditLog {
    this.ensureCollections();

    const log: FraudAuditLog = {
      id: `faudit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };

    db.data.fraudAuditLogs?.push(log);
    return log;
  }

  public static getDashboardMetrics(): FraudRiskDashboardMetrics {
    this.ensureCollections();

    const incidents = db.data.suspiciousActivityIncidents || [];
    const reviews = db.data.withdrawalReviews || [];
    const clusters = db.data.accountClusters || [];
    const collusion = db.data.collusionSignals || [];
    const riskRecords = db.data.riskEventRecords || [];

    return {
      openIncidentsCount: incidents.filter(i => ['OPEN', 'UNDER_REVIEW', 'MONITORED', 'RESTRICTED'].includes(i.status)).length,
      highIncidentsCount: incidents.filter(i => i.severity === 'HIGH').length,
      criticalIncidentsCount: incidents.filter(i => i.severity === 'CRITICAL').length,
      withdrawalReviewsCount: reviews.filter(r => r.status === 'RISK_REVIEW' || r.status === 'HELD').length,
      suspiciousDepositsCount: riskRecords.filter(r => r.eventType === 'DEPOSIT' && (r.severity === 'HIGH' || r.severity === 'CRITICAL')).length,
      suspiciousAccountClustersCount: clusters.filter(c => c.status === 'ACTIVE').length,
      competitionAbuseSignalsCount: riskRecords.filter(r => r.eventType === 'COMPETITION_ENTRY' && r.severity === 'HIGH').length,
      collusionSignalsCount: collusion.filter(c => c.status === 'PENDING_INVESTIGATION').length,
      botSignalsCount: riskRecords.filter(r => r.eventType === 'BOT_AUTOMATION' || r.riskSignals.includes('IMPOSSIBLE_HUMAN_INTERACTION_TIMING')).length,
      staffRiskAlertsCount: riskRecords.filter(r => r.eventType === 'STAFF_ACTION' && r.severity === 'CRITICAL').length,
      recentClearedCasesCount: incidents.filter(i => i.status === 'CLEARED').length,
      recentConfirmedCasesCount: incidents.filter(i => i.status === 'CONFIRMED').length
    };
  }
}
