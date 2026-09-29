-- =========================================================================
-- APEX ARENA — RISK 20: NOTIFICATION RELIABILITY & OUTBOX SCHEMA
-- Migration: 013_notification_reliability_and_outbox.sql
-- =========================================================================

-- 1. Durable PostgreSQL Notification Records Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(64) NOT NULL,
    criticality VARCHAR(32) NOT NULL DEFAULT 'NORMAL', -- 'CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL'
    channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP',     -- 'IN_APP', 'PUSH', 'SMS', 'EMAIL', 'TELEGRAM'
    title VARCHAR(256) NOT NULL,
    body TEXT NOT NULL,
    entity_type VARCHAR(64),                           -- 'WALLET', 'COMPETITION', 'WITHDRAWAL', 'DEPOSIT', 'USER'
    entity_id VARCHAR(128),
    entity_version BIGINT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',     -- 'PENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER'
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    max_delivery_attempts INTEGER NOT NULL DEFAULT 5,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    provider VARCHAR(64) NOT NULL DEFAULT 'IN_APP',
    provider_message_id VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE,
    correlation_id VARCHAR(128),
    recipient_role VARCHAR(64),                        -- For staff notification isolation
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status_retry ON notifications(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_criticality ON notifications(criticality);

-- 2. Notification Preferences Table (Mandatory vs Optional)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_pref_cat UNIQUE (user_id, category, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);

-- 3. Device Tokens Table (Push Notification Security & Registration)
CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(256) NOT NULL,
    platform VARCHAR(32) NOT NULL DEFAULT 'WEB',       -- 'WEB', 'ANDROID', 'IOS'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_device_token UNIQUE (user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(device_token);

-- 4. Dead-Letter & Quarantine Vault for Undeliverable Critical Notifications
CREATE TABLE IF NOT EXISTS notification_dead_letter_vault (
    id VARCHAR(64) PRIMARY KEY,
    notification_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    criticality VARCHAR(32) NOT NULL,
    final_error_reason TEXT NOT NULL,
    attempt_count INTEGER NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_notif_dead_letter_user ON notification_dead_letter_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_dead_letter_quarantine ON notification_dead_letter_vault(quarantined_at);
