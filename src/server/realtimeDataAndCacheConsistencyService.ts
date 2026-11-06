/**
 * APEX ARENA — RISK 19: REALTIME DATA & CACHE CONSISTENCY SERVICE
 *
 * Core Architectural Mandates:
 * 1. DATABASE = AUTHORITATIVE STATE
 * 2. CACHE = PERFORMANCE LAYER (Never authorizes mutations or financial debits)
 * 3. REALTIME = NOTIFICATION / STATE-CHANGE DELIVERY LAYER
 * 4. FRONTEND MEMORY = TEMPORARY PRESENTATION STATE
 *
 * Enforces:
 * - Data Consistency Classes (A: Financial-Critical, B: Competition-Critical, C: Presentation)
 * - Scope-Isolated Cache Keys (Zero cross-user, cross-role, or cross-tenant leakage)
 * - Cache Poisoning & Collision Sanitization
 * - Transactional Outbox Pattern & Monotonic Entity Versioning
 * - Out-of-Order & Duplicate Event Idempotency
 * - Client Reconnection & State Resynchronization
 * - Server-Authoritative Mutation Gatekeeping (Split-Brain Defense)
 * - Single-Flight Cache Stampede & Thundering Herd Coalescing
 * - Role-Scoped & User-Scoped Realtime Subscription Authorization
 * - Zero Minor-Unit Financial Discrepancy Invariant
 */

import crypto from 'crypto';
import pg from 'pg';
import { dbPool } from './db/pool.js';
import { withTransaction } from './db/postgresService.js';

function hashStringToInteger(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// =============================================================================
// 1. DATA CONSISTENCY CLASSIFICATIONS & POLICIES
// =============================================================================

export enum DataConsistencyClass {
  CLASS_A_FINANCIAL = 'CLASS_A_FINANCIAL',     // Max staleness: 0ms (DB authoritative check mandatory)
  CLASS_B_COMPETITION = 'CLASS_B_COMPETITION', // Max staleness: 500ms (DB revalidation before mutation/cutoff)
  CLASS_C_PRESENTATION = 'CLASS_C_PRESENTATION' // Max staleness: 5000ms (Bounded staleness acceptable)
}

export interface CacheKeyScope {
  namespace: string;
  userId?: string;
  role?: string;
  competitionId?: string;
  fixtureId?: string;
  version?: number | string;
  tenant?: string;
}

export interface RealtimeEventPayload {
  eventId: string;
  entityType: 'COMPETITION' | 'FIXTURE' | 'PREDICTION' | 'WALLET' | 'SETTLEMENT' | 'WITHDRAWAL' | 'DEPOSIT' | 'LEADERBOARD' | 'NOTIFICATION' | 'ADMIN';
  entityId: string;
  entityVersion: number;
  eventType: string;
  payload: Record<string, any>;
  recipientScope: 'PUBLIC' | 'USER' | 'STAFF' | 'ROLE';
  recipientId?: string;
  serverSequence?: number;
  occurredAt: string;
}

export interface ClientSyncResult {
  clientId: string;
  userId: string;
  lastSequence: number;
  latestSequence: number;
  hasGap: boolean;
  events: RealtimeEventPayload[];
  authoritativeSnapshots?: {
    walletBalanceCents?: number;
    heldBalanceCents?: number;
    openCompetitions?: Array<{ id: string; status: string; version: number }>;
  };
}

export class RealtimeDataAndCacheConsistencyService {
  private static instanceLocalCache = new Map<string, { value: any; expiresAt: number; version: number }>();
  private static singleFlightPromises = new Map<string, Promise<any>>();
  private static instanceId = `inst_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;

  // ===========================================================================
  // 2. CACHE KEY ISOLATION & POISONING SANITIZATION
  // ===========================================================================

  /**
   * Sanitizes input identifiers to prevent cache poisoning, key collision,
   * directory traversal injection, and casing/whitespace ambiguity.
   */
  public static sanitizeCacheIdentifier(input?: string): string {
    if (!input) return 'anonymous';
    // Trim, convert to canonical lowercase, strip directory traversal characters
    let clean = input.trim().toLowerCase();
    clean = clean.replace(/[\.\/\\:\s\x00-\x1f\x7f]+/g, '_');
    clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return clean || 'anonymous';
  }

  /**
   * Builds an isolated, structured cache key ensuring strict scope boundaries.
   */
  public static buildScopedCacheKey(scope: CacheKeyScope): string {
    const tenant = this.sanitizeCacheIdentifier(scope.tenant || 'apex');
    const ns = this.sanitizeCacheIdentifier(scope.namespace);
    const parts: string[] = [tenant, ns];

    if (scope.role) parts.push(`role_${this.sanitizeCacheIdentifier(scope.role)}`);
    if (scope.userId) parts.push(`usr_${this.sanitizeCacheIdentifier(scope.userId)}`);
    if (scope.competitionId) parts.push(`comp_${this.sanitizeCacheIdentifier(scope.competitionId)}`);
    if (scope.fixtureId) parts.push(`fix_${this.sanitizeCacheIdentifier(scope.fixtureId)}`);
    if (scope.version !== undefined) parts.push(`v_${this.sanitizeCacheIdentifier(String(scope.version))}`);

    return parts.join(':');
  }

  /**
   * Determines HTTP Cache-Control headers based on data consistency classification.
   */
  public static getHttpCacheHeaders(classification: DataConsistencyClass, isPrivateUserScoped: boolean = true): Record<string, string> {
    if (classification === DataConsistencyClass.CLASS_A_FINANCIAL || isPrivateUserScoped) {
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Authorization, X-User-Id, Accept-Encoding'
      };
    }

    if (classification === DataConsistencyClass.CLASS_B_COMPETITION) {
      return {
        'Cache-Control': 'public, max-age=1, s-maxage=1, must-revalidate',
        'Vary': 'Accept-Encoding'
      };
    }

    // CLASS_C_PRESENTATION
    return {
      'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=10',
      'Vary': 'Accept-Encoding'
    };
  }

  // ===========================================================================
  // 3. AUTHORITATIVE TRANSACTIONAL OUTBOX & EVENT EMISSION
  // ===========================================================================

  /**
   * Emits an authoritative event inside a PostgreSQL transaction (Outbox Pattern).
   * Guarantees that the event is committed together with the database state change.
   */
  public static async emitTransactionalOutboxEvent(
    client: pg.PoolClient,
    event: {
      entityType: 'COMPETITION' | 'FIXTURE' | 'PREDICTION' | 'WALLET' | 'SETTLEMENT' | 'WITHDRAWAL' | 'DEPOSIT' | 'LEADERBOARD' | 'NOTIFICATION' | 'ADMIN';
      entityId: string;
      entityVersion: number;
      eventType: string;
      payload: Record<string, any>;
      recipientScope?: 'PUBLIC' | 'USER' | 'STAFF' | 'ROLE';
      recipientId?: string;
    }
  ): Promise<RealtimeEventPayload> {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const scope = event.recipientScope || 'PUBLIC';
    const occurredAt = new Date().toISOString();

    const insertRes = await client.query(
      `INSERT INTO realtime_events (
        id, event_id, entity_type, entity_id, entity_version,
        event_type, payload, recipient_scope, recipient_id, published_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING server_sequence`,
      [
        eventId,
        eventId,
        event.entityType,
        event.entityId,
        event.entityVersion,
        event.eventType,
        JSON.stringify(event.payload),
        scope,
        event.recipientId || null,
        occurredAt
      ]
    );

    const serverSequence = Number(insertRes.rows[0].server_sequence);

    // Also log distributed cache invalidation
    await client.query(
      `INSERT INTO cache_invalidation_log (
        id, namespace, cache_key, entity_version, invalidation_reason, origin_instance_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        event.entityType.toLowerCase(),
        `${event.entityType.toLowerCase()}:${event.entityId}`,
        event.entityVersion,
        event.eventType,
        this.instanceId,
        occurredAt
      ]
    );

    return {
      eventId,
      entityType: event.entityType,
      entityId: event.entityId,
      entityVersion: event.entityVersion,
      eventType: event.eventType,
      payload: event.payload,
      recipientScope: scope,
      recipientId: event.recipientId,
      serverSequence,
      occurredAt
    };
  }

  // ===========================================================================
  // 4. EVENT ORDERING, OUT-OF-ORDER DEFENSE & IDEMPOTENT RECEIPTS
  // ===========================================================================

  /**
   * Reconciles incoming realtime events against the current authoritative entity state.
   * Rejects out-of-order / stale events whose version is older than or equal to the current state.
   */
  public static reconcileEventOrdering(
    currentAuthoritativeVersion: number,
    incomingEvent: RealtimeEventPayload
  ): { accept: boolean; reason?: string } {
    if (incomingEvent.entityVersion <= currentAuthoritativeVersion) {
      return {
        accept: false,
        reason: `STALE_OUT_OF_ORDER_EVENT: Incoming version (${incomingEvent.entityVersion}) <= current authoritative version (${currentAuthoritativeVersion})`
      };
    }
    return { accept: true };
  }

  /**
   * Processes a realtime event with strict consumer-level idempotency.
   * Prevents duplicate execution of state transitions on duplicate event arrival.
   */
  public static async processEventWithIdempotency(
    consumerId: string,
    event: RealtimeEventPayload,
    handler: () => Promise<any>,
    pool?: pg.Pool
  ): Promise<{ success: boolean; duplicate: boolean; result?: any }> {
    const targetPool = pool || dbPool.getPool();
    const lockKeyStr = `idem_${consumerId}_${event.eventId}`;

    if (this.singleFlightPromises.has(lockKeyStr)) {
      await this.singleFlightPromises.get(lockKeyStr);
      return { success: true, duplicate: true, result: { status: 'ALREADY_PROCESSED' } };
    }

    const lockKeyInt = hashStringToInteger(`${consumerId}:${event.eventId}`);
    const promise = (async () => {
      return await withTransaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKeyInt]);

        // Check if already processed
        const existing = await client.query(
          `SELECT * FROM idempotent_event_receipts WHERE consumer_id = $1 AND event_id = $2`,
          [consumerId, event.eventId]
        );

        if (existing.rows.length > 0) {
          return {
            success: true,
            duplicate: true,
            result: { status: 'ALREADY_PROCESSED', processedAt: existing.rows[0].processed_at }
          };
        }

        // Execute handler
        const res = await handler();

        // Record receipt
        await client.query(
          `INSERT INTO idempotent_event_receipts (
            id, consumer_id, event_id, entity_type, entity_id, processed_at, result_status
          ) VALUES ($1, $2, $3, $4, $5, NOW(), 'PROCESSED')
          ON CONFLICT (consumer_id, event_id) DO NOTHING`,
          [
            `rcpt_${consumerId}_${event.eventId}`,
            consumerId,
            event.eventId,
            event.entityType,
            event.entityId
          ]
        );

        return { success: true, duplicate: false, result: res };
      }, targetPool);
    })();

    this.singleFlightPromises.set(lockKeyStr, promise);
    try {
      return await promise;
    } finally {
      this.singleFlightPromises.delete(lockKeyStr);
    }
  }

  // ===========================================================================
  // 5. CLIENT RECONNECTION & AUTHORITATIVE RESYNCHRONIZATION
  // ===========================================================================

  /**
   * Reconnects a client and retrieves missed events since last acknowledged sequence.
   * If the gap is too large, returns an authoritative snapshot instead.
   */
  public static async synchronizeClientSession(
    userId: string,
    clientId: string,
    lastAcknowledgedSequence: number,
    pool?: pg.Pool
  ): Promise<ClientSyncResult> {
    const targetPool = pool || dbPool.getPool();

    return await withTransaction(async (client) => {
      // Register or update sync session
      await client.query(
        `INSERT INTO client_sync_sessions (
          id, user_id, client_id, last_acknowledged_sequence, last_sync_at, connected_instance_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), $5, NOW())
        ON CONFLICT (user_id, client_id) DO UPDATE SET
          last_acknowledged_sequence = EXCLUDED.last_acknowledged_sequence,
          last_sync_at = NOW(),
          connected_instance_id = EXCLUDED.connected_instance_id`,
        [
          `sync_${userId}_${clientId}`,
          userId,
          clientId,
          lastAcknowledgedSequence,
          this.instanceId
        ]
      );

      // Get latest server sequence
      const seqRes = await client.query(`SELECT COALESCE(MAX(server_sequence), 0) as max_seq FROM realtime_events`);
      const latestSequence = Number(seqRes.rows[0].max_seq);

      const missedCount = latestSequence - lastAcknowledgedSequence;
      const MAX_EVENT_DELTA = 100;

      // If gap is large, provide snapshot
      if (missedCount > MAX_EVENT_DELTA) {
        // Fetch authoritative wallet snapshot from wallets table
        const walletRes = await client.query(`SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1`, [userId]);
        const compsRes = await client.query(`SELECT id, status FROM competitions WHERE status IN ('ACTIVE', 'OPEN') LIMIT 20`);

        return {
          clientId,
          userId,
          lastSequence: lastAcknowledgedSequence,
          latestSequence,
          hasGap: true,
          events: [],
          authoritativeSnapshots: {
            walletBalanceCents: walletRes.rows[0] ? Number(walletRes.rows[0].balance_cents) : 0,
            heldBalanceCents: walletRes.rows[0] ? Number(walletRes.rows[0].held_cents) : 0,
            openCompetitions: compsRes.rows.map(r => ({ id: r.id, status: r.status, version: 1 }))
          }
        };
      }

      // Fetch missed events visible to this user
      const eventsRes = await client.query(
        `SELECT * FROM realtime_events
         WHERE server_sequence > $1
           AND (recipient_scope = 'PUBLIC' OR (recipient_scope = 'USER' AND recipient_id = $2))
         ORDER BY server_sequence ASC`,
        [lastAcknowledgedSequence, userId]
      );

      const events: RealtimeEventPayload[] = eventsRes.rows.map(r => ({
        eventId: r.event_id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        entityVersion: Number(r.entity_version),
        eventType: r.event_type,
        payload: r.payload,
        recipientScope: r.recipient_scope,
        recipientId: r.recipient_id,
        serverSequence: Number(r.server_sequence),
        occurredAt: r.published_at.toISOString()
      }));

      return {
        clientId,
        userId,
        lastSequence: lastAcknowledgedSequence,
        latestSequence,
        hasGap: false,
        events
      };
    }, targetPool);
  }

  // ===========================================================================
  // 6. SERVER-AUTHORITATIVE MUTATION GATEKEEPERS (SPLIT-BRAIN DEFENSE)
  // ===========================================================================

  /**
   * Evaluates wallet mutation strictly against PostgreSQL row-level locks.
   * Reject stale cached balance attempts.
   */
  public static async validateAuthoritativeWalletDebit(
    userId: string,
    amountCents: number,
    pool?: pg.Pool | pg.PoolClient
  ): Promise<{ authorized: boolean; currentBalanceCents: number; reason?: string }> {
    const executeQuery = async (client: pg.PoolClient | pg.Pool) => {
      const lockKey = Math.abs(crypto.createHash('sha256').update(`wallet_${userId}`).digest().readInt32BE(0));
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

      const userRes = await client.query(
        `SELECT u.account_status, w.balance_cents, w.held_cents, w.is_frozen 
         FROM users u
         JOIN wallets w ON w.user_id = u.id
         WHERE u.id = $1 FOR UPDATE`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        return { authorized: false, currentBalanceCents: 0, reason: 'USER_NOT_FOUND' };
      }

      const user = userRes.rows[0];
      const availableCents = Number(user.balance_cents) - Number(user.held_cents || 0);

      if (user.account_status === 'SUSPENDED' || user.account_status === 'RESTRICTED' || user.is_frozen) {
        return { authorized: false, currentBalanceCents: Number(user.balance_cents), reason: 'ACCOUNT_RESTRICTED' };
      }

      if (availableCents < amountCents) {
        return {
          authorized: false,
          currentBalanceCents: Number(user.balance_cents),
          reason: `INSUFFICIENT_FUNDS: Available ${availableCents} < Required ${amountCents}`
        };
      }

      return { authorized: true, currentBalanceCents: Number(user.balance_cents) };
    };

    if (pool && typeof (pool as any).release === 'function') {
      return await executeQuery(pool as pg.PoolClient);
    }

    const targetPool = (pool as pg.Pool) || dbPool.getPool();
    return await withTransaction(async (client) => {
      return await executeQuery(client);
    }, targetPool);
  }

  /**
   * Validates competition entry submission strictly against DB lifecycle and cutoff time.
   */
  public static async validateAuthoritativeCompetitionEntry(
    competitionId: string,
    userId: string,
    entryFeeCents: number,
    pool?: pg.Pool
  ): Promise<{ authorized: boolean; reason?: string }> {
    const targetPool = pool || dbPool.getPool();

    return await withTransaction(async (client) => {
      const compRes = await client.query(
        `SELECT status, entry_deadline, max_participants, current_participants FROM competitions WHERE id = $1 FOR UPDATE`,
        [competitionId]
      );

      if (compRes.rows.length === 0) {
        return { authorized: false, reason: 'COMPETITION_NOT_FOUND' };
      }

      const comp = compRes.rows[0];
      const now = new Date();

      if (comp.status !== 'ACTIVE' && comp.status !== 'OPEN') {
        return { authorized: false, reason: `COMPETITION_NOT_OPEN: Current status is ${comp.status}` };
      }

      if (new Date(comp.entry_deadline) <= now) {
        return { authorized: false, reason: 'DEADLINE_PASSED: Entry deadline has passed' };
      }

      if (comp.max_participants && comp.current_participants >= comp.max_participants) {
        return { authorized: false, reason: 'CAPACITY_REACHED: Competition is full' };
      }

      // Check existing entry
      const entryRes = await client.query(
        `SELECT id FROM competition_entries WHERE competition_id = $1 AND user_id = $2`,
        [competitionId, userId]
      );

      if (entryRes.rows.length > 0) {
        return { authorized: false, reason: 'DUPLICATE_ENTRY: Player has already entered' };
      }

      // Check wallet
      if (entryFeeCents > 0) {
        const walletCheck = await this.validateAuthoritativeWalletDebit(userId, entryFeeCents, targetPool);
        if (!walletCheck.authorized) {
          return { authorized: false, reason: walletCheck.reason };
        }
      }

      return { authorized: true };
    }, targetPool);
  }

  /**
   * Validates prediction cutoff strictly against fixture kickoff time in PostgreSQL.
   */
  public static async validateAuthoritativePredictionCutoff(
    fixtureId: string,
    submissionTime: Date = new Date(),
    pool?: pg.Pool
  ): Promise<{ authorized: boolean; kickoffTime: Date; reason?: string }> {
    const targetPool = pool || dbPool.getPool();

    const fixRes = await targetPool.query(
      `SELECT kickoff_time, status FROM fixtures WHERE id = $1`,
      [fixtureId]
    );

    if (fixRes.rows.length === 0) {
      return { authorized: false, kickoffTime: new Date(0), reason: 'FIXTURE_NOT_FOUND' };
    }

    const fix = fixRes.rows[0];
    const kickoff = new Date(fix.kickoff_time);

    if (fix.status === 'LIVE' || fix.status === 'FINISHED' || fix.status === 'POSTPONED' || fix.status === 'CANCELLED') {
      return { authorized: false, kickoffTime: kickoff, reason: `FIXTURE_STATUS_INVALID: Status is ${fix.status}` };
    }

    if (submissionTime.getTime() >= kickoff.getTime()) {
      return { authorized: false, kickoffTime: kickoff, reason: 'KICKOFF_PASSED: Match has already kicked off' };
    }

    return { authorized: true, kickoffTime: kickoff };
  }

  // ===========================================================================
  // 7. SINGLE-FLIGHT REQUEST COALESCING & CACHE STAMPEDE PROTECTION
  // ===========================================================================

  /**
   * Executes a database read with single-flight request coalescing.
   * If 1,000 requests arrive concurrently for the same expired cache key,
   * only ONE query executes against PostgreSQL while 999 wait on the same Promise.
   */
  public static async executeSingleFlight<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 2000
  ): Promise<T> {
    // 1. Check local in-memory cache
    const cached = this.instanceLocalCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value as T;
    }

    // 2. Check in-flight promise
    if (this.singleFlightPromises.has(key)) {
      return this.singleFlightPromises.get(key) as Promise<T>;
    }

    // 3. Initiate single query
    const promise = (async () => {
      try {
        const result = await fetcher();
        this.instanceLocalCache.set(key, {
          value: result,
          expiresAt: Date.now() + ttlMs,
          version: Date.now()
        });
        return result;
      } finally {
        this.singleFlightPromises.delete(key);
      }
    })();

    this.singleFlightPromises.set(key, promise);
    return promise;
  }

  // ===========================================================================
  // 8. STAFF & PLAYER REALTIME SUBSCRIPTION AUTHORIZATION
  // ===========================================================================

  /**
   * Evaluates if a connected client is authorized to subscribe to a specific realtime channel.
   * Strictly prevents cross-user eavesdropping and unauthorized staff telemetry access.
   */
  public static authorizeSubscription(
    subscriber: { userId?: string; role?: string },
    channel: { type: 'PUBLIC' | 'USER' | 'STAFF' | 'ADMIN' | 'COMPETITION' | 'FIXTURE'; targetId?: string }
  ): { authorized: boolean; reason?: string } {
    if (channel.type === 'PUBLIC' || channel.type === 'COMPETITION' || channel.type === 'FIXTURE') {
      return { authorized: true };
    }

    if (channel.type === 'USER') {
      if (!subscriber.userId) {
        return { authorized: false, reason: 'AUTHENTICATION_REQUIRED' };
      }
      if (subscriber.userId !== channel.targetId) {
        const isStaff = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_SUPPORT', 'WALLET_MANAGER'].includes(subscriber.role || '');
        if (!isStaff) {
          return { authorized: false, reason: 'CROSS_USER_SUBSCRIPTION_FORBIDDEN' };
        }
      }
      return { authorized: true };
    }

    if (channel.type === 'STAFF' || channel.type === 'ADMIN') {
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'WALLET_MANAGER', 'PAYMENT_VERIFIER', 'COMPETITION_PUBLISHER', 'CUSTOMER_SUPPORT'];
      if (!subscriber.role || !allowedRoles.includes(subscriber.role)) {
        return { authorized: false, reason: 'STAFF_ROLE_REQUIRED' };
      }
      return { authorized: true };
    }

    return { authorized: false, reason: 'UNKNOWN_CHANNEL_TYPE' };
  }

  // ===========================================================================
  // 9. POSTPONED MATCH HANDLING & VOID SETTLEMENT CONSISTENCY
  // ===========================================================================

  /**
   * Enforces canonical postponement consistency:
   * - 0-2 affected matches: Competition completes normally; affected matches score 0; winners calculated from remaining.
   * - 3+ affected matches: Competition is VOIDED; eligible players receive 100% exact entry fee refund.
   */
  public static async evaluatePostponementConsistency(
    competitionId: string,
    postponedMatchCount: number,
    pool?: pg.Pool
  ): Promise<{ action: 'SCORED_WITH_ZEROS' | 'COMPETITION_VOIDED'; refundIssued: boolean; totalRefundedCents: number }> {
    const targetPool = pool || dbPool.getPool();

    if (postponedMatchCount < 3) {
      return {
        action: 'SCORED_WITH_ZEROS',
        refundIssued: false,
        totalRefundedCents: 0
      };
    }

    // 3+ matches -> Void and refund
    return await withTransaction(async (client) => {
      // Check if already voided (idempotent protection against duplicate refunds)
      const currentComp = await client.query(
        `SELECT status FROM competitions WHERE id = $1 FOR UPDATE`,
        [competitionId]
      );
      if (currentComp.rows.length === 0 || currentComp.rows[0].status === 'VOIDED') {
        return {
          action: 'COMPETITION_VOIDED',
          refundIssued: false,
          totalRefundedCents: 0
        };
      }

      // Mark competition voided
      await client.query(
        `UPDATE competitions SET status = 'VOIDED', updated_at = NOW() WHERE id = $1`,
        [competitionId]
      );

      // Refund all entrants
      const entriesRes = await client.query(
        `SELECT user_id, entry_fee_paid_cents FROM competition_entries WHERE competition_id = $1`,
        [competitionId]
      );

      let totalRefunded = 0;
      for (const entry of entriesRes.rows) {
        const fee = Number(entry.entry_fee_paid_cents);
        if (fee > 0) {
          await client.query(
            `UPDATE wallets SET balance_cents = balance_cents + $1, updated_at = NOW() WHERE user_id = $2`,
            [fee, entry.user_id]
          );
          await client.query(
            `INSERT INTO wallet_ledger (
              id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents, status, description, created_at, updated_at
            ) VALUES ($1, $2, 'REFUND', 'CREDIT', $3, 0, $3, 'COMPLETED', $4, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              `tx_ref_${crypto.createHash('md5').update(`${competitionId}_${entry.user_id}`).digest('hex')}`,
              entry.user_id,
              fee,
              `100% refund for voided competition ${competitionId}`
            ]
          );
          totalRefunded += fee;
        }
      }

      return {
        action: 'COMPETITION_VOIDED',
        refundIssued: true,
        totalRefundedCents: totalRefunded
      };
    }, targetPool);
  }
}
