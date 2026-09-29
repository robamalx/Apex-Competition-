-- Migration 006: Authoritative Payment Deposit Verification & Chargeback Risk Schema

CREATE TABLE IF NOT EXISTS deposits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider VARCHAR(32) NOT NULL,
    provider_transaction_id VARCHAR(128),
    provider_reference VARCHAR(128),
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    signature_hash VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE,
    correlation_id VARCHAR(128),
    metadata JSONB,
    failure_reason TEXT,
    credited_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_provider_tx_id ON deposits(provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_provider_ref ON deposits(provider_reference);

CREATE TABLE IF NOT EXISTS deposit_callbacks (
    id VARCHAR(64) PRIMARY KEY,
    deposit_id VARCHAR(64) REFERENCES deposits(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_transaction_id VARCHAR(128),
    event_type VARCHAR(64) NOT NULL,
    event_version BIGINT NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    signature VARCHAR(256),
    is_valid_signature BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_callbacks_deposit_id ON deposit_callbacks(deposit_id);

CREATE TABLE IF NOT EXISTS deposit_reversals (
    id VARCHAR(64) PRIMARY KEY,
    deposit_id VARCHAR(64) NOT NULL REFERENCES deposits(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'CHARGEBACK',
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
    recovered_cents BIGINT NOT NULL DEFAULT 0,
    exposure_cents BIGINT NOT NULL DEFAULT 0,
    ledger_transaction_id VARCHAR(64) REFERENCES wallet_ledger(id),
    incident_id VARCHAR(64),
    reason TEXT NOT NULL,
    authorized_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_reversals_user_id ON deposit_reversals(user_id);

CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id VARCHAR(64) PRIMARY KEY,
    deposit_id VARCHAR(64) REFERENCES deposits(id),
    provider VARCHAR(32) NOT NULL,
    provider_transaction_id VARCHAR(128),
    discrepancy_type VARCHAR(64) NOT NULL,
    apex_status VARCHAR(32),
    provider_status VARCHAR(32),
    apex_amount_cents BIGINT,
    provider_amount_cents BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED',
    notes TEXT,
    resolved_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_financial_exposures (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    exposure_cents BIGINT NOT NULL DEFAULT 0,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    restriction_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


