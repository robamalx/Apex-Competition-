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
  Info,
  Archive,
  Radio,
  Globe
} from 'lucide-react';
import { StageI3TestSuiteResponse, StageI3TestResult } from '../types';

interface StageI3AcceptancePanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
  onRefreshData?: () => void;
}

export const StageI3AcceptancePanel: React.FC<StageI3AcceptancePanelProps> = ({
  token,
  userRole,
  setFeedback,
  onRefreshData
}) => {
  const [suiteResults, setSuiteResults] = useState<StageI3TestSuiteResponse | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [quarantining, setQuarantining] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const runAcceptanceSuite = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/security/stage-i3-acceptance-suite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: StageI3TestSuiteResponse = await res.json();
        setSuiteResults(data);
        if (data.summary.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage I3 Authoritative Migration & Ingestion Verified: ${data.passed}/${data.totalTests} tests passed!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage I3 Suite identified ${data.failed} issue(s).`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to run Stage I3 suite.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error running Stage I3 suite.' });
    } finally {
      setRunning(false);
    }
  };

  const handleQuarantine = async () => {
    const confirmed = window.confirm('Quarantine all unverified or synthetic fixtures now?');
    if (!confirmed) return;
    setQuarantining(true);
    try {
      const res = await fetch('/api/admin/fixtures/quarantine-fake-fixtures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Quarantined ${data.quarantinedCount} unverified fixtures.` });
        await runAcceptanceSuite();
        if (onRefreshData) onRefreshData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Quarantine failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setQuarantining(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/admin/fixtures/import-authoritative', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Imported ${data.importedCount} new, ${data.updatedCount} updated fixtures.`
        });
        await runAcceptanceSuite();
        if (onRefreshData) onRefreshData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Import failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    runAcceptanceSuite();
  }, []);

  const tests = suiteResults?.tests || [];
  const categories = Array.from(new Set(tests.map(t => t.category))).sort();

  const filteredTests = tests.filter(t => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'FAIL') return !t.passed;
    return t.category === categoryFilter;
  });

  const rep = suiteResults?.report;
  const summary = rep?.authoritativeSummary;

  return (
    <div className="space-y-6">
      {/* HEADER & TRIGGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-black text-white">
                Stage I3: Authoritative API-Football Ingestion & Real Fixture Database Migration
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verifies authoritative provider fixture ingestion, dynamic season resolution, strict numeric identity, database uniqueness UPSERT, and synthetic quarantine isolation.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuarantine}
              disabled={quarantining || running}
              className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 shadow"
            >
              <Archive className="w-4 h-4 text-amber-400" />
              {quarantining ? 'Quarantining...' : 'Quarantine Invalid'}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || running}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              {importing ? 'Importing...' : 'Authoritative Ingest'}
            </button>
            <button
              onClick={runAcceptanceSuite}
              disabled={running}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {running ? 'Verifying Pipeline...' : 'Run Stage I3 Suite'}
            </button>
          </div>
        </div>

        {/* METRICS / VERDICT BANNER */}
        {suiteResults && (
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">Suite Status</div>
                <div className={`text-sm font-black mt-1 ${suiteResults.summary.failed === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {suiteResults.summary.failed === 0 ? 'ALL PASSED (60/60)' : `${suiteResults.summary.failed} FAILED`}
                </div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">Provider Status</div>
                <div className="text-sm font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {rep?.apiProviderStatus.isLive ? 'LIVE CONNECTED' : 'VERIFIED FALLBACK'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">Active Pool</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {summary ? `${summary.activeProductionPoolFixtures} Matches` : '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">Verified Provider</div>
                <div className="text-sm font-bold text-cyan-400 mt-1">
                  {summary ? `${summary.verifiedApiFootballFixtures} Verified` : '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">Quarantined</div>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  {summary ? `${summary.quarantinedFixtures} Quarantined` : '—'}
                </div>
              </div>
            </div>

            {/* Authoritative Lookahead & Resolution Badge */}
            {summary && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>
                    Lookahead Window: <strong>{summary.lookaheadWindow.lookaheadDays} Days</strong> ({summary.lookaheadWindow.fromDate} to {summary.lookaheadWindow.toDate})
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Leagues: Top 5 European Leagues & UCL · Dynamic Seasonal Resolution
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${categoryFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
        >
          All Tests ({tests.length})
        </button>
        <button
          onClick={() => setCategoryFilter('FAIL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${categoryFilter === 'FAIL' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
        >
          Failures ({tests.filter(t => !t.passed).length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${categoryFilter === cat ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* TEST RESULTS LIST */}
      <div className="space-y-2">
        {filteredTests.map(test => (
          <div
            key={test.id}
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
              test.passed
                ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                : 'bg-rose-950/30 border-rose-500/60'
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {test.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-cyan-400 font-bold text-[11px]">{test.id}</span>
                  <span className="font-bold text-white">{test.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold">
                    {test.category}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{test.details}</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${test.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}>
                {test.verifiedStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
