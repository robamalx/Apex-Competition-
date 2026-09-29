-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 001: INITIAL SCHEMA
-- All financial fields use integer minor units (BIGINT cents: 100 = 1.00 ETB)
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'PLAYER',
    avatar TEXT,
    account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    account_lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'PHONE_PENDING',
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    referral_code VARCHAR(32) UNIQUE NOT NULL,
    referred_by VARCHAR(64),
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(16) NOT NULL DEFAULT 'LOW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Wallets Table (One wallet per user, strict non-negative minor unit balance)
CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
    balance_cents BIGINT NOT NULL DEFAULT 0,
    held_cents BIGINT NOT NULL DEFAULT 0,
    referral_points INTEGER NOT NULL DEFAULT 0,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Wallet Transaction Journal (Immutable Ledger)
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(32) NOT NULL,
    direction VARCHAR(8) NOT NULL,
    amount_cents BIGINT NOT NULL,
    balance_before_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(32),
    payment_reference VARCHAR(128),
    idempotency_key VARCHAR(128),
    reference_id VARCHAR(128),
    description TEXT NOT NULL,
    notes TEXT,
    processed_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Competitions Table
CREATE TABLE IF NOT EXISTS competitions (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    season VARCHAR(32) NOT NULL,
    matchweek INTEGER NOT NULL,
    league VARCHAR(128) NOT NULL DEFAULT 'Premier League',
    market_type VARCHAR(32) NOT NULL DEFAULT 'CORRECT_SCORE',
    tier VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    entry_fee_cents BIGINT NOT NULL DEFAULT 0,
    guaranteed_prize_pool_cents BIGINT NOT NULL DEFAULT 0,
    current_prize_pool_cents BIGINT NOT NULL DEFAULT 0,
    min_participants INTEGER NOT NULL DEFAULT 1,
    max_participants INTEGER NOT NULL DEFAULT 100000,
    current_participants INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    entry_deadline TIMESTAMPTZ NOT NULL,
    settlement_id VARCHAR(64),
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Competition Entries
CREATE TABLE IF NOT EXISTS competition_entries (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entry_fee_paid_cents BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    submission_status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    total_points INTEGER NOT NULL DEFAULT 0,
    final_rank INTEGER,
    prize_awarded_cents BIGINT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Predictions
CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(64) PRIMARY KEY,
    entry_id VARCHAR(64) NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fixture_id VARCHAR(64) NOT NULL,
    predicted_home_score INTEGER NOT NULL,
    predicted_away_score INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    is_exact_match BOOLEAN NOT NULL DEFAULT FALSE,
    is_correct_outcome BOOLEAN NOT NULL DEFAULT FALSE,
    is_postponed_void BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Fixtures & Official Results
CREATE TABLE IF NOT EXISTS fixtures (
    id VARCHAR(64) PRIMARY KEY,
    canonical_id VARCHAR(128) NOT NULL,
    external_provider_id VARCHAR(64),
    competition_code VARCHAR(32) NOT NULL,
    season VARCHAR(32) NOT NULL,
    matchweek INTEGER NOT NULL,
    home_team VARCHAR(128) NOT NULL,
    away_team VARCHAR(128) NOT NULL,
    kickoff_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    home_score INTEGER,
    away_score INTEGER,
    result_version INTEGER NOT NULL DEFAULT 1,
    verified_by_provider BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Settlements & Payouts
CREATE TABLE IF NOT EXISTS settlements (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    total_entrants INTEGER NOT NULL,
    total_prize_pool_cents BIGINT NOT NULL,
    total_distributed_cents BIGINT NOT NULL,
    remainder_cents BIGINT NOT NULL DEFAULT 0,
    settled_by VARCHAR(64) NOT NULL REFERENCES users(id),
    snapshot_data JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlement_payouts (
    id VARCHAR(64) PRIMARY KEY,
    settlement_id VARCHAR(64) NOT NULL REFERENCES settlements(id) ON DELETE RESTRICT,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rank INTEGER NOT NULL,
    points INTEGER NOT NULL,
    payout_cents BIGINT NOT NULL,
    ledger_transaction_id VARCHAR(64) NOT NULL REFERENCES wallet_ledger(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
