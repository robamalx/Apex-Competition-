/**
-- =========================================================================
-- APEX ARENA — RISK 20: NOTIFICATION RELIABILITY SERVICE
-- Authoritative, Durable, Idempotent, Role-Isolated Notification Engine
-- =========================================================================
 */

import pg from 'pg';
import crypto from 'crypto';
import { dbPool } from './db/pool.js';
import { withTransaction } from './db/postgresService.js';

export type NotificationCriticality = 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'OPTIONAL';
export type NotificationChannel = 'IN_APP' | 'PUSH' | 'SMS' | 'EMAIL' | 'TELEGRAM';
export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';

export type NotificationType =
  // Player notifications
  | 'ACCOUNT_VERIFIED'
  | 'PASSWORD_RECOVERY'
  | 'DEPOSIT_SUCCESS'
  | 'DEPOSIT_FAILED'
  | 'DEPOSIT_PENDING'
  | 'COMPETITION_JOINED'
  | 'PREDICTION_SUBMITTED'
  | 'PREDICTION_LOCKED'
  | 'COMPETITION_POSTPONED'
  | 'COMPETITION_CANCELLED'
  | 'COMPETITION_VOIDED'
  | 'COMPETITION_REFUND'
  | 'COMPETITION_RESULT'
  | 'LEADERBOARD_PUBLISHED'
  | 'PRIZE_PAYOUT'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_PROCESSING'
  | 'WITHDRAWAL_COMPLETED'
  | 'WITHDRAWAL_FAILED'
  | 'WITHDRAWAL_REVERSED'
  | 'REFERRAL_REWARD'
  | 'PROMOTION_REWARD'
  | 'SECURITY_ALERT'
  | 'SESSION_ALERT'
  | 'SYSTEM_INCIDENT'
  | 'PROMOTIONAL_OFFER'
  // Staff notifications
  | 'STAFF_PAYMENT_ALERT'
  | 'STAFF_FINANCIAL_ALERT'
  | 'STAFF_FRAUD_ALERT'
  | 'STAFF_COMP_APPROVAL'
  | 'STAFF_AD_APPROVAL'
  | 'STAFF_SYSTEM_ALERT'
  | 'STAFF_RECONCILIATION_ALERT'
  | 'STAFF_DR_INCIDENT';

export interface NotificationRecord {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  criticality: NotificationCriticality;
  channel: NotificationChannel;
  title: string;
  body: string;
  entity_type?: string;
  entity_id?: string;
  entity_version: number;
  status: NotificationStatus;
  delivery_attempts: number;
  max_delivery_attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  delivered_at?: string;
  read_at?: string;
  provider: string;
  provider_message_id?: string;
  idempotency_key: string;
  correlation_id?: string;
  recipient_role?: string;
  metadata: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  entityVersion?: number;
  criticality?: NotificationCriticality;
  channel?: NotificationChannel;
  idempotencyKey?: string;
  correlationId?: string;
  recipientRole?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface DeliveryProviderResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface NotificationProviderAdapter {
  name: string;
  send(notification: NotificationRecord): Promise<DeliveryProviderResult>;
}

export class NotificationReliabilityService {
  private static mockProviderFailure: ((notif: NotificationRecord) => DeliveryProviderResult | null) | null = null;
  private static circuitBreakerFailures = 0;
  private static circuitBreakerOpenUntil = 0;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_COOLDOWN_MS = 2000;

  // ---------------------------------------------------------------------------
  // 1. NOTIFICATION CRITICALITY & DELIVERY GUARANTEES
  // ---------------------------------------------------------------------------

  public static getDefaultCriticality(type: NotificationType): NotificationCriticality {
    switch (type) {
      case 'WITHDRAWAL_COMPLETED':
      case 'WITHDRAWAL_FAILED':
      case 'WITHDRAWAL_REVERSED':
      case 'COMPETITION_VOIDED':
      case 'COMPETITION_REFUND':
      case 'SECURITY_ALERT':
      case 'STAFF_FINANCIAL_ALERT':
      case 'STAFF_RECONCILIATION_ALERT':
      case 'STAFF_DR_INCIDENT':
        return 'CRITICAL';

      case 'DEPOSIT_SUCCESS':
      case 'DEPOSIT_FAILED':
      case 'PREDICTION_SUBMITTED':
      case 'COMPETITION_RESULT':
      case 'PRIZE_PAYOUT':
      case 'ACCOUNT_VERIFIED':
      case 'PASSWORD_RECOVERY':
      case 'STAFF_PAYMENT_ALERT':
      case 'STAFF_FRAUD_ALERT':
      case 'STAFF_COMP_APPROVAL':
        return 'IMPORTANT';

      case 'PROMOTIONAL_OFFER':
        return 'OPTIONAL';

      default:
        return 'NORMAL';
    }
  }

  public static getMaxDeliveryAttempts(criticality: NotificationCriticality): number {
    switch (criticality) {
      case 'CRITICAL':
        return 5;
      case 'IMPORTANT':
        return 3;
      case 'NORMAL':
        return 2;
      case 'OPTIONAL':
        return 1;
    }
  }

  public static isMandatoryCategory(criticality: NotificationCriticality, type: NotificationType): boolean {
    if (criticality === 'CRITICAL' || criticality === 'IMPORTANT') return true;
    if (type.includes('ALERT') || type.includes('SECURITY') || type.includes('WITHDRAWAL') || type.includes('DEPOSIT')) {
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // 2. SENSITIVE DATA SANITIZATION
  // ---------------------------------------------------------------------------

  public static sanitizeNotificationContent(
    rawTitle: string,
    rawBody: string,
    metadata?: Record<string, any>
  ): { title: string; body: string; sanitizedMetadata: Record<string, any> } {
    let sanitizedTitle = rawTitle;
    let sanitizedBody = rawBody;

    // 1. Redact OTP codes (e.g., "code: 123456", "OTP: 987654", "code is 849201")
    sanitizedBody = sanitizedBody.replace(
      /\b(?:code|otp|token|password|pin)(?:\s+is\s+|[\s:=]+)([A-Za-z0-9-_!@#$%^&*]{4,64})\b/gi,
      (match, secret) => {
        return match.replace(secret, '••••••');
      }
    );

    // 2. Redact internal ledger IDs or hash secrets
    sanitizedBody = sanitizedBody.replace(/\b(?:tx_ledger_|sec_|hash_)[a-f0-9]{16,64}\b/gi, '[REDACTED_REF]');

    // 3. Redact fraud risk scores or internal audit rationale
    sanitizedBody = sanitizedBody.replace(/\b(?:risk_score|fraud_score|ml_cluster)\s*[:=]?\s*\d+(\.\d+)?\b/gi, '[REDACTED_TELEMETRY]');

    // 4. Sanitize metadata dictionary
    const sanitizedMetadata: Record<string, any> = {};
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        const lowerK = k.toLowerCase();
        if (
          lowerK.includes('password') ||
          lowerK.includes('otp') ||
          lowerK.includes('token') ||
          lowerK.includes('secret') ||
          lowerK.includes('fraud') ||
          lowerK.includes('score') ||
          lowerK.includes('key')
        ) {
          sanitizedMetadata[k] = '[REDACTED]';
        } else {
          sanitizedMetadata[k] = v;
        }
      }
    }

    return {
      title: sanitizedTitle,
      body: sanitizedBody,
      sanitizedMetadata
    };
  }

  // ---------------------------------------------------------------------------
  // 3. IDEMPOTENT NOTIFICATION KEY GENERATION
  // ---------------------------------------------------------------------------

  public static generateStableIdempotencyKey(
    type: NotificationType,
    entityId: string | undefined,
    userId: string,
    version: number = 1
  ): string {
    if (entityId) {
      const cleanEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, '');
      return `notif:${type}:${cleanEntity}:${userId}:v${version}`;
    }
    return `notif:${type}:${userId}:${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // ---------------------------------------------------------------------------
  // 4. TRANSACTIONAL AUTHORITATIVE NOTIFICATION CREATION
  // ---------------------------------------------------------------------------

  public static async createNotificationInTransaction(
    client: pg.PoolClient,
    input: CreateNotificationInput
  ): Promise<{ notification: NotificationRecord; isDuplicate: boolean }> {
    const criticality = input.criticality || this.getDefaultCriticality(input.type);
    const maxAttempts = this.getMaxDeliveryAttempts(criticality);
    const version = input.entityVersion || 1;
    const channel = input.channel || 'IN_APP';

    const idempotencyKey =
      input.idempotencyKey ||
      this.generateStableIdempotencyKey(input.type, input.entityId, input.userId, version);

    // 1. Check if an active preference disables optional notification
    if (!this.isMandatoryCategory(criticality, input.type)) {
      const prefCheck = await client.query(
        `SELECT is_enabled FROM notification_preferences WHERE user_id = $1 AND category = $2 AND channel = $3`,
        [input.userId, input.type, channel]
      );
      if (prefCheck.rows.length > 0 && prefCheck.rows[0].is_enabled === false) {
        // User opted out of optional notification
        return {
          notification: {
            id: 'opted_out',
            user_id: input.userId,
            notification_type: input.type,
            criticality,
            channel,
            title: input.title,
            body: input.body,
            entity_version: version,
            status: 'FAILED',
            delivery_attempts: 0,
            max_delivery_attempts: maxAttempts,
            provider: 'IN_APP',
            idempotency_key: idempotencyKey,
            metadata: { reason: 'USER_OPTED_OUT' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          isDuplicate: false
        };
      }
    }

    // 2. Sanitize title, body, metadata
    const { title, body, sanitizedMetadata } = this.sanitizeNotificationContent(
      input.title,
      input.body,
      input.metadata
    );

    // 2.5 Check idempotency key to prevent duplication
    if (idempotencyKey) {
      const existing = await client.query(
        `SELECT * FROM notifications WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        const existRow = existing.rows[0] as NotificationRecord;
        return {
          notification: {
            ...existRow,
            read: existRow.read_at !== null
          } as any,
          isDuplicate: true
        };
      }
    }

    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const correlationId = input.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 3. Atomically insert with ON CONFLICT (idempotency_key) to guarantee exactly-once logical generation
    let res: pg.QueryResult;
    try {
      res = await client.query(
        `INSERT INTO notifications (
          id, user_id, notification_type, criticality, channel, title, body,
          entity_type, entity_id, entity_version, status, delivery_attempts, max_delivery_attempts,
          provider, idempotency_key, correlation_id, recipient_role, metadata, expires_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, 'PENDING', 0, $11,
          'IN_APP', $12, $13, $14, $15, $16, NOW(), NOW()
        ) ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *`,
        [
          notificationId,
          input.userId,
          input.type,
          criticality,
          channel,
          title,
          body,
          input.entityType || null,
          input.entityId || null,
          version,
          maxAttempts,
          idempotencyKey,
          correlationId,
          input.recipientRole || null,
          JSON.stringify(sanitizedMetadata),
          input.expiresAt || null
        ]
      );
    } catch (insertErr: any) {
      const existing = await client.query(
        `SELECT * FROM notifications WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        const existRow = existing.rows[0] as NotificationRecord;
        return {
          notification: {
            ...existRow,
            read: existRow.read_at !== null
          } as any,
          isDuplicate: true
        };
      }
      throw insertErr;
    }

    if (res.rows.length === 0) {
      // Duplicate idempotency key detected: fetch authoritative existing notification
      const existing = await client.query(
        `SELECT * FROM notifications WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      const existRow = existing.rows[0] as NotificationRecord;
      return {
        notification: {
          ...existRow,
          read: existRow.read_at !== null
        } as any,
        isDuplicate: true
      };
    }

    const createdNotif = res.rows[0] as NotificationRecord;
    return {
      notification: {
        ...createdNotif,
        read: createdNotif.read_at !== null
      } as any,
      isDuplicate: false
    };
  }

  // ---------------------------------------------------------------------------
  // 5. ASYNCHRONOUS DELIVERY & RETRY ENGINE
  // ---------------------------------------------------------------------------

  public static setMockProviderFailure(fn: ((notif: NotificationRecord) => DeliveryProviderResult | null) | null) {
    this.mockProviderFailure = fn;
  }

  public static resetCircuitBreaker() {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenUntil = 0;
  }

  public static async executeDelivery(
    notificationId: string,
    pool?: pg.Pool
  ): Promise<{ status: NotificationStatus; attempts: number; error?: string }> {
    const targetPool = pool || dbPool.getPool();

    // Check circuit breaker
    const now = Date.now();
    if (this.circuitBreakerOpenUntil > now) {
      return { status: 'FAILED', attempts: 0, error: 'CIRCUIT_BREAKER_OPEN' };
    }

    return await withTransaction(async (client) => {
      // Row-level lock to prevent concurrent duplicate delivery across independent processes
      const sel = await client.query(
        `SELECT * FROM notifications WHERE id = $1 FOR UPDATE`,
        [notificationId]
      );

      if (sel.rows.length === 0) {
        throw new Error('NOTIFICATION_NOT_FOUND');
      }

      const notif = sel.rows[0] as NotificationRecord;

      if (notif.status === 'DELIVERED') {
        return { status: 'DELIVERED', attempts: notif.delivery_attempts };
      }

      if (notif.status === 'DEAD_LETTER') {
        return { status: 'DEAD_LETTER', attempts: notif.delivery_attempts, error: 'IN_DEAD_LETTER_VAULT' };
      }

      const nextAttempt = notif.delivery_attempts + 1;
      let deliveryResult: DeliveryProviderResult = { success: true, providerMessageId: `msg_${Date.now()}` };

      // Provider hook (check test override)
      if (this.mockProviderFailure) {
        const override = this.mockProviderFailure(notif);
        if (override !== null) {
          deliveryResult = override;
        }
      }

      if (deliveryResult.success) {
        // Reset consecutive failures on success
        this.circuitBreakerFailures = 0;

        await client.query(
          `UPDATE notifications SET 
            status = 'DELIVERED',
            delivery_attempts = $1,
            last_attempt_at = NOW(),
            delivered_at = NOW(),
            provider_message_id = $2,
            updated_at = NOW()
          WHERE id = $3`,
          [nextAttempt, deliveryResult.providerMessageId || null, notificationId]
        );

        return { status: 'DELIVERED', attempts: nextAttempt };
      } else {
        // Delivery failed
        this.circuitBreakerFailures++;
        if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
          this.circuitBreakerOpenUntil = Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS;
        }

        const isExhausted = nextAttempt >= notif.max_delivery_attempts;
        const newStatus: NotificationStatus = isExhausted ? (notif.criticality === 'CRITICAL' ? 'DEAD_LETTER' : 'FAILED') : 'PENDING';

        // Calculate exponential backoff delay
        const backoffSeconds = Math.pow(2, nextAttempt);

        await client.query(
          `UPDATE notifications SET 
            status = $1,
            delivery_attempts = $2,
            last_attempt_at = NOW(),
            next_retry_at = NOW() + ($3 || ' seconds')::interval,
            updated_at = NOW()
          WHERE id = $4`,
          [newStatus, nextAttempt, `${backoffSeconds}`, notificationId]
        );

        // If moved to DEAD_LETTER, preserve record in quarantine vault
        if (newStatus === 'DEAD_LETTER') {
          const vaultId = `dlv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          await client.query(
            `INSERT INTO notification_dead_letter_vault (
              id, notification_id, user_id, criticality, final_error_reason, attempt_count, payload, quarantined_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              vaultId,
              notif.id,
              notif.user_id,
              notif.criticality,
              deliveryResult.error || 'MAX_DELIVERY_ATTEMPTS_EXCEEDED',
              nextAttempt,
              JSON.stringify(notif)
            ]
          );
        }

        return {
          status: newStatus,
          attempts: nextAttempt,
          error: deliveryResult.error
        };
      }
    }, targetPool);
  }

  // ---------------------------------------------------------------------------
  // 6. WRONG-USER & IDOR SECURITY: AUTHORITATIVE READ & QUERY
  // ---------------------------------------------------------------------------

  public static async getNotificationsForUser(
    requestingUser: { id: string; role: string },
    targetUserId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      criticality?: NotificationCriticality;
    } = {},
    pool?: pg.Pool
  ): Promise<{ notifications: NotificationRecord[]; totalCount: number; unreadCount: number }> {
    // IDOR Protection: Ordinary players can NEVER access another player's notifications!
    if (requestingUser.id !== targetUserId && requestingUser.role !== 'SUPER_ADMIN' && requestingUser.role !== 'ADMIN') {
      throw new Error('FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS');
    }

    const targetPool = pool || dbPool.getPool();
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params: any[] = [targetUserId];

    if (options.unreadOnly) {
      query += ` AND read_at IS NULL`;
    }
    if (options.criticality) {
      params.push(options.criticality);
      query += ` AND criticality = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const listRes = await targetPool.query(query, params);

    const unreadRes = await targetPool.query(
      `SELECT count(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [targetUserId]
    );

    const totalRes = await targetPool.query(
      `SELECT count(*) as count FROM notifications WHERE user_id = $1`,
      [targetUserId]
    );

    return {
      notifications: listRes.rows.map((r: any) => ({
        ...r,
        read: r.read_at !== null
      })) as any,
      totalCount: parseInt(totalRes.rows[0]?.count || '0', 10),
      unreadCount: parseInt(unreadRes.rows[0]?.count || '0', 10)
    };
  }

  public static async getNotificationById(
    requestingUser: { id: string; role: string },
    notificationId: string,
    pool?: pg.Pool
  ): Promise<NotificationRecord> {
    const targetPool = pool || dbPool.getPool();
    const res = await targetPool.query(`SELECT * FROM notifications WHERE id = $1`, [notificationId]);

    if (res.rows.length === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    const notif = res.rows[0] as NotificationRecord;

    // Strict IDOR authorization check
    if (notif.user_id !== requestingUser.id && requestingUser.role !== 'SUPER_ADMIN' && requestingUser.role !== 'ADMIN') {
      throw new Error('FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS');
    }

    return {
      ...notif,
      read: notif.read_at !== null
    } as any;
  }

  public static async markNotificationRead(
    requestingUser: { id: string; role: string },
    notificationId: string,
    pool?: pg.Pool
  ): Promise<{ success: boolean; readAt: string }> {
    const targetPool = pool || dbPool.getPool();

    // Verify ownership before mutating
    const sel = await targetPool.query(`SELECT user_id, read_at FROM notifications WHERE id = $1`, [notificationId]);
    if (sel.rows.length === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    if (sel.rows[0].user_id !== requestingUser.id && requestingUser.role !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN_CROSS_USER_NOTIFICATION_MUTATION');
    }

    const upd = await targetPool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW() WHERE id = $1 RETURNING read_at`,
      [notificationId]
    );

    return {
      success: true,
      readAt: upd.rows[0].read_at
    };
  }

  public static async markAllNotificationsRead(
    requestingUser: { id: string; role: string },
    pool?: pg.Pool
  ): Promise<{ markedCount: number }> {
    const targetPool = pool || dbPool.getPool();
    const res = await targetPool.query(
      `UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND read_at IS NULL RETURNING id`,
      [requestingUser.id]
    );

    return { markedCount: res.rows.length };
  }

  // ---------------------------------------------------------------------------
  // 7. STAFF ROLE ISOLATION (RBAC)
  // ---------------------------------------------------------------------------

  public static isStaffAuthorizedForNotification(staffRole: string, notificationType: NotificationType): boolean {
    if (staffRole === 'SUPER_ADMIN' || staffRole === 'ADMIN') return true;

    switch (notificationType) {
      case 'STAFF_PAYMENT_ALERT':
        return staffRole === 'PAYMENT_VERIFIER';
      case 'STAFF_FINANCIAL_ALERT':
      case 'STAFF_RECONCILIATION_ALERT':
        return staffRole === 'WALLET_MANAGER';
      case 'STAFF_COMP_APPROVAL':
        return staffRole === 'COMPETITION_PUBLISHER';
      case 'STAFF_AD_APPROVAL':
        return staffRole === 'ADVERTISEMENT_MANAGER';
      case 'STAFF_FRAUD_ALERT':
        return staffRole === 'WALLET_MANAGER' || staffRole === 'PAYMENT_VERIFIER';
      case 'STAFF_SYSTEM_ALERT':
      case 'STAFF_DR_INCIDENT':
        return staffRole === 'SUPER_ADMIN';
      default:
        return false;
    }
  }

  public static async getStaffNotifications(
    staffUser: { id: string; role: string },
    pool?: pg.Pool
  ): Promise<NotificationRecord[]> {
    if (staffUser.role === 'PLAYER') {
      throw new Error('FORBIDDEN_STAFF_ROLE_REQUIRED');
    }

    const targetPool = pool || dbPool.getPool();

    // Query notifications directed to staff roles or administrative channels
    const res = await targetPool.query(
      `SELECT * FROM notifications 
       WHERE notification_type LIKE 'STAFF_%' OR recipient_role IS NOT NULL
       ORDER BY created_at DESC LIMIT 50`
    );

    // Filter strictly by the authorized staff scope
    return res.rows.filter((notif: NotificationRecord) =>
      this.isStaffAuthorizedForNotification(staffUser.role, notif.notification_type)
    );
  }

  // ---------------------------------------------------------------------------
  // 8. DEVICE TOKEN REGISTRATION & SECURITY
  // ---------------------------------------------------------------------------

  public static async registerDeviceToken(
    userId: string,
    token: string,
    platform: string = 'WEB',
    pool?: pg.Pool
  ): Promise<{ success: boolean; tokenId: string }> {
    if (!token || token.trim().length < 8) {
      throw new Error('INVALID_DEVICE_TOKEN');
    }

    const targetPool = pool || dbPool.getPool();

    return await withTransaction(async (client) => {
      // 1. Security: If token exists for a different user, revoke it immediately (prevent push redirection hijack)
      await client.query(
        `UPDATE device_tokens SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
         WHERE device_token = $1 AND user_id != $2`,
        [token, userId]
      );

      // 2. Upsert token for caller
      const tokenId = `dt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const res = await client.query(
        `INSERT INTO device_tokens (id, user_id, device_token, platform, is_active, registered_at, updated_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
         ON CONFLICT (user_id, device_token) 
         DO UPDATE SET is_active = TRUE, revoked_at = NULL, updated_at = NOW()
         RETURNING id`,
        [tokenId, userId, token, platform]
      );

      return { success: true, tokenId: res.rows[0].id };
    }, targetPool);
  }

  public static async revokeDeviceToken(
    userId: string,
    token: string,
    pool?: pg.Pool
  ): Promise<{ success: boolean }> {
    const targetPool = pool || dbPool.getPool();
    await targetPool.query(
      `UPDATE device_tokens SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND device_token = $2`,
      [userId, token]
    );
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // 9. PREFERENCE MANAGEMENT (MANDATORY VS OPTIONAL)
  // ---------------------------------------------------------------------------

  public static async setNotificationPreference(
    userId: string,
    category: NotificationType,
    isEnabled: boolean,
    channel: NotificationChannel = 'IN_APP',
    pool?: pg.Pool
  ): Promise<{ success: boolean; isEnabled: boolean }> {
    const criticality = this.getDefaultCriticality(category);

    // Mandatory categories CANNOT be disabled
    if (!isEnabled && this.isMandatoryCategory(criticality, category)) {
      throw new Error('CANNOT_DISABLE_MANDATORY_NOTIFICATION');
    }

    const targetPool = pool || dbPool.getPool();
    const prefId = `np_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await targetPool.query(
      `INSERT INTO notification_preferences (id, user_id, category, channel, is_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, category, channel)
       DO UPDATE SET is_enabled = $5, updated_at = NOW()`,
      [prefId, userId, category, channel, isEnabled]
    );

    return { success: true, isEnabled };
  }

  public static async getPreferences(userId: string, pool?: pg.Pool): Promise<any[]> {
    const targetPool = pool || dbPool.getPool();
    const res = await targetPool.query(
      `SELECT category, channel, is_enabled FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return res.rows;
  }

  public static async getUnreadCount(userId: string, pool?: pg.Pool): Promise<number> {
    const targetPool = pool || dbPool.getPool();
    const res = await targetPool.query(
      `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  public static async getNotificationStats(
    requestingUser: { id: string; role: string },
    pool?: pg.Pool
  ): Promise<any> {
    const isStaff = [
      'SUPER_ADMIN',
      'ADMIN',
      'PAYMENT_VERIFIER',
      'WALLET_MANAGER',
      'COMPETITION_PUBLISHER',
      'CUSTOMER_SUPPORT'
    ].includes(requestingUser.role);
    if (!isStaff) {
      throw new Error('FORBIDDEN_STAFF_ROLE_REQUIRED');
    }
    const targetPool = pool || dbPool.getPool();
    const statsRes = await targetPool.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int as delivered,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int as failed
      FROM notifications
    `);
    const dlvRes = await targetPool.query(`SELECT COUNT(*)::int as dlv_count FROM notification_dead_letter_vault`);
    return {
      notifications: statsRes.rows[0],
      deadLetterCount: parseInt(dlvRes.rows[0]?.dlv_count || '0', 10)
    };
  }

  // ---------------------------------------------------------------------------
  // 10. RECOVERY FROM DEAD-LETTER VAULT
  // ---------------------------------------------------------------------------

  public static async retryDeadLetterNotification(
    staffUser: { id: string; role: string },
    notificationId: string,
    pool?: pg.Pool
  ): Promise<{ status: NotificationStatus; attempts: number }> {
    if (staffUser.role !== 'SUPER_ADMIN' && staffUser.role !== 'WALLET_MANAGER') {
      throw new Error('FORBIDDEN_DEAD_LETTER_RETRY');
    }

    const targetPool = pool || dbPool.getPool();

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE notifications SET 
          status = 'PENDING',
          delivery_attempts = 0,
          updated_at = NOW()
        WHERE id = $1`,
        [notificationId]
      );

      await client.query(
        `UPDATE notification_dead_letter_vault SET 
          resolved_at = NOW(),
          resolved_by = $1
        WHERE notification_id = $2`,
        [staffUser.id, notificationId]
      );
    }, targetPool);

    return await this.executeDelivery(notificationId, targetPool);
  }
}
