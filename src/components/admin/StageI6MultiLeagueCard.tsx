import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
  RefreshCw,
  Clock,
  Globe,
  Layers,
  ChevronDown,
  ChevronUp,
  Radio,
  FileCheck2,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  StageI6CTestSuiteResponse,
  StageI6CTestResult,
  StageI6CCompetitionStatus,
  User,
  FOOTBALL_DATA_COMPETITIONS,
  FOOTBALL_DATA_COMPETITION_NAMES,
  FOOTBALL_DATA_COMPETITION_COUNTRIES
} from '../../types';

interface StageI6MultiLeagueCardProps {
  currentUser?: User;
  token?: string | null;
  onFixturesUpdated?: () => void;
}

export const StageI6MultiLeagueCard: React.FC<StageI6MultiLeagueCardProps> = ({
  token,
  onFixturesUpdated
}) => {
  const [competitions, setCompetitions] = useState<StageI6CCompetitionStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<StageI6CTestSuiteResponse | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authToken = token || localStorage.getItem('auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [token]);

  const fetchStatuses = useCallback(async () => {
    setLoadingStatuses(true);
    try {
      const res = await fetch('/api/admin/fixtures/competitions-status', {
        headers: getHeaders()
      });
      if (res.ok) {
        let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response: ' + (text.substring(0, 100) || 'Empty response'));
      }
        if (Array.isArray(data.competitions)) {
          setCompetitions(data.competitions);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch competition statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleSyncCompetition = async (code: string) => {
    setSyncingCode(code);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/fixtures/import-competition', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ competitionCode: code })
      });
      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response: ' + (text.substring(0, 100) || 'Empty response'));
      }
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Successfully synced ${data.competitionName || code}: ${data.insertedCount} inserted, ${data.updatedCount} updated (${data.realFixturesReturned} authoritative matches from Football-Data.org).`
        });
        await fetchStatuses();
        if (onFixturesUpdated) onFixturesUpdated();
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Failed to sync ${code}: ${(data.errors || []).join('; ') || 'Unknown provider error'}`
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Network error syncing ${code}: ${err.message}`
      });
    } finally {
      setSyncingCode(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncFeedback({
      type: 'info',
      message: 'Syncing all 6 competitions sequentially from Football-Data.org (PL, PD, SA, BL1, FL1, CL)...'
    });
    try {
      const res = await fetch('/api/admin/fixtures/import-all', {
        method: 'POST',
        headers: getHeaders()
      });
      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response: ' + (text.substring(0, 100) || 'Empty response'));
      }
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Multi-league sync complete! Imported ${data.totalImported} new and updated ${data.totalUpdated} fixtures across all 6 competitions.`
        });
        await fetchStatuses();
        if (onFixturesUpdated) onFixturesUpdated();
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Sync partially failed: ${(data.totalErrors || []).join('; ')}`
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Network error during multi-league sync: ${err.message}`
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleRunTestSuite = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/admin/stage-i6-c/test-suite', {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response: ' + (text.substring(0, 100) || 'Empty response'));
      }
        setTestResults(data);
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Failed to execute test suite: ${err.message}`
      });
    } finally {
      setRunningTests(false);
    }
  };

  const toggleExpandTest = (id: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter test results
  const filteredTests = (testResults?.tests || []).filter(t => {
    if (activeCategoryFilter !== 'ALL' && t.category !== activeCategoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = [
    'ALL',
    'PROVIDER_ROUTING',
    'ISOLATION_NO_FALLBACK',
    'TOKEN_SECURITY',
    'REAL_DATA_INTEGRITY',
    'WEEK_CLASSIFICATION',
    'UEFA_ORGANIZATION',
    'HIERARCHICAL_VIEW',
    'TIMEZONE_CONVERSION',
    'ZERO_EXTERNAL_FILTERING',
    'DB_IDEMPOTENCY',
    'AUDIT_INTEGRITY',
    'REGRESSION_I3_I4_G1'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 mb-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  Authoritative Multi-League Pipeline & Matchday Engine
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Stage I6-C Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative Football-Data.org ingestion across all 6 major European competitions with deterministic Week / Matchday organization.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || Boolean(syncingCode)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing All 6...' : 'Sync All 6 Leagues'}
          </button>

          <button
            onClick={handleRunTestSuite}
            disabled={runningTests}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
            {runningTests ? 'Running 50 Tests...' : 'Run 50-Point I6-C Tests'}
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : syncFeedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
          }`}
        >
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : syncFeedback.type === 'error' ? (
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-indigo-400" />
          )}
          <span className="font-medium">{syncFeedback.message}</span>
        </div>
      )}

      {/* 6 Competitions Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {competitions.map(comp => {
          const isSyncingThis = syncingCode === comp.competitionCode;
          const isSynced = comp.totalFixturesInDb > 0;

          return (
            <div
              key={comp.competitionCode}
              className={`p-3.5 rounded-xl border transition-all ${
                isSynced
                  ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                  : 'bg-slate-950/40 border-slate-800/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 font-mono">
                    {comp.competitionCode} • ID {comp.leagueId}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-1">{comp.name}</h4>
                  <p className="text-[10px] text-slate-400">{comp.country}</p>
                </div>
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${
                    isSynced ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                  }`}
                  title={isSynced ? 'Synced' : 'Not Synced'}
                />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-400">Fixtures:</span>{' '}
                  <strong className="text-white font-mono">{comp.totalFixturesInDb}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Weeks:</span>{' '}
                  <strong className="text-emerald-400 font-mono">{comp.totalMatchdays}</strong>
                </div>
              </div>

              <button
                onClick={() => handleSyncCompetition(comp.competitionCode)}
                disabled={isSyncingThis || syncingAll}
                className="mt-3 w-full py-1.5 px-2 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 disabled:opacity-50 text-slate-300 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingThis ? 'animate-spin' : ''}`} />
                {isSyncingThis ? 'Syncing...' : 'Sync League'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Principles Badges */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">Strict Isolation:</strong> 0 API-Football calls
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">Deterministic:</strong> Real provider matchdays
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">Timezone:</strong> Converted to EAT (+03:00)
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">0 API Filters:</strong> Pure DB in-memory speed
          </span>
        </div>
      </div>

      {/* Test Results Section */}
      {testResults && (
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl border ${
                  testResults.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {testResults.success ? <FileCheck2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">Stage I6-C Test Suite Results</h4>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      testResults.success
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {testResults.passed} / {testResults.totalTests} PASSED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Executed in <strong className="text-slate-300">{testResults.durationMs}ms</strong> at{' '}
                  {new Date(testResults.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search tests..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map(cat => {
              const count =
                cat === 'ALL'
                  ? testResults.tests.length
                  : testResults.tests.filter(t => t.category === cat).length;
              if (count === 0 && cat !== 'ALL') return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.replace(/_/g, ' ')} ({count})
                </button>
              );
            })}
          </div>

          {/* Test Items List */}
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredTests.map(test => {
              const isExpanded = expandedTests.has(test.id);
              const isPass = test.status === 'PASS';

              return (
                <div
                  key={test.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isPass
                      ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpandTest(test.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{test.id}</span>
                          <span className="font-bold text-white">{test.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{test.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          isPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {test.status}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-900 text-[11px] font-mono text-slate-300 bg-slate-900/60 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 mb-1">
                        Category: <strong className="text-slate-300">{test.category}</strong>
                      </div>
                      <div className="text-emerald-400">{test.details}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
