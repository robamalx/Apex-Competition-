-- =========================================================================
-- APEX ARENA — RISK 19: REALTIME DATA & CACHE CONSISTENCY SCHEMA
-- Migration: 012_realtime_data_and_cache_consistency.sql
-- =========================================================================

-- 1. Authoritative Realtime Event Outbox & Event Log
CREATE TABLE IF NOT EXISTS realtime_events (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    entity_version BIGINT NOT NULL DEFAULT 1,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_scope VARCHAR(32) NOT NULL DEFAULT 'PUBLIC', -- 'PUBLIC', 'USER', 'STAFF', 'ROLE'
    recipient_id VARCHAR(64),                             -- user_id or staff role
    server_sequence BIGSERIAL NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_entity ON realtime_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_version ON realtime_events(entity_type, entity_id, entity_version);
CREATE INDEX IF NOT EXISTS idx_realtime_events_recipient ON realtime_events(recipient_scope, recipient_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_sequence ON realtime_events(server_sequence);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created ON realtime_events(created_at);

-- 2. Distributed Multi-Instance Cache Invalidation Registry
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id VARCHAR(64) PRIMARY KEY,
    namespace VARCHAR(64) NOT NULL,
    cache_key VARCHAR(256) NOT NULL,
    entity_version BIGINT NOT NULL DEFAULT 1,
    invalidation_reason VARCHAR(128) NOT NULL,
    origin_instance_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_invalidation_ns_key ON cache_invalidation_log(namespace, cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_created ON cache_invalidation_log(created_at);

-- 3. Client Reconnection & State Synchronization Sessions
CREATE TABLE IF NOT EXISTS client_sync_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL,
    last_acknowledged_sequence BIGINT NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connected_instance_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_client_sync UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_sync_user ON client_sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_sync_last ON client_sync_sessions(last_sync_at);

-- 4. Idempotent Event Consumption & Receipt Ledger
CREATE TABLE IF NOT EXISTS idempotent_event_receipts (
    id VARCHAR(64) PRIMARY KEY,
    consumer_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL REFERENCES realtime_events(event_id) ON DELETE CASCADE,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
    CONSTRAINT uq_consumer_event_receipt UNIQUE (consumer_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_receipts_consumer ON idempotent_event_receipts(consumer_id);
CREATE INDEX IF NOT EXISTS idx_event_receipts_event ON idempotent_event_receipts(event_id);

-- 5. Distributed Cache Stampede & Single-Flight Request Locks
CREATE TABLE IF NOT EXISTS cache_stampede_locks (
    cache_key VARCHAR(256) PRIMARY KEY,
    locked_by_instance VARCHAR(64) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stampede_expires ON cache_stampede_locks(expires_at);
