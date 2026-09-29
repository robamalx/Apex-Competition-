-- ============================================================================
-- APEX ARENA — POSTGRESQL CORE MIGRATION 011: COMPETITION FAIRNESS & COLLUSION PROTECTION (RISK 18)
-- Account Clustering, Coordinated Prediction Detection, Anti-Collusion Signals,
-- Two-Person Investigation Review Workflow, and Prediction Privacy Auditing.
-- ============================================================================

-- 1. Fairness & Anti-Collusion Account Clusters
CREATE TABLE IF NOT EXISTS fairness_clusters (
    cluster_id VARCHAR(64) PRIMARY KEY,
    primary_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    confidence_score INTEGER NOT NULL DEFAULT 0, -- 0-100
    status VARCHAR(32) NOT NULL DEFAULT 'MONITORED', -- MONITORED, UNDER_REVIEW, RESTRICTED, CONFIRMED_ABUSE, CLEARED, DISMISSED
    risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    correlation_type VARCHAR(64) NOT NULL DEFAULT 'NORMAL_CORRELATION', -- NORMAL_CORRELATION, SUSPICIOUS_CORRELATION, CONFIRMED_ABUSE
    evidence_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fairness_clusters_primary ON fairness_clusters(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_fairness_clusters_status ON fairness_clusters(status);
CREATE INDEX IF NOT EXISTS idx_fairness_clusters_risk ON fairness_clusters(risk_level);

-- 2. Fairness Cluster Members
CREATE TABLE IF NOT EXISTS fairness_cluster_members (
    id VARCHAR(64) PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL REFERENCES fairness_clusters(cluster_id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(64) NOT NULL, -- DEVICE_FINGERPRINT, IP_SUBNET, REFERRAL_RING, PREDICTION_SIMILARITY, TEMPORAL_BURST, PAYMENT_METHOD
    shared_value TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cluster_user_conn UNIQUE(cluster_id, user_id, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster ON fairness_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_user ON fairness_cluster_members(user_id);

-- 3. Fairness Cluster Signals (Coordinated Prediction & Multi-Account Evidence)
CREATE TABLE IF NOT EXISTS fairness_cluster_signals (
    signal_id VARCHAR(64) PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL REFERENCES fairness_clusters(cluster_id) ON DELETE CASCADE,
    competition_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
    signal_type VARCHAR(64) NOT NULL, -- IDENTICAL_PICKS, NEAR_IDENTICAL_PICKS, TEMPORAL_SYNCHRONIZATION, CIRCULAR_REFERRAL, MULTI_ACCOUNT_DEVICE, MULTI_ACCOUNT_IP, HIGH_SIMILARITY_CLUSTER
    severity VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    similarity_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    signal_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_hash VARCHAR(64) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fairness_signals_cluster ON fairness_cluster_signals(cluster_id);
CREATE INDEX IF NOT EXISTS idx_fairness_signals_comp ON fairness_cluster_signals(competition_id);
CREATE INDEX IF NOT EXISTS idx_fairness_signals_type ON fairness_cluster_signals(signal_type);

-- 4. Fairness Incidents & Two-Person Review Workflow
CREATE TABLE IF NOT EXISTS fairness_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    cluster_id VARCHAR(64) REFERENCES fairness_clusters(cluster_id) ON DELETE SET NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, MONITORED, RESTRICTED, CLEARED, CONFIRMED, ESCALATED
    threat_category VARCHAR(64) NOT NULL DEFAULT 'COLLUSION_SUSPECT',
    signals_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_hash VARCHAR(64) NOT NULL,
    two_person_required BOOLEAN NOT NULL DEFAULT FALSE,
    first_approver_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    first_approved_at TIMESTAMPTZ,
    second_approver_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    second_approved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    financial_action VARCHAR(64) NOT NULL DEFAULT 'NONE', -- NONE, REFUND_COMPETITION, FINANCIAL_HOLD, MANUAL_RECONCILIATION
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fairness_incidents_comp ON fairness_incidents(competition_id);
CREATE INDEX IF NOT EXISTS idx_fairness_incidents_user ON fairness_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_fairness_incidents_cluster ON fairness_incidents(cluster_id);
CREATE INDEX IF NOT EXISTS idx_fairness_incidents_status ON fairness_incidents(status);

-- 5. Fairness Audit Trail (Immutable & Append-Only)
CREATE TABLE IF NOT EXISTS fairness_audit_trail (
    audit_id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES fairness_incidents(incident_id) ON DELETE SET NULL,
    cluster_id VARCHAR(64) REFERENCES fairness_clusters(cluster_id) ON DELETE SET NULL,
    actor_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    before_state VARCHAR(64),
    after_state VARCHAR(64),
    reason TEXT NOT NULL,
    evidence_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fairness_audit_incident ON fairness_audit_trail(incident_id);
CREATE INDEX IF NOT EXISTS idx_fairness_audit_actor ON fairness_audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_fairness_audit_time ON fairness_audit_trail(created_at);

-- 6. Prediction Privacy Access Audit
CREATE TABLE IF NOT EXISTS prediction_privacy_access_audit (
    access_id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64) NOT NULL,
    competition_id VARCHAR(64) NOT NULL,
    competition_state VARCHAR(32) NOT NULL,
    is_authorized BOOLEAN NOT NULL,
    access_reason VARCHAR(128) NOT NULL,
    endpoint VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_privacy_actor ON prediction_privacy_access_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_pred_privacy_target ON prediction_privacy_access_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_pred_privacy_comp ON prediction_privacy_access_audit(competition_id);
CREATE INDEX IF NOT EXISTS idx_pred_privacy_time ON prediction_privacy_access_audit(created_at);
