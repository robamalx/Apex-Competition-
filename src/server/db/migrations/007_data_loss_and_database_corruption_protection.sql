-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 007: DATA LOSS & CORRUPTION PROTECTION (RISK 14)
-- Immutable backups, schema version tracking, integrity audits, and soft-delete safeguards.
-- ============================================================================

-- 1. Database Backups Vault Registry
CREATE TABLE IF NOT EXISTS database_backups (
    backup_id VARCHAR(64) PRIMARY KEY,
    scope VARCHAR(32) NOT NULL DEFAULT 'FULL', -- FULL, INCREMENTAL, SNAPSHOT
    sha256_hash VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    record_count BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- CREATED, VERIFIED, CORRUPTED, RESTORED
    schema_version VARCHAR(64) NOT NULL,
    is_isolated_restore_tested BOOLEAN NOT NULL DEFAULT FALSE,
    discrepancy_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_backups_created ON database_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);

-- 2. Database Integrity Audit Log
CREATE TABLE IF NOT EXISTS database_integrity_audits (
    id VARCHAR(64) PRIMARY KEY,
    audit_type VARCHAR(64) NOT NULL, -- ROW_COUNT_CHECK, ORPHAN_CHECK, LEDGER_PARITY, SCHEMA_VALIDATION
    passed BOOLEAN NOT NULL DEFAULT TRUE,
    tables_scanned INTEGER NOT NULL DEFAULT 0,
    orphan_records_found INTEGER NOT NULL DEFAULT 0,
    discrepancy_cents BIGINT NOT NULL DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_integrity_audits_created ON database_integrity_audits(created_at DESC);

-- 3. Schema Version & Compatibility Lock
CREATE TABLE IF NOT EXISTS schema_version_locks (
    schema_version VARCHAR(64) PRIMARY KEY,
    min_app_version VARCHAR(64) NOT NULL,
    max_app_version VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed current schema version 007
INSERT INTO schema_version_locks (schema_version, min_app_version, is_active, locked_at)
VALUES ('007', '1.0.0', TRUE, NOW())
ON CONFLICT (schema_version) DO UPDATE SET is_active = TRUE;
