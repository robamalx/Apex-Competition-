-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 010: BOT & AUTOMATED PREDICTION ABUSE PROTECTION (RISK 17)
-- Distributed Multi-Instance Rate Limits, Prediction State Machine & Idempotency Registry,
-- Draft Persistence, Bot Abuse Incident Storage, and Anti-Automation Telemetry.
-- ============================================================================

-- 1. Distributed Rate Limiting Table (Multi-Instance Shared Storage)
CREATE TABLE IF NOT EXISTS distributed_rate_limits (
    rate_key VARCHAR(255) PRIMARY KEY,
    key_type VARCHAR(64) NOT NULL, -- IP, ACCOUNT, SESSION, ENDPOINT, COMPETITION, PREDICTION
    window_start TIMESTAMPTZ NOT NULL,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    request_count INTEGER NOT NULL DEFAULT 1,
    max_allowed INTEGER NOT NULL,
    blocked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_type ON distributed_rate_limits(key_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON distributed_rate_limits(window_start);

-- 2. Prediction Drafts (Survives Reloads & Multi-Device Sessions)
CREATE TABLE IF NOT EXISTS prediction_drafts (
    draft_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    entry_id VARCHAR(64) REFERENCES competition_entries(id) ON DELETE SET NULL,
    selections JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- DRAFT, DISCARDED, SUBMITTED, EXPIRED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_comp_draft UNIQUE(user_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_pred_drafts_user ON prediction_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_drafts_comp ON prediction_drafts(competition_id);

-- 3. Prediction Submission & Idempotency Registry (Immutable State Machine)
CREATE TABLE IF NOT EXISTS prediction_submission_registry (
    submission_id VARCHAR(128) PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    entry_id VARCHAR(64) NOT NULL REFERENCES competition_entries(id) ON DELETE RESTRICT,
    state VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTING, SUBMITTED, LOCKED, CANCELLED, FAILED, PENDING_RECONCILIATION
    submission_version INTEGER NOT NULL DEFAULT 1,
    predictions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    submission_hash VARCHAR(64) NOT NULL,
    client_ip VARCHAR(64),
    user_agent TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    request_payload_hash VARCHAR(64),
    CONSTRAINT uq_entry_submission_version UNIQUE(entry_id, submission_version)
);

CREATE INDEX IF NOT EXISTS idx_pred_sub_reg_user ON prediction_submission_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_sub_reg_entry ON prediction_submission_registry(entry_id);
CREATE INDEX IF NOT EXISTS idx_pred_sub_reg_idemp ON prediction_submission_registry(idempotency_key);

-- 4. Bot Abuse Incidents & Evidence Log
CREATE TABLE IF NOT EXISTS bot_abuse_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(64),
    session_id VARCHAR(128),
    severity VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, MONITORED, RESTRICTED, CLEARED, CONFIRMED, ESCALATED
    risk_score INTEGER NOT NULL DEFAULT 0, -- 0-100
    threat_category VARCHAR(64) NOT NULL,
    signals_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_hash VARCHAR(64) NOT NULL,
    action_taken VARCHAR(64) NOT NULL DEFAULT 'MONITOR', -- MONITOR, SOFT_THROTTLE, CHALLENGE, RESTRICT_ENDPOINT, RESTRICT_ACCOUNT, NONE
    reviewed_by VARCHAR(64),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_incidents_user ON bot_abuse_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_incidents_severity ON bot_abuse_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_bot_incidents_status ON bot_abuse_incidents(status);

-- 5. Anti-Automation Telemetry & Audit Stream
CREATE TABLE IF NOT EXISTS bot_telemetry_events (
    event_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    ip_address VARCHAR(64),
    endpoint VARCHAR(128) NOT NULL,
    method VARCHAR(16) NOT NULL,
    status_code INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    is_bot_suspect BOOLEAN NOT NULL DEFAULT FALSE,
    risk_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_telemetry_time ON bot_telemetry_events(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_telemetry_user ON bot_telemetry_events(user_id);
