# APEX ARENA — DISASTER RECOVERY & BACKUP RESTORATION RUNBOOK

## 1. OVERVIEW & CLASSIFICATION MATRIX
This runbook defines the authoritative operational procedure for restoring APEX ARENA from major infrastructure outages, database corruption, region loss, or combined application + database disasters.

### Subsystem Recovery Classification
| Subsystem | Target RPO | Target RTO | Recovery Priority | Verification Required |
| :--- | :--- | :--- | :--- | :--- |
| **P0 FINANCIAL** (Wallets, Ledger, Deposits, Withdrawals, Payouts, Idempotency) | **0 seconds** | **< 15 min** | Priority 1 | 0 Minor-Unit Discrepancy & Net Ledger Parity |
| **P0 COMPETITION** (Competitions, Entries, Predictions, Fixtures, Scoring, Settlements) | **< 5 seconds** | **< 15 min** | Priority 2 | Entry Integrity & Prediction Lock Verification |
| **P0 SECURITY** (Users, Sessions, Account Security, Audit Logs, Staff RBAC) | **< 5 seconds** | **< 15 min** | Priority 3 | Session Safety & Audit Log Hardening Check |
| **P1 OPERATIONAL** (Advertisements, Notifications, Referrals, Caches) | **< 1 hour** | **< 1 hour** | Priority 4 | Cache Invalidation & Provider Sync Check |

---

## 2. RECOVERY STATE MACHINE & OPERATIONAL STEPS

Every disaster recovery follows an automated 13-stage state machine:

```
DISASTER_DETECTED -> CONTAINED -> BACKUP_SELECTED -> RESTORE_STARTED -> RESTORE_COMPLETED
  -> SCHEMA_VERIFIED -> FINANCIALS_VERIFIED -> DATA_INTEGRITY_VERIFIED -> APPLICATION_VERIFIED
  -> SECURITY_VERIFIED -> RECONCILIATION -> RECOVERY_APPROVED -> TRAFFIC_RELEASED
```

### Stage 1: Detection
- **Trigger**: Automated observability probe failure, DB pool timeout (`ETIMEDOUT`), instance crash, or financial integrity anomaly.
- **Action**: Alert `INFRA_SUPER_ADMIN` and initialize `incident_id` in `disaster_recovery_incidents`.

### Stage 2: Containment
- **Action**: Immediately restrict external API write operations and player traffic.
- **System State**: Transition system status to `CONTAINED` / `FINANCIAL_HOLD`.

### Stage 3: Backup Selection
- **Action**: Select latest verified immutable database backup artifact from cloud vault (`database_backups` registry).
- **Validation**: Verify SHA-256 payload checksum, AES-256 decryption key, and schema compatibility (`008`).

### Stage 4 & 5: Isolated Sandbox Restore
- **Action**: Provision clean PostgreSQL sandbox container/database. Restore backup artifact.
- **Rule**: NEVER restore directly onto an active primary database before verification.

### Stage 6: Schema Verification
- **Checks**: Validate all 17+ core tables, foreign key constraints, indexes, check constraints, and migration sequence `001` through `008`.

### Stage 7: Financial Verification
- **Checks**: Execute `runAuthoritativeFinancialAudit`. Ensure:
  `SUM(wallets.balance_cents) == SUM(CREDIT) - SUM(DEBIT)` across `wallet_ledger`.
  `Discrepancy = 0 minor units`.

### Stage 8: Data Integrity & Competition Verification
- **Checks**: Verify zero orphan records on entries, predictions, settlements, and deposits. Verify prediction deadlines remain enforced.

### Stage 9: Application Verification
- **Action**: Connect application instances in isolated staging mode. Execute health check probes (`/api/health`), migration check, and auth verification.

### Stage 10: Security & Audit Verification
- **Checks**: Verify hard-delete prohibitions on audit tables, valid user status, and session security token integrity.

### Stage 11: Reconciliation
- **Action**: Compare pre-disaster state snapshots with restored state. Produce automated delta report confirming 0 minor-unit discrepancy.

### Stage 12: Two-Person Recovery Approval
- **Requirement**: Two distinct `SUPER_ADMIN` staff members (`operator_1_id` and `operator_2_id`) must digitally sign the recovery approval.
- **Single-operator release is strictly prohibited**.

### Stage 13: Traffic Release & Heightened Monitoring
- **Action**: Update DNS/ingress routing to restore player traffic.
- **Monitoring**: Maintain 24-hour heightened monitoring mode tracking wallet mutations, ledger audits, and provider integrations.

---

## 3. ROLLBACK & EMERGENCY PROCEDURES
If any verification check fails during Stages 6-11:
1. Immediately halt recovery sequence.
2. Transition incident state to `ABORTED_FINANCIAL_HOLD`.
3. Do NOT release player traffic.
4. Fall back to previous verified backup generation (Generation N-1 or N-2).
5. Escalate to Lead Infrastructure Architect and Chief Security Officer.
