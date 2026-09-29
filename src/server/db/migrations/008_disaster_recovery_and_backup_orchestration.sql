-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 008: DISASTER RECOVERY & BACKUP ORCHESTRATION (RISK 15)
-- Multi-generation backup registry, disaster recovery state machine, RPO/RTO metrics, 
-- two-person approval tracking, and secret recovery auditing.
-- ============================================================================

-- 1. Disaster Recovery Incident Lifecycle Tracking
CREATE TABLE IF NOT EXISTS disaster_recovery_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    trigger_type VARCHAR(64) NOT NULL DEFAULT 'DB_FAILURE', -- DB_FAILURE, APP_FAILURE, TOTAL_DISASTER, DRILL
    current_state VARCHAR(64) NOT NULL DEFAULT 'DISASTER_DETECTED', 
    -- DISASTER_DETECTED, CONTAINED, BACKUP_SELECTED, RESTORE_STARTED, RESTORE_COMPLETED,
    -- SCHEMA_VERIFIED, FINANCIALS_VERIFIED, DATA_INTEGRITY_VERIFIED, APPLICATION_VERIFIED,
    -- SECURITY_VERIFIED, RECONCILIATION, RECOVERY_APPROVED, TRAFFIC_RELEASED, ABORTED_FINANCIAL_HOLD
    selected_backup_id VARCHAR(64),
    target_environment VARCHAR(64) NOT NULL DEFAULT 'ISOLATED_SANDBOX',
    rpo_measured_seconds NUMERIC(10, 3),
    rto_measured_seconds NUMERIC(10, 3),
    discrepancy_cents BIGINT NOT NULL DEFAULT 0,
    operator_1_id VARCHAR(64),
    operator_2_id VARCHAR(64),
    approval_timestamp TIMESTAMPTZ,
    heightened_monitoring_active BOOLEAN NOT NULL DEFAULT FALSE,
    stage_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_incidents_created ON disaster_recovery_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_incidents_state ON disaster_recovery_incidents(current_state);

-- 2. Backup Retention & Multi-Generation Governance Registry
CREATE TABLE IF NOT EXISTS backup_retention_policies (
    id VARCHAR(64) PRIMARY KEY,
    backup_id VARCHAR(64) NOT NULL REFERENCES database_backups(backup_id) ON DELETE RESTRICT,
    generation_num INTEGER NOT NULL DEFAULT 1,
    retention_days INTEGER NOT NULL DEFAULT 30,
    is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
    storage_vault_location TEXT NOT NULL,
    encryption_algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM',
    key_id VARCHAR(64) NOT NULL DEFAULT 'kms_dr_master_key_v1',
    access_role_required VARCHAR(32) NOT NULL DEFAULT 'INFRA_SUPER_ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_retention_gen ON backup_retention_policies(generation_num);

-- 3. Secret Recovery Audit Log
CREATE TABLE IF NOT EXISTS secret_recovery_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64),
    secret_key_name VARCHAR(128) NOT NULL,
    recovery_source VARCHAR(64) NOT NULL DEFAULT 'SECRET_MANAGER_KMS',
    verified_checksum VARCHAR(64) NOT NULL,
    requested_by VARCHAR(64) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Schema Version & Compatibility Lock Update
INSERT INTO schema_version_locks (schema_version, min_app_version, is_active, locked_at)
VALUES ('008', '1.0.0', TRUE, NOW())
ON CONFLICT (schema_version) DO UPDATE SET is_active = TRUE;
