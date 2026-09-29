import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  Layers,
  Database,
  Lock,
  Trophy,
  Wallet,
  FileText,
  Activity,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { StageI2TestSuiteResponse, StageI2TestResult } from '../types';

interface StageI2AcceptancePanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export const StageI2AcceptancePanel: React.FC<StageI2AcceptancePanelProps> = ({
  token,
  userRole,
  setFeedback
}) => {
  const [suiteResults, setSuiteResults] = useState<StageI2TestSuiteResponse | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const runAcceptanceSuite = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/security/stage-i2-acceptance-suite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: StageI2TestSuiteResponse = await res.json();
        setSuiteResults(data);
        if (data.summary.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage I2 Operational Acceptance Verified: ${data.passed}/${data.totalTests} tests passed!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage I2 Acceptance identified ${data.failed} issue(s).`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to run Stage I2 Acceptance suite.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error running Stage I2 Acceptance suite.' });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    // Run on initial mount
    runAcceptanceSuite();
  }, []);

  const tests = suiteResults?.tests || [];
  const categories = Array.from(new Set(tests.map(t => t.category))).sort();

  const filteredTests = tests.filter(t => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'FAIL') return !t.passed;
    return t.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & TRIGGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white">
                Stage I2: Real-World Admin Operational Acceptance & Bug Hunt
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Validates complete lifecycle: API-Football → Ingestion → Classification → Multi-Day Selection → Creation → Publication → Entry → Prediction → 10m Lock → Sync → Scoring → Leaderboard → Settlement → Ledger.
            </p>
          </div>

          <button
            onClick={runAcceptanceSuite}
            disabled={running}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Operational Suite...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Operational Acceptance Suite
              </>
            )}
          </button>
        </div>

        {/* API PROVIDER & DATA SOURCE CALLOUT */}
        {suiteResults?.report && (
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            suiteResults.report.apiProviderStatus.isLive
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white">
                  {suiteResults.report.apiProviderStatus.isLive
                    ? 'Live API-Football Provider Active'
                    : 'API-Football live connection unavailable. Displaying fallback data.'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {suiteResults.report.apiProviderStatus.isLive
                    ? 'System verified with live API-Sports credentials.'
                    : 'System is verified with synthetic simulation fixtures. Live API credentials are not active in this sandbox.'}
                </div>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
              suiteResults.report.apiProviderStatus.isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {suiteResults.report.apiProviderStatus.isLive ? 'LIVE FEED' : 'FALLBACK SIMULATION'}
            </span>
          </div>
        )}

        {/* SUMMARY CARDS */}
        {suiteResults && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Checks</div>
              <div className="text-lg font-black text-white mt-0.5">{suiteResults.totalTests}</div>
            </div>
            <div className="p-3 bg-slate-950 border border-emerald-900/40 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Passed</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{suiteResults.passed}</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400">Execution Time</div>
              <div className="text-lg font-black text-white mt-0.5">{suiteResults.durationMs}ms</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400">Unexplained Delta</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {suiteResults.report.financialReconciliation.unexplainedDeltaETB.toFixed(2)} ETB
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 14-STEP LIFECYCLE GRID */}
      {suiteResults?.report?.lifecycle && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            14-Stage End-to-End Operational Lifecycle
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {Object.entries(suiteResults.report.lifecycle).map(([stepKey, stepStatus]) => {
              const isPass = stepStatus === 'PASS' || stepStatus === 'LIVE' || stepStatus === 'FALLBACK_SIMULATED';
              return (
                <div
                  key={stepKey}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                >
                  <span className="font-semibold text-slate-300 capitalize">
                    {stepKey.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isPass ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}
                  >
                    {stepStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FINANCIAL RECONCILIATION SUMMARY */}
      {suiteResults?.report?.financialReconciliation && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            20-Player Settlement Financial Reconciliation
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Gross Collected</div>
              <div className="text-base font-black text-white mt-0.5">
                {suiteResults.report.financialReconciliation.grossEntryFeesETB.toLocaleString()} ETB
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-amber-400 font-bold uppercase">Rank 1 (55%)</div>
              <div className="text-base font-black text-amber-400 mt-0.5">
                {suiteResults.report.financialReconciliation.rank1PayoutETB.toLocaleString()} ETB
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Rank 2 (15%)</div>
              <div className="text-base font-black text-slate-300 mt-0.5">
                {suiteResults.report.financialReconciliation.rank2PayoutETB.toLocaleString()} ETB
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Rank 3 (5%)</div>
              <div className="text-base font-black text-slate-300 mt-0.5">
                {suiteResults.report.financialReconciliation.rank3PayoutETB.toLocaleString()} ETB
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-cyan-400 font-bold uppercase">House Fee (25%)</div>
              <div className="text-base font-black text-cyan-400 mt-0.5">
                {suiteResults.report.financialReconciliation.houseShareETB.toLocaleString()} ETB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BUTTONS */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All Tests ({tests.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* INDIVIDUAL TEST RESULTS */}
      <div className="space-y-2">
        {filteredTests.map((test: StageI2TestResult) => (
          <div
            key={test.id}
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
              test.passed
                ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {test.id}
                </span>
                <span className="font-bold text-white">{test.name}</span>
              </div>
              <p className="text-[11px] text-slate-400">{test.details}</p>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 font-bold">
              {test.passed ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  PASS
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400">
                  <XCircle className="w-4 h-4" />
                  FAIL
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
