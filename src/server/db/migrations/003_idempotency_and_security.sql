-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 003: IDEMPOTENCY, SESSIONS & SECURITY
-- Cluster-wide distributed coordination state
-- ============================================================================

-- 1. Distributed Idempotency Registry
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(128) PRIMARY KEY,
    route VARCHAR(255) NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id),
    request_hash VARCHAR(64) NOT NULL,
    response_code INTEGER,
    response_body JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_FLIGHT', -- 'IN_FLIGHT', 'COMPLETED', 'FAILED'
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_idempotency_locked_at ON idempotency_keys(locked_at);

-- 2. Distributed User Sessions (Eliminating Process-Local In-Memory Session Map)
CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON user_sessions(user_id, expires_at);

-- 3. Referrals & Rewards
CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(64) PRIMARY KEY,
    referrer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    referred_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    referral_code VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'QUALIFIED', 'REWARDED'
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qualified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- 4. Audit Logs & Forensic History
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) REFERENCES users(id),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 5. Financial Incidents & System Holds
CREATE TABLE IF NOT EXISTS financial_incidents (
    id VARCHAR(64) PRIMARY KEY,
    severity VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    affected_resource VARCHAR(128),
    discrepancy_cents BIGINT NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Phone Verification Challenges & Rate Limits
CREATE TABLE IF NOT EXISTS phone_verification_challenges (
    phone VARCHAR(32) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    channel VARCHAR(16) NOT NULL, -- 'TELEGRAM', 'SMS'
    code_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'EXPIRED'
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (phone, channel)
);

CREATE TABLE IF NOT EXISTS phone_verification_limits (
    phone VARCHAR(32) PRIMARY KEY,
    hourly_requests INTEGER NOT NULL DEFAULT 0,
    daily_requests INTEGER NOT NULL DEFAULT 0,
    blocked_until TIMESTAMPTZ,
    last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
