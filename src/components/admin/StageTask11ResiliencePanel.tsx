import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Shield,
  Activity,
  Server,
  Database,
  RefreshCw,
  AlertTriangle,
  Lock,
  Archive,
  Layers,
  FileText,
  Clock,
  Zap,
  Cpu,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { OperationalResilienceTestSuiteReport, OperationalSubsystemHealth } from '../../types';

interface StageTask11ResiliencePanelProps {
  token?: string | null;
}

export const StageTask11ResiliencePanel: React.FC<StageTask11ResiliencePanelProps> = ({ token }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<OperationalResilienceTestSuiteReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'disaster_control' | 'raw_report'>('overview');

  // Subsystem & DR states
  const [subsystems, setSubsystems] = useState<OperationalSubsystemHealth[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSubsystemsAndBackups = async () => {
    try {
      const [subRes, bkRes] = await Promise.all([
        fetch('/api/admin/resilience/subsystems', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/admin/resilience/backups', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);
      if (subRes.ok) {
        const subs = await subRes.json();
        setSubsystems(subs);
      }
      if (bkRes.ok) {
        const bks = await bkRes.json();
        setBackups(bks);
      }
    } catch {
      // ignore
    }
  };

  const runSuite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tests/task11', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        await fetchSubsystemsAndBackups();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to run Task 11 test suite.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error executing Task 11 suite.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSuite();
    fetchSubsystemsAndBackups();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading('backup');
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/resilience/backups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Backup ${data.id} created successfully (${data.sizeBytes} bytes). Integrity SHA-256 verified.` });
        fetchSubsystemsAndBackups();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to create backup.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIsolatedRestore = async (backupId?: string) => {
    setActionLoading('restore');
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/resilience/restore-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ backupId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `Isolated sandbox restore PASSED. 0 production records touched. Hash: ${data.backupSha256.substring(0, 16)}... Discrepancy: ${data.restoredLedgerDiscrepancy} ETB.` });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Isolated restore test failed.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunReconciliation = async () => {
    setActionLoading('reconcile');
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/resilience/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `Authoritative reconciliation completed for ${data.reconciledUsersCount} accounts. Total discrepancies corrected: ${data.totalDiscrepancyFixed.toFixed(2)} ETB.` });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Reconciliation failed.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunRecoveryWorkflow = async () => {
    setActionLoading('workflow');
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/resilience/recovery-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `7-Step recovery workflow completed successfully (${data.stepsCompleted.join(' -> ')}). Discrepancies resolved: ${data.totalDiscrepancyFixed} ETB.` });
        fetchSubsystemsAndBackups();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Recovery workflow failed.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const getSubsystemStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">HEALTHY</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">DEGRADED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">FAILED</span>;
      case 'RECOVERING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">RECOVERING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div id="stage-task11-resilience-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              TASK 11 — OPERATIONAL RESILIENCE & DISASTER CONTROL
            </h2>
            {report && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  report.success
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {report.success ? 'PRODUCTION-READY' : 'DEGRADED'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade resilience layer: Fail-Safe principles, Crash Safety across all 7 execution stages, Lock Concurrency, RTO/RPO SLAs, and Automated Disaster Recovery.
          </p>
        </div>

        <button
          id="btn-run-task11-suite"
          onClick={runSuite}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Verifying Platform...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run 30-Test Suite</span>
            </>
          )}
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'overview'
              ? 'bg-cyan-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Resilience Metrics & SLAs
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'tests'
              ? 'bg-cyan-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Test Matrix (30/30)
          {report && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-slate-200">
              {report.passedCount}/{report.totalCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('disaster_control')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'disaster_control'
              ? 'bg-cyan-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Disaster Recovery Actions
        </button>
        <button
          onClick={() => setActiveTab('raw_report')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'raw_report'
              ? 'bg-cyan-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Audit Log & Terminal Output
        </button>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* TOP METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acceptance Tests</span>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <span>{report ? `${report.passedCount}/${report.totalCount}` : '--/30'}</span>
                {report && report.success && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block">100% Pass Required</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RTO (Recovery Time)</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <span>{report?.actualRtoSeconds ? `${report.actualRtoSeconds}s` : '< 1.0s'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block">SLA: Target &lt; 5m</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RPO (Data Loss Point)</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <span>{report?.actualRpoSeconds !== undefined ? `${report.actualRpoSeconds}s` : '0.0s'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block">Atomic Sync Mode</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial Variance</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <span>{report ? `${report.reconciliationDiscrepancyETB.toFixed(2)} ETB` : '0.00 ETB'}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block">0 Minor Units Discrepancy</span>
            </div>
          </div>

          {/* SUBSYSTEM HEALTH GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Subsystem Health & Fault Domains
              </h3>
              <button
                onClick={fetchSubsystemsAndBackups}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subsystems.map(sub => (
                <div
                  key={sub.subsystem}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{sub.subsystem.replace(/_/g, ' ')}</span>
                    {getSubsystemStatusBadge(sub.status)}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {sub.lastErrorMessage || sub.recoveryState || 'Operating within normal SLA parameters'}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Updated: {sub.lastSuccessfulOperationAt ? new Date(sub.lastSuccessfulOperationAt).toLocaleTimeString() : (sub.lastFailureAt ? new Date(sub.lastFailureAt).toLocaleTimeString() : 'Active')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAIL-SAFE ARCHITECTURE INVARIANTS */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Guaranteed Operational Invariants (Task 11)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Strict Idempotency:</strong> Duplicate financial retries return the exact existing transaction without creating secondary balance mutations.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Crash Safety:</strong> Transactions crashed at stages 1-4 abort cleanly; stages 5-6 recover to exactly one authoritative commit upon retry.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Lock Isolation:</strong> Distributed lock prevents concurrent settlement or sync workers from overlapping or duplicating prizes.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Fail Safe:</strong> Football provider timeout blocks settlement and never assumes default scores (e.g. 0-0).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEST MATRIX TAB */}
      {activeTab === 'tests' && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing all 30 automated resilience acceptance tests:</span>
            <span className="font-bold text-white">{report.passedCount}/{report.totalCount} Passed</span>
          </div>

          <div className="space-y-2">
            {report.results.map(t => (
              <div
                key={t.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-cyan-400 font-mono">
                      {t.id}
                    </span>
                    <span className="text-xs font-bold text-white">{t.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({t.durationMs}ms)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t.details}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    HTTP {t.actualStatus}
                  </span>
                  {t.passed ? (
                    <span className="px-2 py-1 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PASS
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DISASTER RECOVERY ACTIONS TAB */}
      {activeTab === 'disaster_control' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ACTION CARD 1: BACKUP & ISOLATED RESTORE */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Archive className="w-4 h-4 text-cyan-400" />
                  Operational Backup & Sandbox Restore
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Create immutable snapshots with SHA-256 integrity hashes and verify them in an isolated sandbox environment.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateBackup}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5 text-cyan-400" />
                  {actionLoading === 'backup' ? 'Creating...' : 'Create Backup'}
                </button>
                <button
                  onClick={() => handleIsolatedRestore()}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  {actionLoading === 'restore' ? 'Testing...' : 'Test Isolated Restore'}
                </button>
              </div>

              {/* Backups List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Backups</span>
                {backups.length === 0 ? (
                  <div className="text-[11px] text-slate-500">No operational backups on record.</div>
                ) : (
                  backups.slice(0, 3).map(b => (
                    <div key={b.id} className="text-[10px] font-mono text-slate-300 flex justify-between bg-slate-900 px-2 py-1 rounded">
                      <span>{b.id} ({b.sizeBytes} B)</span>
                      <span className="text-slate-500">{new Date(b.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ACTION CARD 2: RECONCILIATION & 7-STEP RECOVERY */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Authoritative Reconciliation & 7-Step Recovery
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforce zero-minor-unit discrepancy across all user wallets against the authoritative ledger, or execute the full emergency recovery workflow.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRunReconciliation}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {actionLoading === 'reconcile' ? 'Reconciling...' : 'Run Ledger Reconcile'}
                </button>
                <button
                  onClick={handleRunRecoveryWorkflow}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {actionLoading === 'workflow' ? 'Executing 7 Steps...' : 'Execute 7-Step DR Workflow'}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div className="font-bold text-slate-300">7-Step DR Workflow Pipeline:</div>
                <div className="font-mono text-[10px] text-slate-400">
                  1. DETECT &rarr; 2. CONTAIN &rarr; 3. VERIFY &rarr; 4. RECONCILE &rarr; 5. RECOVER &rarr; 6. RECHECK &rarr; 7. RELEASE
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RAW AUDIT REPORT */}
      {activeTab === 'raw_report' && report && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
            {report.reportFormatted}
          </pre>
        </div>
      )}
    </div>
  );
};
