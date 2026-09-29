-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 004: ACCOUNT SECURITY & SESSIONS (RISK 11)
-- Enhanced session lifecycle, password reset, Telegram identity, and security audit
-- ============================================================================

-- 1. Enhanced User Sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'; -- ACTIVE, REVOKED, EXPIRED, SUSPENDED
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS auth_method VARCHAR(32) NOT NULL DEFAULT 'PASSWORD'; -- PASSWORD, TELEGRAM, RECOVERY, REFRESH
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(128);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_status ON user_sessions(user_id, status);

-- 2. Password Reset Challenges
CREATE TABLE IF NOT EXISTS password_reset_challenges (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    channel VARCHAR(32) NOT NULL DEFAULT 'EMAIL', -- EMAIL, TELEGRAM, PHONE_OTP
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, USED, EXPIRED, CANCELLED
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pw_reset_user ON password_reset_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pw_reset_token_hash ON password_reset_challenges(token_hash);

-- 3. Telegram Unique Identity Bindings
CREATE TABLE IF NOT EXISTS telegram_bindings (
    telegram_user_id BIGINT PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_username VARCHAR(128),
    first_name VARCHAR(128),
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_bindings_user ON telegram_bindings(user_id);

-- 4. Account Security Profiles & Signals
CREATE TABLE IF NOT EXISTS account_security_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    security_state VARCHAR(32) NOT NULL DEFAULT 'NORMAL', -- NORMAL, SUSPICIOUS, SECURITY_REVIEW, RESTRICTED, CONFIRMED_COMPROMISED
    compromise_reason TEXT,
    last_password_change_at TIMESTAMPTZ,
    last_security_mutation_at TIMESTAMPTZ,
    withdrawal_cooldown_until TIMESTAMPTZ,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Comprehensive Security Audit Events (Immutable)
CREATE TABLE IF NOT EXISTS security_audit_events (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64),
    actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    target_user_id VARCHAR(64),
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, HIGH, CRITICAL
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, BLOCKED
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    correlation_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_audit_event_type ON security_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_audit_target ON security_audit_events(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_created ON security_audit_events(created_at DESC);
