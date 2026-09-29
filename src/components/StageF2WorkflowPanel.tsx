import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Lock,
  Layers,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { StageF2OperationalSummary, StageF2TestSuiteResponse } from '../types';

interface StageF2WorkflowPanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export const StageF2WorkflowPanel: React.FC<StageF2WorkflowPanelProps> = ({
  token,
  userRole,
  setFeedback
}) => {
  const [summary, setSummary] = useState<StageF2OperationalSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  const [suiteResults, setSuiteResults] = useState<StageF2TestSuiteResponse | null>(null);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/admin/fixtures/stage-f2-summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to fetch Stage F2 operational summary' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error fetching summary' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const runSuite = async () => {
    setRunningSuite(true);
    try {
      const res = await fetch('/api/admin/competitions/stage-f2-operational-test-suite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuiteResults(data);
        if (data.operationalReport) {
          setSummary(data.operationalReport);
        }
        if (data.summary?.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage F2 Operational Suite Passed: ${data.summary.passed}/${data.summary.totalTests} tests verified!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage F2 Suite Failures: ${data.summary.failed} tests failed out of ${data.summary.totalTests}.`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to run Stage F2 test suite' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error running suite' });
    } finally {
      setRunningSuite(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSummary();
    }
  }, [token]);

  const categories: string[] = ['ALL'];
  if (suiteResults?.tests) {
    suiteResults.tests.forEach(t => {
      if (!categories.includes(t.category)) {
        categories.push(t.category);
      }
    });
  }

  const filteredTests = suiteResults?.tests
    ? suiteResults.tests.filter(t => activeCategoryFilter === 'ALL' || t.category === activeCategoryFilter)
    : [];

  return (
    <div id="stage-f2-workflow-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Stage F2 Operational Workflow
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Africa/Addis_Ababa (EAT)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Calendar className="w-7 h-7 text-emerald-400" />
              Real Fixture-to-Competition Engine & 10-Min Auto-Lock
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Deterministic operational pipeline transforming live Top-5 league fixtures across Friday, Saturday, and Sunday into published competitions with server-authoritative 10-minute earliest kickoff auto-locking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="refresh-f2-summary-btn"
              onClick={fetchSummary}
              disabled={loadingSummary}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
              Refresh Metrics
            </button>
            <button
              id="run-f2-suite-btn"
              onClick={runSuite}
              disabled={runningSuite}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 ${runningSuite ? 'animate-spin' : ''}`} />
              {runningSuite ? 'Running 75-Test Suite...' : 'Run Stage F2 Test Suite (75 Tests)'}
            </button>
          </div>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Multi-Day Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi-Day Match Pool</span>
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {summary ? summary.realFixturesImported : '—'} <span className="text-xs font-normal text-slate-400">Total Central Fixtures</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/60 p-2 rounded text-center">
              <span className="text-slate-400 block">Friday</span>
              <span className="font-bold text-white">{summary?.dayDistribution.friday ?? 0}</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded text-center">
              <span className="text-slate-400 block">Saturday</span>
              <span className="font-bold text-white">{summary?.dayDistribution.saturday ?? 0}</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded text-center">
              <span className="text-slate-400 block">Sunday</span>
              <span className="font-bold text-white">{summary?.dayDistribution.sunday ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Earliest Kickoff (EAT) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Earliest Kickoff (EAT)</span>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-base font-bold text-blue-400 mb-1">
            {summary?.earliestKickoffEAT || 'Pending Schedule'}
          </div>
          <div className="text-xs text-slate-400 font-mono truncate">
            UTC: {summary?.earliestKickoff ? new Date(summary.earliestKickoff).toISOString() : '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            MIN(selected fixture kickoffs)
          </div>
        </div>

        {/* Card 3: 10-Minute Lock Time */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">10-Min Auto-Lock (EAT)</span>
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-400 mb-1">
            {summary?.calculatedLockTimeEAT || 'Pending Kickoff'}
          </div>
          <div className="text-xs text-slate-400 font-mono truncate">
            UTC: {summary?.calculatedLockTime ? new Date(summary.calculatedLockTime).toISOString() : '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Strict -600s invariant enforced
          </div>
        </div>

        {/* Card 4: Safety & Financial Isolation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Invariants</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Financial Ledger Isolation:</span>
              <span className="font-bold text-emerald-400">0 Side-Effects</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Schedule Review Queue:</span>
              <span className="font-bold text-white">{summary?.scheduleReviewQueueCount ?? 0} Pending</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Lock Rule Immutability:</span>
              <span className="font-bold text-emerald-400">Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Suite Summary Banner if Available */}
      {suiteResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {suiteResults.summary.failed === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
                <h3 className="text-lg font-bold text-white">
                  Stage F2 Operational Suite: {suiteResults.summary.passed}/{suiteResults.summary.totalTests} Passed
                </h3>
              </div>
              <p className="text-slate-400 text-xs font-mono">
                Duration: {suiteResults.durationMs}ms | Executed at: {new Date(suiteResults.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    activeCategoryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Test Table */}
          <div className="mt-4 overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-2.5 px-3">Test ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTests.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-bold text-slate-300">{t.id}</td>
                    <td className="py-2 px-3 font-sans text-slate-200 font-medium">{t.name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {t.passed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> PASS ({t.actualStatus})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                          <XCircle className="w-3 h-3" /> FAIL ({t.actualStatus})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-400 text-xs">{t.details}</td>
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
