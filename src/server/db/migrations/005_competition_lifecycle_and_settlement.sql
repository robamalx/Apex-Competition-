-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 005: COMPETITION LIFECYCLE & SETTLEMENT (RISK 12)
-- Strict server-side state machine, historical snapshots, multi-market validation,
-- pooled tie settlements, and immutable settlement audits.
-- ============================================================================

-- 1. Historical Rules Snapshot Registry (Immutable at Competition Immutability)
CREATE TABLE IF NOT EXISTS competition_rule_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    competition_name VARCHAR(255) NOT NULL,
    league VARCHAR(128) NOT NULL,
    season VARCHAR(32) NOT NULL,
    matchweek INTEGER NOT NULL,
    fixture_ids JSONB NOT NULL,
    fixture_home_away_identity JSONB NOT NULL,
    fixture_kickoff_times JSONB NOT NULL,
    allowed_markets JSONB NOT NULL,
    scoring_rules JSONB NOT NULL,
    entry_fee_cents BIGINT NOT NULL,
    max_participants INTEGER NOT NULL,
    prize_pool_rule VARCHAR(64) NOT NULL,
    house_share_bps INTEGER NOT NULL DEFAULT 2500,
    player_pool_bps INTEGER NOT NULL DEFAULT 7500,
    rank_payout_percentages JSONB NOT NULL,
    tie_break_hierarchy JSONB NOT NULL,
    refund_rules JSONB NOT NULL,
    rules_version VARCHAR(32) NOT NULL DEFAULT 'v2.0-canonical',
    snapshot_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_snapshots_comp ON competition_rule_snapshots(competition_id);
CREATE INDEX IF NOT EXISTS idx_rule_snapshots_hash ON competition_rule_snapshots(snapshot_hash);

-- 2. Enhance Competitions with Snapshot & Lifecycle Metadata
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS fixture_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rules_snapshot_id VARCHAR(64) REFERENCES competition_rule_snapshots(id);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rules_snapshot_hash VARCHAR(64);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS state_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_competitions_rules_snapshot ON competitions(rules_snapshot_id);

-- 3. Enhance Competition Entries with Advanced Tie-Break Breakdown
ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS correct_score_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS correct_markets_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS exact_scores_count INTEGER NOT NULL DEFAULT 0;

-- 4. Multi-Market Prediction Columns and Constraint Reconfiguration
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS market_type VARCHAR(32) NOT NULL DEFAULT 'CORRECT_SCORE';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS option_choice VARCHAR(32);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS uq_entry_fixture_pred;
ALTER TABLE predictions ADD CONSTRAINT uq_entry_fixture_market_pred UNIQUE (entry_id, fixture_id, market_type);


-- 5. Immutable Settlement Audit Trails
CREATE TABLE IF NOT EXISTS competition_settlement_audits (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    settlement_id VARCHAR(64) NOT NULL,
    rules_snapshot_hash VARCHAR(64) NOT NULL,
    result_version INTEGER NOT NULL DEFAULT 1,
    participant_count INTEGER NOT NULL,
    total_collected_cents BIGINT NOT NULL,
    player_pool_cents BIGINT NOT NULL,
    house_share_cents BIGINT NOT NULL,
    payout_total_cents BIGINT NOT NULL,
    discrepancy_cents BIGINT NOT NULL DEFAULT 0,
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'SETTLED',
    idempotency_key VARCHAR(128) NOT NULL,
    settled_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_audits_comp ON competition_settlement_audits(competition_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audits_idem ON competition_settlement_audits(idempotency_key);

-- 6. Official Result Corrections Workflow
CREATE TABLE IF NOT EXISTS result_corrections (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    fixture_id VARCHAR(64) NOT NULL,
    original_home_score INTEGER,
    original_away_score INTEGER,
    corrected_home_score INTEGER NOT NULL,
    corrected_away_score INTEGER NOT NULL,
    result_version INTEGER NOT NULL DEFAULT 2,
    financial_delta_cents BIGINT NOT NULL DEFAULT 0,
    impacted_players_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, APPROVED, APPLIED, REJECTED
    authorized_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_result_corrections_comp ON result_corrections(competition_id);
CREATE INDEX IF NOT EXISTS idx_result_corrections_status ON result_corrections(status);
