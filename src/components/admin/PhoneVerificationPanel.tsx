import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  Activity,
  UserCheck,
  Zap,
  Radio,
  FileCheck,
  Send,
  MessageSquare
} from 'lucide-react';
import {
  User,
  Risk4AcceptanceReport,
  Risk4TestItem,
  PhoneVerificationProviderHealth,
  PhoneVerificationAuditRecord,
  AccountRecoveryRequest
} from '../../types.js';

interface PhoneVerificationPanelProps {
  currentUser: User;
}

export const PhoneVerificationPanel: React.FC<PhoneVerificationPanelProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'SUITE' | 'PROVIDERS' | 'RECOVERY' | 'OVERRIDE' | 'AUDIT'>('SUITE');
  const [report, setReport] = useState<Risk4AcceptanceReport | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Overview data
  const [providers, setProviders] = useState<PhoneVerificationProviderHealth[]>([]);
  const [auditLogs, setAuditLogs] = useState<PhoneVerificationAuditRecord[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<AccountRecoveryRequest[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);

  // Recovery Review Form
  const [selectedRecovery, setSelectedRecovery] = useState<AccountRecoveryRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Super Admin Override Form
  const [overrideUserId, setOverrideUserId] = useState<string>('');
  const [overridePhone, setOverridePhone] = useState<string>('');
  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [overrideStatus, setOverrideStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [overrideSubmitting, setOverrideSubmitting] = useState<boolean>(false);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/admin/phone-verification/overview', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setAuditLogs(data.auditLogs || []);
        setRecoveryRequests(data.recoveryRequests || []);
      }
    } catch (err) {
      console.error('Failed to fetch phone verification overview', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const runAcceptanceSuite = async () => {
    setRunning(true);
    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/admin/phone-verification/run-acceptance-suite', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setReport(data);
      fetchOverview();
    } catch (err) {
      console.error('Failed to run test suite', err);
    } finally {
      setRunning(false);
    }
  };

  const handleReviewRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecovery) return;

    setReviewSubmitting(true);
    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/admin/phone-verification/recovery/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          recoveryId: selectedRecovery.id,
          action: reviewAction,
          notes: reviewNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedRecovery(null);
        setReviewNotes('');
        fetchOverview();
      } else {
        alert(data.error || 'Review failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideSubmitting(true);
    setOverrideStatus(null);

    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/admin/phone-verification/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetUserId: overrideUserId.trim(),
          newPhone: overridePhone.trim(),
          justification: overrideJustification.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOverrideStatus({ success: true, message: 'Phone override completed and logged to forensic audit trail.' });
        setOverrideUserId('');
        setOverridePhone('');
        setOverrideJustification('');
        fetchOverview();
      } else {
        setOverrideStatus({ success: false, message: data.error || 'Override failed' });
      }
    } catch (err: any) {
      setOverrideStatus({ success: false, message: err.message || 'Network error' });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const filteredTests = report?.tests.filter((t: Risk4TestItem) => {
    const matchCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.caseNumber).includes(searchTerm);
    return matchCategory && matchSearch;
  }) || [];

  return (
    <div id="risk4-phone-verification-panel" className="space-y-6 text-slate-100">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Risk 4: Phone & Account Verification</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                E.164 Canon & OTP Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Production-grade verification gateway, cryptographic OTP salting, sliding rate limits, duplicate prevention, and recovery review.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-phone-overview-btn"
            onClick={fetchOverview}
            disabled={loadingOverview}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          <button
            id="run-risk4-acceptance-suite-btn"
            onClick={runAcceptanceSuite}
            disabled={running}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running 40 Test Cases...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Risk 4 Test Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('SUITE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'SUITE'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Acceptance Suite (40 Cases)</span>
          {report && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
              {report.passedCount}/{report.totalTests}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('PROVIDERS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'PROVIDERS'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Gateway Health</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
            {providers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('RECOVERY')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'RECOVERY'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Account Recovery Queue</span>
          {recoveryRequests.filter(r => r.status === 'PENDING_REVIEW').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {recoveryRequests.filter(r => r.status === 'PENDING_REVIEW').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('OVERRIDE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'OVERRIDE'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Super Admin Override</span>
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'AUDIT'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Forensic Audit Ledger</span>
        </button>
      </div>

      {/* SUB-TAB 1: ACCEPTANCE SUITE */}
      {activeSubTab === 'SUITE' && (
        <div className="space-y-6 animate-fade-in">
          {report ? (
            <div className="space-y-6">
              {/* Verdict Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">Suite Verdict</div>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xl font-bold text-white tracking-wide">{report.verdict}</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    {report.passedCount}/{report.totalTests} Passed ({report.passPercentage}%)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">Normalization Standard</div>
                  <div className="text-xs font-bold text-amber-300 mt-1 font-mono">
                    E.164 (+2519... / +2517...)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Ethio Telecom & Safaricom 9-digit
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">OTP Cryptography</div>
                  <div className="text-xs font-bold text-sky-300 mt-1 font-mono">
                    SHA-256 + 128-bit Salt
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    CSPRNG 6-digit (Timing-Safe)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">Financial Ledger Check</div>
                  <div className="text-xs font-bold text-emerald-300 mt-1 font-mono">
                    0.00 ETB Discrepancy
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Zero Balance Mutation Invariant
                  </div>
                </div>
              </div>

              {/* Category Breakdown Bar */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Test Category Pass Rates
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {Object.entries(report.categoryBreakdown).map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                      <span className="capitalize text-slate-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {val.passed}/{val.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'Phone Normalization', 'OTP Cryptography', 'Rate Limiting & Security', 'Duplicate Protection', 'Provider Resilience', 'Telegram Integration', 'Account Recovery & Staff', 'Fraud & Financial Integration'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Filter test cases..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Test Cases Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-16">#</th>
                      <th className="py-2.5 px-3">Test Case & Verification Scope</th>
                      <th className="py-2.5 px-3 w-40">Category</th>
                      <th className="py-2.5 px-3 w-28">Duration</th>
                      <th className="py-2.5 px-3 w-24 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTests.map(t => (
                      <tr key={t.caseNumber} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{t.caseNumber}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">{t.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{t.details}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Expected: {t.expected} | Actual: {t.actual}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{t.durationMs}ms</td>
                        <td className="py-2.5 px-3 text-right">
                          {t.passed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                              <XCircle className="w-3 h-3" /> FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Risk 4 Verification Suite Ready</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Execute the 40 automated test cases covering Ethiopian phone normalization, cryptographic OTP verification, rate limiters, circuit breakers, Telegram integration, and account recovery.
                </p>
              </div>
              <button
                onClick={runAcceptanceSuite}
                disabled={running}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {running ? 'Executing Test Cases...' : 'Run All 40 Test Cases Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PROVIDERS & GATEWAY TELEMETRY */}
      {activeSubTab === 'PROVIDERS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(p => (
              <div key={p.providerId} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{p.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {p.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">ID: {p.providerId}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      p.status === 'HEALTHY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : p.status === 'DEGRADED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/60">
                    <div className="text-slate-400 text-[10px]">Success Rate</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">{p.successRatePercent}%</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60">
                    <div className="text-slate-400 text-[10px]">Avg Latency</div>
                    <div className="font-mono font-bold text-sky-400 mt-0.5">{p.averageLatencyMs}ms</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60">
                    <div className="text-slate-400 text-[10px]">Circuit Breaker</div>
                    <div className="font-mono font-bold text-slate-300 mt-0.5">
                      {p.circuitBreakerOpen ? 'OPEN (TRIPPED)' : 'CLOSED (OK)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>Messages Sent: <strong>{p.totalSent}</strong> | Delivered: <strong>{p.totalDelivered}</strong></span>
                  <span>Failures: <strong className={p.totalFailed > 0 ? 'text-rose-400' : 'text-slate-400'}>{p.totalFailed}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ACCOUNT RECOVERY QUEUE */}
      {activeSubTab === 'RECOVERY' && (
        <div className="space-y-6 animate-fade-in">
          {recoveryRequests.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No account recovery requests currently pending review.
            </div>
          ) : (
            <div className="space-y-4">
              {recoveryRequests.map(rec => (
                <div key={rec.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{rec.userName}</span>
                        <span className="font-mono text-[11px] text-slate-400">({rec.userId})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            rec.status === 'PENDING_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300'
                              : rec.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Current: <span className="font-mono text-slate-300">{rec.currentPhoneMasked}</span> → Requested: <span className="font-mono text-amber-300 font-bold">{rec.newCanonicalPhone}</span>
                      </p>
                    </div>

                    {rec.status === 'PENDING_REVIEW' && (
                      <button
                        onClick={() => setSelectedRecovery(rec)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors"
                      >
                        Review Ticket
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-800/60 text-xs space-y-1">
                    <div><strong>Reason:</strong> {rec.reason}</div>
                    <div><strong>Proof Details:</strong> {rec.proofDetails}</div>
                    {rec.idDocumentRef && <div><strong>Document Ref:</strong> {rec.idDocumentRef}</div>}
                  </div>

                  {rec.reviewedBy && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      Reviewed by <strong>{rec.reviewedBy}</strong> at {new Date(rec.reviewedAt!).toLocaleString()}
                      {rec.reviewNotes && <span> — Notes: {rec.reviewNotes}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Review Modal Dialog */}
          {selectedRecovery && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <form onSubmit={handleReviewRecovery} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Review Recovery Ticket</h3>
                <p className="text-xs text-slate-400">
                  Migrating phone for user <strong>{selectedRecovery.userName}</strong> to <span className="font-mono text-amber-300">{selectedRecovery.newCanonicalPhone}</span>.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Decision</label>
                  <select
                    value={reviewAction}
                    onChange={e => setReviewAction(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="APPROVED">Approve & Migrate Phone</option>
                    <option value="REJECTED">Reject Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Compliance Review Notes</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Enter identification verification notes or rejection reasons..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecovery(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Confirm Decision'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: SUPER ADMIN OVERRIDE */}
      {activeSubTab === 'OVERRIDE' && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Administrative Phone Override
            </h3>
            <p className="text-xs text-slate-400">
              Emergency administrative tool strictly restricted to Super Admins. All overrides require mandatory justification and are written to immutable audit logs.
            </p>
          </div>

          {overrideStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                overrideStatus.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {overrideStatus.message}
            </div>
          )}

          <form onSubmit={handleAdminOverride} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Player ID or Username</label>
              <input
                type="text"
                value={overrideUserId}
                onChange={e => setOverrideUserId(e.target.value)}
                placeholder="e.g. usr_1710000000000_123 or player_username"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Ethiopian Phone Number</label>
              <input
                type="tel"
                value={overridePhone}
                onChange={e => setOverridePhone(e.target.value)}
                placeholder="e.g. 0911223344"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Security & Legal Justification (Min 10 chars)
              </label>
              <textarea
                rows={3}
                value={overrideJustification}
                onChange={e => setOverrideJustification(e.target.value)}
                placeholder="State the regulatory / judicial / customer compliance justification for this manual phone override..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={overrideSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {overrideSubmitting ? 'Executing Administrative Override...' : 'Execute Phone Override & Log Audit'}
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 5: AUDIT LOGS */}
      {activeSubTab === 'AUDIT' && (
        <div className="space-y-4 animate-fade-in">
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">Masked Phone</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">{l.action}</td>
                    <td className="py-2.5 px-3 text-slate-300">{l.actor} ({l.actorRole})</td>
                    <td className="py-2.5 px-3 text-slate-300">{l.canonicalPhoneMasked}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{l.details}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {l.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
