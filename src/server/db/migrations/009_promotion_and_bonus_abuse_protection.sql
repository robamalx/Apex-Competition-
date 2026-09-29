-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 009: PROMOTION & BONUS ABUSE PROTECTION (RISK 16)
-- Canonical Promotion Models, Reward Events, Promotional Ledger, Fraud Review,
-- and Strict Financial Isolation Safeguards.
-- ============================================================================

-- 1. Campaign & Promotion Configurations
CREATE TABLE IF NOT EXISTS promotions (
    promotion_id VARCHAR(64) PRIMARY KEY,
    promotion_type VARCHAR(64) NOT NULL DEFAULT 'REFERRAL_REWARD', 
    -- REFERRAL_REWARD, PROMOTIONAL_BONUS, COMPETITION_PROMOTION, DEPOSIT_PROMOTION, FIRST_ACTION_PROMOTION
    name VARCHAR(255) NOT NULL,
    description TEXT,
    eligibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    reward_type VARCHAR(64) NOT NULL DEFAULT 'VIRTUAL_POINTS',
    reward_amount BIGINT NOT NULL DEFAULT 10,
    reward_unit VARCHAR(32) NOT NULL DEFAULT 'POINTS',
    max_total_rewards INTEGER NOT NULL DEFAULT 1000000,
    max_rewards_per_player INTEGER NOT NULL DEFAULT 1,
    max_rewards_per_referral INTEGER NOT NULL DEFAULT 1,
    qualifying_deposit_cents BIGINT NOT NULL DEFAULT 0,
    qualifying_entry_fee_cents BIGINT NOT NULL DEFAULT 10000, -- 100 ETB
    status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
    -- DRAFT, VALIDATING, PENDING_ADMIN_APPROVAL, ADMIN_APPROVED, SCHEDULED, ACTIVE, PAUSED, EXPIRED, DISABLED, ARCHIVED
    campaign_start TIMESTAMPTZ,
    campaign_end TIMESTAMPTZ,
    creator_id VARCHAR(64) NOT NULL,
    approver_id VARCHAR(64),
    approved_at TIMESTAMPTZ,
    approval_snapshot_hash VARCHAR(64),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(promotion_type);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);

-- 2. Exact-Once Reward Event Registry
CREATE TABLE IF NOT EXISTS promotion_reward_events (
    reward_event_id VARCHAR(64) PRIMARY KEY,
    promotion_id VARCHAR(64) NOT NULL REFERENCES promotions(promotion_id) ON DELETE RESTRICT,
    promotion_version INTEGER NOT NULL DEFAULT 1,
    player_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    source_event_type VARCHAR(64) NOT NULL,
    source_event_id VARCHAR(128) NOT NULL,
    eligibility_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    reward_amount BIGINT NOT NULL DEFAULT 10,
    reward_unit VARCHAR(32) NOT NULL DEFAULT 'POINTS',
    status VARCHAR(32) NOT NULL DEFAULT 'GRANTED',
    -- ELIGIBLE, PENDING_REVIEW, APPROVED, GRANTED, REVERSED, REJECTED, EXPIRED
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    correlation_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    source_hash VARCHAR(64),
    audit_metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_promotion_player_source UNIQUE(promotion_id, player_id, source_event_type, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_events_player ON promotion_reward_events(player_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_promo ON promotion_reward_events(promotion_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_status ON promotion_reward_events(status);

-- 3. Immutable Promotional Points Journal Ledger
CREATE TABLE IF NOT EXISTS promotion_points_ledger (
    id VARCHAR(64) PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    promotion_id VARCHAR(64) REFERENCES promotions(promotion_id) ON DELETE RESTRICT,
    reward_event_id VARCHAR(64) REFERENCES promotion_reward_events(reward_event_id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL,
    direction VARCHAR(16) NOT NULL DEFAULT 'CREDIT', -- CREDIT, REVERSAL, ADJUSTMENT
    reason TEXT NOT NULL,
    source_event_id VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    balance_before BIGINT NOT NULL DEFAULT 0,
    balance_after BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversal_of_ledger_id VARCHAR(64) REFERENCES promotion_points_ledger(id)
);

CREATE INDEX IF NOT EXISTS idx_promo_ledger_player ON promotion_points_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_promo_ledger_event ON promotion_points_ledger(reward_event_id);

-- 4. Multi-Account & Promotional Fraud Review
CREATE TABLE IF NOT EXISTS promotion_fraud_reviews (
    review_id VARCHAR(64) PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    promotion_id VARCHAR(64),
    reward_event_id VARCHAR(64),
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, MONITORED, RESTRICTED, CLEARED, CONFIRMED, ESCALATED
    evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_by VARCHAR(64),
    review_notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_reviews_player ON promotion_fraud_reviews(player_id);
CREATE INDEX IF NOT EXISTS idx_promo_reviews_status ON promotion_fraud_reviews(status);

-- 5. Active Schema Lock Update
INSERT INTO schema_version_locks (schema_version, min_app_version, is_active, locked_at)
VALUES ('009', '1.0.0', TRUE, NOW())
ON CONFLICT (schema_version) DO UPDATE SET is_active = TRUE;
