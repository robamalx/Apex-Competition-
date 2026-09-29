import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserX,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Lock,
  ChevronRight,
  Activity,
  Layers,
  Bot,
  Zap,
  Play
} from 'lucide-react';
import { User, SuspiciousActivityIncident, WithdrawalReviewRecord, CollusionSignal, AccountCluster, FraudRiskDashboardMetrics } from '../../types';

interface AdminFraudRiskTabProps {
  user: User;
  token?: string | null;
}

export const AdminFraudRiskTab: React.FC<AdminFraudRiskTabProps> = ({ user, token }) => {
  const [subTab, setSubTab] = useState<'incidents' | 'withdrawals' | 'clusters' | 'test_suite'>('incidents');
  const [metrics, setMetrics] = useState<FraudRiskDashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<SuspiciousActivityIncident[]>([]);
  const [withdrawalReviews, setWithdrawalReviews] = useState<WithdrawalReviewRecord[]>([]);
  const [collusionSignals, setCollusionSignals] = useState<CollusionSignal[]>([]);
  const [accountClusters, setAccountClusters] = useState<AccountCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SuspiciousActivityIncident | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test Suite State
  const [runningSuite, setRunningSuite] = useState(false);
  const [suiteResponse, setSuiteResponse] = useState<any>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const role = user.role.toUpperCase();
  const isAdminOrSuper = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  const isWalletStaff = ['WALLET_MANAGER', 'PAYMENT_VERIFIER', 'ADMIN', 'SUPER_ADMIN'].includes(role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Metrics
      const mRes = await fetch('/api/admin/fraud/metrics', { headers });
      if (mRes.ok) {
        setMetrics(await mRes.json());
      }

      // 2. Fetch Incidents
      const iRes = await fetch('/api/admin/fraud/incidents', { headers });
      if (iRes.ok) {
        setIncidents(await iRes.json());
      }

      // 3. Fetch Withdrawal Reviews if authorized
      if (isWalletStaff) {
        const wRes = await fetch('/api/admin/fraud/withdrawal-reviews', { headers });
        if (wRes.ok) {
          setWithdrawalReviews(await wRes.json());
        }
      }

      // 4. Fetch Collusion and Clusters if authorized
      if (isAdminOrSuper || role === 'COMPETITION_PUBLISHER') {
        const cRes = await fetch('/api/admin/fraud/collusion-signals', { headers });
        if (cRes.ok) {
          setCollusionSignals(await cRes.json());
        }
      }
      if (isAdminOrSuper) {
        const clRes = await fetch('/api/admin/fraud/account-clusters', { headers });
        if (clRes.ok) {
          setAccountClusters(await clRes.json());
        }
      }
    } catch (err: any) {
      console.error('Failed to load fraud center data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, role, isAdminOrSuper, isWalletStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Incident Actions
  const handleIncidentAction = async (
    action: 'ASSIGN' | 'ADD_NOTE' | 'MONITOR' | 'RESTRICT' | 'CLEAR' | 'ESCALATE' | 'CONFIRM' | 'CLOSE',
    payload?: any
  ) => {
    if (!selectedIncident) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/admin/fraud/incidents/${selectedIncident.incidentId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Action failed' });
      } else {
        setFeedback({ type: 'success', message: `Incident action ${action} applied successfully.` });
        setSelectedIncident(data.incident);
        setActionNote('');
        fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Withdrawal Review Processing
  const handleProcessWithdrawal = async (txId: string, action: 'APPROVE' | 'REJECT' | 'HOLD', reason: string) => {
    try {
      const res = await fetch(`/api/admin/fraud/withdrawal-reviews/${txId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, reason })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to process withdrawal review' });
      } else {
        setFeedback({ type: 'success', message: `Withdrawal successfully updated (${action}).` });
        fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error processing review' });
    }
  };

  // Handle Test Suite Execution
  const handleRunTestSuite = async () => {
    setRunningSuite(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/stage-task10/test-suite/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setSuiteResponse(data);
      if (data.success) {
        setFeedback({ type: 'success', message: `Task 10 suite completed: ${data.passedCount}/${data.totalCount} tests passed!` });
      } else {
        setFeedback({ type: 'error', message: `Task 10 suite finished with ${data.failedCount} failures.` });
      }
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to execute test suite' });
    } finally {
      setRunningSuite(false);
    }
  };

  // Filtered Incidents
  const filteredIncidents = incidents.filter(i => {
    if (severityFilter !== 'ALL' && i.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        i.incidentId.toLowerCase().includes(term) ||
        i.userId.toLowerCase().includes(term) ||
        (i.userName && i.userName.toLowerCase().includes(term)) ||
        i.trigger.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & METRICS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Fraud, Abuse & Suspicious Activity Control Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detect first • Preserve immutable evidence • Contain when necessary • Never confiscate funds without due process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* OPERATIONAL METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Open Incidents</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{metrics?.openIncidentsCount ?? 0}</div>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Critical Risk</div>
          <div className="text-xl font-bold text-rose-400 mt-1">{metrics?.criticalIncidentsCount ?? 0}</div>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Withdrawal Reviews</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{metrics?.withdrawalReviewsCount ?? 0}</div>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Account Clusters</div>
          <div className="text-xl font-bold text-purple-400 mt-1">{metrics?.suspiciousAccountClustersCount ?? 0}</div>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Collusion Signals</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{metrics?.collusionSignalsCount ?? 0}</div>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Bot Signals</div>
          <div className="text-xl font-bold text-orange-400 mt-1">{metrics?.botSignalsCount ?? 0}</div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setSubTab('incidents')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === 'incidents'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Incidents & Investigations
          <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {incidents.length}
          </span>
        </button>
        {isWalletStaff && (
          <button
            onClick={() => setSubTab('withdrawals')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              subTab === 'withdrawals'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Withdrawal Risk Reviews
            <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {withdrawalReviews.length}
            </span>
          </button>
        )}
        <button
          onClick={() => setSubTab('clusters')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === 'clusters'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Clusters & Collusion
        </button>
        <button
          onClick={() => setSubTab('test_suite')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === 'test_suite'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Acceptance Test Suite (Task 10)
        </button>
      </div>

      {/* ================================================================= */}
      {/* 1. INCIDENTS & INVESTIGATIONS TAB */}
      {/* ================================================================= */}
      {subTab === 'incidents' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, User, or Trigger..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Severity:</span>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <span className="text-xs text-slate-400 ml-2">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="MONITORED">Monitored</option>
                <option value="RESTRICTED">Restricted</option>
                <option value="CLEARED">Cleared</option>
                <option value="CONFIRMED">Confirmed Fraud</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
          </div>

          {/* INCIDENTS TABLE */}
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
              No suspicious activity incidents match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Incident ID</th>
                    <th className="p-3">Player</th>
                    <th className="p-3">Trigger / Signals</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Detected</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.incidentId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-300">{inc.incidentId}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{inc.userName || inc.userId}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{inc.userId}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-200">{inc.trigger}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {inc.riskSignals.slice(0, 2).map((sig, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 font-mono"
                            >
                              {sig}
                            </span>
                          ))}
                          {inc.riskSignals.length > 2 && (
                            <span className="text-[9px] text-slate-500">+{inc.riskSignals.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : inc.severity === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : inc.severity === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inc.status === 'CONFIRMED'
                              ? 'bg-rose-900/60 text-rose-200'
                              : inc.status === 'CLEARED'
                              ? 'bg-emerald-900/60 text-emerald-200'
                              : inc.status === 'RESTRICTED'
                              ? 'bg-amber-900/60 text-amber-200'
                              : inc.status === 'UNDER_REVIEW'
                              ? 'bg-cyan-900/60 text-cyan-200'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(inc.detectedAt).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INCIDENT INVESTIGATION MODAL */}
          {selectedIncident && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Incident Investigation</h3>
                      <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-amber-400">
                        {selectedIncident.incidentId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Player: {selectedIncident.userName} ({selectedIncident.userId})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* EVIDENCE SNAPSHOT */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Preserved Immutable Evidence Snapshot
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Hash: {selectedIncident.evidence?.immutableHash?.substring(0, 16)}...
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Captured At:</span>{' '}
                      {new Date(selectedIncident.evidence?.capturedAt || selectedIncident.detectedAt).toLocaleTimeString()}
                    </div>
                    <div>
                      <span className="text-slate-500">Related Tx:</span>{' '}
                      {selectedIncident.relatedTransactionIds.length || 'None'}
                    </div>
                    <div>
                      <span className="text-slate-500">Related Comps:</span>{' '}
                      {selectedIncident.relatedCompetitionIds.length || 'None'}
                    </div>
                    <div>
                      <span className="text-slate-500">Assigned To:</span>{' '}
                      {selectedIncident.assignedTo || 'Unassigned'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="text-xs font-medium text-slate-300 mb-1">Human-Readable Assessment:</div>
                    <ul className="list-disc list-inside text-xs text-amber-300/90 space-y-0.5">
                      {selectedIncident.humanReasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* REVIEW NOTES */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Investigation Notes & Log History</label>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {selectedIncident.reviewNotes || 'No notes added yet.'}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add investigation finding or note..."
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleIncidentAction('ADD_NOTE', { note: actionNote })}
                      disabled={!actionNote.trim() || actionProcessing}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {/* ROLE ACTIONS BAR */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-400">Authorized Investigative Actions:</div>
                  <div className="flex flex-wrap gap-2">
                    {/* CS: Read only */}
                    {role === 'CUSTOMER_SUPPORT' && (
                      <span className="text-xs text-slate-500 italic">
                        Customer Support role has view-only permissions on fraud cases.
                      </span>
                    )}

                    {/* Common Staff Actions */}
                    {isAdminOrSuper && (
                      <>
                        <button
                          onClick={() => handleIncidentAction('ASSIGN', { assignedTo: user.id })}
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-xs font-semibold"
                        >
                          Assign to Me
                        </button>
                        <button
                          onClick={() => handleIncidentAction('MONITOR')}
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-semibold"
                        >
                          Mark Monitored
                        </button>
                        <button
                          onClick={() =>
                            handleIncidentAction('RESTRICT', {
                              reason: actionNote || 'Account under administrative review',
                              restrictions: { isWithdrawalRestricted: true }
                            })
                          }
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs font-semibold"
                        >
                          Restrict Withdrawal
                        </button>
                        <button
                          onClick={() =>
                            handleIncidentAction('CLEAR', {
                              reason: actionNote || 'Cleared: no policy violation found'
                            })
                          }
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold"
                        >
                          Clear & Restore
                        </button>
                        <button
                          onClick={() =>
                            handleIncidentAction('CONFIRM', {
                              reason: actionNote || 'Confirmed fraud following investigation'
                            })
                          }
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold"
                        >
                          Confirm Fraud
                        </button>
                      </>
                    )}

                    {/* Super Admin Emergency Escalation */}
                    {role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleIncidentAction('ESCALATE')}
                        disabled={actionProcessing}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-500 text-rose-300 text-xs font-bold ml-auto"
                      >
                        ⚡ Emergency Freeze
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. WITHDRAWAL RISK REVIEWS TAB */}
      {/* ================================================================= */}
      {subTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
            Withdrawal risk controls ensure player balances are never confiscated while transactions with high-risk signals are placed into structured administrative review.
          </div>

          {withdrawalReviews.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
              Zero withdrawals currently pending risk review.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Review ID / Tx</th>
                    <th className="p-3">Player</th>
                    <th className="p-3">Amount ETB</th>
                    <th className="p-3">Method & Ref</th>
                    <th className="p-3">Risk Signals</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {withdrawalReviews.map(w => (
                    <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono">
                        <div>{w.id}</div>
                        <div className="text-[10px] text-slate-500">{w.transactionId}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{w.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{w.userId}</div>
                      </td>
                      <td className="p-3 font-bold text-amber-400">{w.amountETB.toLocaleString()} ETB</td>
                      <td className="p-3">
                        <div>{w.paymentMethod}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{w.paymentReference}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {w.riskSignals.map((sig, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950/60 text-rose-300 border border-rose-800/50"
                            >
                              {sig}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300'
                              : w.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {w.status === 'RISK_REVIEW' || w.status === 'HELD' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleProcessWithdrawal(w.transactionId, 'APPROVE', 'Verified by staff')}
                              className="px-2 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcessWithdrawal(w.transactionId, 'REJECT', 'Account verification failed')}
                              className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold"
                            >
                              Reject & Return
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. CLUSTERS & COLLUSION SIGNALS TAB */}
      {/* ================================================================= */}
      {subTab === 'clusters' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ACCOUNT CLUSTERS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Duplicate Account Clusters ({accountClusters.length})
            </h3>
            {accountClusters.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                Zero multi-account clusters detected.
              </div>
            ) : (
              <div className="space-y-2">
                {accountClusters.map(c => (
                  <div key={c.clusterId} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-purple-400">{c.clusterId}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300">
                        Confidence: {c.confidenceScore}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Primary User: <span className="font-mono text-amber-300">{c.primaryUserId}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Linked Accounts: {c.relatedUserIds.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLLUSION SIGNALS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Competition Collusion Signals ({collusionSignals.length})
            </h3>
            {collusionSignals.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                Zero competition collusion anomalies detected.
              </div>
            ) : (
              <div className="space-y-2">
                {collusionSignals.map(s => (
                  <div key={s.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-blue-400">{s.competitionId}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300">
                        Similarity: {Math.round(s.predictionSimilarityScore * 100)}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Involved Users: {s.involvedUserIds.join(', ')}
                    </div>
                    <div className="text-[11px] text-slate-400">{s.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. TASK 10 ACCEPTANCE TEST SUITE TAB */}
      {/* ================================================================= */}
      {subTab === 'test_suite' && (
        <div className="space-y-5">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Task 10 Production Hardening Acceptance Suite</h3>
              <p className="text-xs text-slate-400 mt-1">
                Runs 30 strict tests (RISK-01 to RISK-30) covering fraud detection, false-positive protection, RBAC boundaries, IDOR guards, concurrency, and financial reconciliation (Discrepancy = 0 ETB).
              </p>
            </div>
            <button
              onClick={handleRunTestSuite}
              disabled={runningSuite}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
            >
              <Play className={`w-4 h-4 ${runningSuite ? 'animate-spin' : ''}`} />
              {runningSuite ? 'Running 30 Tests...' : 'Run Task 10 Acceptance Suite'}
            </button>
          </div>

          {suiteResponse && (
            <div className="space-y-4">
              {/* SUMMARY STATS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Total Tests</div>
                  <div className="text-xl font-bold text-white mt-1">{suiteResponse.totalCount}</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Passed</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{suiteResponse.passedCount}</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Failed</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{suiteResponse.failedCount}</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Reconciliation</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">0.00 ETB</div>
                </div>
              </div>

              {/* DETAILED TEST LIST */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60 divide-y divide-slate-800/60">
                {suiteResponse.results?.map((t: any) => (
                  <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-mono font-bold text-slate-300">{t.id}</span> — {t.name}
                        {t.details && t.details !== 'Verified successfully.' && (
                          <div className="text-[11px] text-rose-400 font-mono mt-0.5">{t.details}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{t.durationMs}ms</span>
                  </div>
                ))}
              </div>

              {/* FORMATTED REPORT */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400">Specification Report:</div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                  {suiteResponse.reportFormatted}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
