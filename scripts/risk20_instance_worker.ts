/**
 * APEX ARENA — RISK 20 MULTI-INSTANCE WORKER (PROCESS A / PROCESS B)
 * Independent Node.js Process running real HTTP server connected to PostgreSQL.
 * Handles Notification Reliability, Transactional Outbox, IDOR, RBAC, and Delivery Engine.
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import pg from 'pg';
import crypto from 'crypto';
import { dbPool } from '../src/server/db/pool.js';
import { withTransaction, toMinorUnits, PostgresWalletService } from '../src/server/db/postgresService.js';
import {
  NotificationReliabilityService,
  NotificationRecord,
  NotificationType,
  NotificationCriticality,
  NotificationChannel
} from '../src/server/notificationReliabilityService.js';

export function createRisk20App(pool: pg.Pool, instanceName: string): express.Express {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', instance: instanceName, pid: process.pid });
  });

  // Auth helper for tests: accepts Bearer token or headers: x-user-id and x-user-role
  const extractUser = (req: express.Request): { id: string; role: string } | null => {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'PLAYER';
    if (!userId) return null;
    return { id: userId, role: userRole };
  };

  // 1. List user's notifications (with IDOR protection)
  app.get('/api/notifications', async (req, res) => {
    const user = extractUser(req);
    if (!user) {
      res.setHeader('X-Total-Count', '0');
      res.setHeader('X-Unread-Count', '0');
      return res.json([]);
    }

    const targetUserId = (req.query.targetUserId as string) || user.id;

    try {
      const result = await NotificationReliabilityService.getNotificationsForUser(
        user,
        targetUserId,
        {
          limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
          offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
          unreadOnly: req.query.unreadOnly === 'true',
          criticality: req.query.criticality as NotificationCriticality
        },
        pool
      );

      res.setHeader('X-Total-Count', result.totalCount.toString());
      res.setHeader('X-Unread-Count', result.unreadCount.toString());
      res.json(result.notifications);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS') {
        return res.status(403).json({ error: 'FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Unread count endpoint
  app.get('/api/notifications/unread-count', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await NotificationReliabilityService.getNotificationsForUser(
        user,
        user.id,
        { unreadOnly: true },
        pool
      );
      res.json({ unreadCount: result.unreadCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Get single notification by ID (with IDOR protection)
  app.get('/api/notifications/:id', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const notif = await NotificationReliabilityService.getNotificationById(user, req.params.id, pool);
      res.json(notif);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS') {
        return res.status(403).json({ error: 'FORBIDDEN_CROSS_USER_NOTIFICATION_ACCESS' });
      }
      if (err.message === 'NOTIFICATION_NOT_FOUND') {
        return res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Mark notification read
  app.put('/api/notifications/:id/read', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await NotificationReliabilityService.markNotificationRead(user, req.params.id, pool);
      res.json(result);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_CROSS_USER_NOTIFICATION_MUTATION') {
        return res.status(403).json({ error: 'FORBIDDEN_CROSS_USER_NOTIFICATION_MUTATION' });
      }
      if (err.message === 'NOTIFICATION_NOT_FOUND') {
        return res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Mark all read
  app.put('/api/notifications/read-all', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await NotificationReliabilityService.markAllNotificationsRead(user, pool);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Device tokens
  app.post('/api/notifications/device-tokens', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { token, platform } = req.body;
    try {
      const result = await NotificationReliabilityService.registerDeviceToken(user.id, token, platform, pool);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/device-tokens/:token', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await NotificationReliabilityService.revokeDeviceToken(user.id, req.params.token, pool);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Notification Preferences
  app.put('/api/notifications/preferences', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { category, isEnabled, channel } = req.body;
    try {
      const result = await NotificationReliabilityService.setNotificationPreference(
        user.id,
        category,
        isEnabled,
        channel,
        pool
      );
      res.json(result);
    } catch (err: any) {
      if (err.message === 'CANNOT_DISABLE_MANDATORY_NOTIFICATION') {
        return res.status(400).json({ error: 'CANNOT_DISABLE_MANDATORY_NOTIFICATION' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Staff isolated notifications
  app.get('/api/staff/notifications', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const staffNotifs = await NotificationReliabilityService.getStaffNotifications(user, pool);
      res.json(staffNotifs);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_STAFF_ROLE_REQUIRED') {
        return res.status(403).json({ error: 'FORBIDDEN_STAFF_ROLE_REQUIRED' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Retry dead-letter notifications
  app.post('/api/staff/notifications/dead-letter/:id/retry', async (req, res) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await NotificationReliabilityService.retryDeadLetterNotification(user, req.params.id, pool);
      res.json(result);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_DEAD_LETTER_RETRY') {
        return res.status(403).json({ error: 'FORBIDDEN_DEAD_LETTER_RETRY' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Execute delivery
  app.post('/api/test/deliver/:id', async (req, res) => {
    try {
      const result = await NotificationReliabilityService.executeDelivery(req.params.id, pool);
      res.json({ instance: instanceName, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Transactional Creation endpoint for tests
  app.post('/api/test/create-notification', async (req, res) => {
    const { userId, type, title, body, entityType, entityId, entityVersion, criticality, channel, idempotencyKey, metadata } = req.body;
    try {
      const result = await withTransaction(async (client) => {
        return await NotificationReliabilityService.createNotificationInTransaction(client, {
          userId,
          type,
          title,
          body,
          entityType,
          entityId,
          entityVersion,
          criticality,
          channel,
          idempotencyKey,
          metadata
        });
      }, pool);
      res.json({ instance: instanceName, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Combined business mutation: Deposit + Outbox Notification
  app.post('/api/test/wallet/deposit', async (req, res) => {
    const { userId, amountETB, paymentReference, shouldFailNotification } = req.body;
    const amountCents = toMinorUnits(amountETB || 0);

    try {
      const result = await withTransaction(async (client) => {
        // 1. Authoritative credit wallet
        const wRes = await client.query('SELECT balance_cents FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
        if (wRes.rows.length === 0) throw new Error('WALLET_NOT_FOUND');
        const oldBal = BigInt(wRes.rows[0].balance_cents);
        const newBal = oldBal + amountCents;

        await client.query('UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE user_id = $2', [
          newBal.toString(),
          userId
        ]);

        const txId = `tx_dep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO wallet_ledger (id, user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents, description, status, payment_method, payment_reference, created_at, updated_at)
           VALUES ($1, $2, 'DEPOSIT', 'CREDIT', $3, $4, $5, 'Wallet Deposit via Telebirr', 'COMPLETED', 'TELEBIRR', $6, NOW(), NOW())`,
          [txId, userId, amountCents.toString(), oldBal.toString(), newBal.toString(), paymentReference || txId]
        );

        // 2. Transactional notification creation
        const notifRes = await NotificationReliabilityService.createNotificationInTransaction(client, {
          userId,
          type: 'DEPOSIT_SUCCESS',
          title: 'Deposit Successful',
          body: `Your deposit of ${amountETB} ETB has been credited to your account.`,
          entityType: 'WALLET',
          entityId: txId,
          criticality: 'IMPORTANT',
          channel: 'IN_APP',
          metadata: { amountETB, txId }
        });

        return {
          success: true,
          txId,
          balanceETB: Number(newBal) / 100,
          notificationId: notifRes.notification.id
        };
      }, pool);

      // 3. Asynchronous delivery attempt (simulating decoupled worker)
      if (!shouldFailNotification) {
        await NotificationReliabilityService.executeDelivery(result.notificationId, pool);
      }

      res.json({ instance: instanceName, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}
