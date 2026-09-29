-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 002: INDEXES & CONSTRAINTS
-- Strict database-level mathematical and relational guarantees
-- ============================================================================

-- 1. Wallet Balances & Positive Invariant Constraints
ALTER TABLE wallets
    ADD CONSTRAINT chk_wallet_balance_positive CHECK (balance_cents >= 0),
    ADD CONSTRAINT chk_wallet_held_positive CHECK (held_cents >= 0),
    ADD CONSTRAINT chk_wallet_available_positive CHECK (balance_cents >= held_cents);

-- 2. Ledger Direction and Integrity Constraints
ALTER TABLE wallet_ledger
    ADD CONSTRAINT chk_amount_positive CHECK (amount_cents > 0),
    ADD CONSTRAINT chk_valid_direction CHECK (direction IN ('CREDIT', 'DEBIT')),
    ADD CONSTRAINT uq_ledger_idempotency UNIQUE (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_payment_ref ON wallet_ledger(payment_reference);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON wallet_ledger(status);

-- 3. Competition & Entry Constraints
ALTER TABLE competitions
    ADD CONSTRAINT chk_comp_participants_bounds CHECK (current_participants >= 0 AND current_participants <= max_participants),
    ADD CONSTRAINT chk_comp_entry_fee_positive CHECK (entry_fee_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_competitions_status_deadline ON competitions(status, entry_deadline);

ALTER TABLE competition_entries
    ADD CONSTRAINT uq_user_competition_entry UNIQUE (user_id, competition_id),
    ADD CONSTRAINT uq_entry_idempotency UNIQUE (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_entries_comp_points ON competition_entries(competition_id, total_points DESC);

ALTER TABLE predictions
    ADD CONSTRAINT uq_entry_fixture_pred UNIQUE (entry_id, fixture_id),
    ADD CONSTRAINT chk_valid_scores CHECK (
        predicted_home_score >= 0 AND predicted_home_score <= 9 AND 
        predicted_away_score >= 0 AND predicted_away_score <= 9
    );

-- 4. Settlement & Payout Invariant Constraints
ALTER TABLE settlements
    ADD CONSTRAINT uq_competition_settlement UNIQUE (competition_id),
    ADD CONSTRAINT chk_distribution_sum CHECK (total_distributed_cents <= total_prize_pool_cents);

ALTER TABLE settlement_payouts
    ADD CONSTRAINT uq_settlement_user_payout UNIQUE (settlement_id, user_id),
    ADD CONSTRAINT uq_payout_ledger_tx UNIQUE (ledger_transaction_id),
    ADD CONSTRAINT chk_payout_positive CHECK (payout_cents > 0);

-- 5. Fixture Constraints
ALTER TABLE fixtures
    ADD CONSTRAINT uq_fixture_canonical_id UNIQUE (canonical_id);

CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
