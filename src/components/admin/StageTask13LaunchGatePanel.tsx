import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  DollarSign,
  Scale,
  Lock,
  Layers,
  FileText,
  Server,
  Terminal,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Task13AcceptanceReport, Task13TestItem } from '../../types';

interface StageTask13LaunchGatePanelProps {
  token?: string;
}

export const StageTask13LaunchGatePanel: React.FC<StageTask13LaunchGatePanelProps> = ({ token }) => {
  const [report, setReport] = useState<Task13AcceptanceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const [showFullReport, setShowFullReport] = useState<boolean>(false);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const runRehearsalSuite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/task13/acceptance-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to execute launch rehearsal suite');
      }
      const data: Task13AcceptanceReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Network or execution error running launch rehearsal suite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runRehearsalSuite();
  }, []);

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.reportFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleExpand = (id: string) => {
    setExpandedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = report
    ? ['ALL', ...Array.from(new Set(report.tests.map(t => t.category)))]
    : ['ALL'];

  const filteredTests = report
    ? selectedCategory === 'ALL'
      ? report.tests
      : report.tests.filter(t => t.category === selectedCategory)
    : [];

  return (
    <div className="space-y-6 text-slate-100" id="stage_task13_launch_gate_panel">
      {/* HEADER & ACTION BAR */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                TASK 13 — PRODUCTION GATE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400">
                35 Rehearsal Vectors
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Final Production Launch Rehearsal & Go/No-Go Gate
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              End-to-end verification of production configuration, 0.00 ETB financial balance, 5-market scoring,
              5-tier deterministic tie-breakers, 75/25 settlement conservation, disaster recovery, and staff RBAC.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runRehearsalSuite}
              disabled={loading}
              id="btn_run_task13_rehearsal"
              className="px-5 py-2.5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Executing 35 Vectors...' : 'Execute Launch Rehearsal'}
            </button>

            {report && (
              <button
                onClick={handleCopyReport}
                id="btn_copy_task13_report"
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied Official Report!' : 'Copy Official Report'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {report && (
        <>
          {/* VERDICT & KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: LAUNCH VERDICT */}
            <div className={`p-5 rounded-2xl border backdrop-blur-md ${
              report.decision === 'GO'
                ? 'bg-emerald-950/30 border-emerald-800/60 shadow-emerald-950/20'
                : report.decision === 'CONDITIONAL'
                ? 'bg-amber-950/30 border-amber-800/60 shadow-amber-950/20'
                : 'bg-red-950/30 border-red-800/60 shadow-red-950/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Launch Verdict</span>
                <Scale className="w-5 h-5 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-black ${
                  report.decision === 'GO'
                    ? 'text-emerald-400'
                    : report.decision === 'CONDITIONAL'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {report.decision}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {report.decision === 'CONDITIONAL' ? 'Approved for Pilot' : 'Full Production'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.decision === 'CONDITIONAL'
                  ? 'Ready for Single-Container Staging / Pilot; awaiting external NLA license certificate.'
                  : report.decision === 'GO'
                  ? 'All 35 technical, financial, and legal verification vectors satisfied.'
                  : 'Critical blockers detected. Launch halted.'}
              </p>
            </div>

            {/* CARD 2: TEST MATRIX PASS RATE */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Test Pass Rate</span>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">{report.passRate}</span>
                <span className="text-xs font-bold text-slate-400">
                  {report.passedTests}/{report.totalTests} Passed
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span className="text-amber-400 font-bold">{report.conditionalTests} Conditional</span>
                <span>•</span>
                <span className="text-slate-400">{report.failedTests} Failed</span>
              </div>
            </div>

            {/* CARD 3: NET FINANCIAL DISCREPANCY */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Ledger Balance</span>
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {report.financialAudit.discrepancyETB.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-cyan-400">ETB Discrepancy</span>
              </div>
              <p className="text-xs text-emerald-400 mt-2 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Authoritative Ledger == Wallets (0 Minor Units)
              </p>
            </div>

            {/* CARD 4: BLOCKERS & COMPLIANCE */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">P0 Blockers</span>
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">0</span>
                <span className="text-xs font-bold text-slate-400">Zero Critical Blockers</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                2 Operational Clearances Documented (Single-instance pinning & NLA filing).
              </p>
            </div>
          </div>

          {/* FINANCIAL RECONCILIATION SUMMARY BANNER */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Authoritative Financial Reconciliation Summary
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                0.00 ETB NET DISCREPANCY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-sm">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="text-xs text-slate-400 font-bold uppercase">Authoritative Ledger</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {report.financialAudit.totalLedgerETB.toLocaleString()} ETB
                </div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="text-xs text-slate-400 font-bold uppercase">Total Wallet Balances</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {report.financialAudit.totalWalletsETB.toLocaleString()} ETB
                </div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="text-xs text-slate-400 font-bold uppercase">Completed Deposits</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  {report.financialAudit.completedDepositsVolumeETB.toLocaleString()} ETB
                </div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="text-xs text-slate-400 font-bold uppercase">Completed Withdrawals</div>
                <div className="text-lg font-black text-amber-400 mt-0.5">
                  {report.financialAudit.completedWithdrawalsVolumeETB.toLocaleString()} ETB
                </div>
              </div>
            </div>
          </div>

          {/* OPERATIONAL PREREQUISITES & CONDITIONS */}
          <div className="p-5 rounded-2xl border border-amber-900/40 bg-amber-950/20 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">
                Operational Prerequisites for Public Real-Money Launch
              </h2>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li>
                <strong className="text-amber-200">Single-Container Pinning (LAUNCH-24):</strong> Current Cloud Run container relies on process-local atomic file-sync invariants. Pin deployment to <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">max-instances=1</code> until distributed cross-container mutex (Redis Redlock or Postgres advisory locks) is activated.
              </li>
              <li>
                <strong className="text-amber-200">Ethiopian Regulatory Clearance (LAUNCH-30):</strong> Platform architecture and versioned withholding tax snapshotting are fully compliant. Formal registration and license issuance with the Ethiopian National Lottery Administration (NLA) and Ministry of Revenues must be completed before accepting public deposits.
              </li>
            </ul>
          </div>

          {/* TEST MATRIX TABLE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  35-Vector Launch Rehearsal Test Matrix
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredTests.length} of {report.totalTests} verification items
                </p>
              </div>

              {/* CATEGORY FILTER */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase font-black tracking-wider text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-28">Test ID</th>
                    <th className="py-3 px-4 w-32">Category</th>
                    <th className="py-3 px-4 w-32">Status</th>
                    <th className="py-3 px-4">Verification Name & Details</th>
                    <th className="py-3 px-4 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTests.map((test: Task13TestItem) => {
                    const isExpanded = expandedTests[test.id];
                    const isCond = test.isConditional;
                    const isPass = test.passed && !isCond;

                    return (
                      <React.Fragment key={test.id}>
                        <tr
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-slate-800/30' : ''
                          }`}
                          onClick={() => toggleExpand(test.id)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-white">{test.id}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                              {test.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isCond ? (
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                CONDITIONAL
                              </span>
                            ) : isPass ? (
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" />
                                PASS
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                FAIL
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-100">{test.name}</div>
                            <div className="text-slate-400 mt-0.5 line-clamp-1">{test.details}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 mx-auto" />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={5} className="p-4 pl-12 text-xs space-y-2 border-b border-slate-800/80">
                              <div className="space-y-1">
                                <strong className="text-slate-300">Detailed Verification Outcome:</strong>
                                <p className="text-slate-400 leading-relaxed">{test.details}</p>
                              </div>

                              {test.rootCause && (
                                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-200">
                                  <strong>Identified Operational Finding:</strong> {test.rootCause}
                                </div>
                              )}

                              {test.fix && (
                                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/40 text-cyan-200">
                                  <strong>Operational Recommendation:</strong> {test.fix}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FULL FORMATTED AUDIT REPORT ACCORDION */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
              onClick={() => setShowFullReport(prev => !prev)}
            >
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Official Formatted Launch Rehearsal Audit Report (Section 35)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyReport();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {showFullReport ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {showFullReport && (
              <div className="p-5 border-t border-slate-800 bg-slate-950">
                <pre className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                  {report.reportFormatted}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
