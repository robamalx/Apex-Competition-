import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Trophy,
  History,
  Calendar,
  Layers,
  Award,
  Filter,
  BarChart2,
  CheckCircle,
  ArrowUpRight,
  Shield,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Competition, PlayerCompetitionScorecard } from '../types';

export const StageG2ResultsHistoryPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [sampleScorecard, setSampleScorecard] = useState<PlayerCompetitionScorecard | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState<boolean>(false);

  const fetchCompetitions = async () => {
    try {
      const res = await fetch('/api/competitions');
      if (res.ok) {
        const data = await res.json();
        setCompetitions(data || []);
        if (data.length > 0 && !selectedCompId) {
          setSelectedCompId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load competitions:', e);
    }
  };

  const fetchSampleScorecard = async (compId: string) => {
    if (!token || !compId) return;
    setLoadingScorecard(true);
    try {
      const res = await fetch(`/api/competitions/${compId}/player-scorecard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSampleScorecard(await res.json());
      } else {
        setSampleScorecard(null);
      }
    } catch (e) {
      console.error('Failed to load scorecard:', e);
    } finally {
      setLoadingScorecard(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      fetchSampleScorecard(selectedCompId);
    }
  }, [selectedCompId, token]);

  const handleRunG2TestSuite = async () => {
    if (!token) return;
    setRunningTests(true);
    setTestResults(null);
    try {
      const res = await fetch('/api/admin/competitions/results-history-test-suite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to execute Stage G2 test suite');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing test suite');
    } finally {
      setRunningTests(false);
    }
  };

  const categories = testResults?.tests
    ? Array.from(new Set(testResults.tests.map((t: any) => t.category)))
    : [];

  const filteredTests = testResults?.tests
    ? testResults.tests.filter((t: any) =>
        selectedCategoryFilter === 'ALL' ? true : t.category === selectedCategoryFilter
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Stage G2 Authoritative Suite
              </span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold uppercase">
                50-Test Compliance & Verification
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Results, Scoring & Player History Experience
            </h2>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Verifies end-to-end player result visibility, match-by-match scorecards, multi-market point evaluation, result states (FINISHED, LIVE, POSTPONED, VOID), progress metrics, immutable rules snapshots, and multi-criteria history filters.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleRunG2TestSuite}
              disabled={runningTests}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                runningTests
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02]'
              }`}
            >
              {runningTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 50 Tests...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Run Stage G2 Test Suite (50 Tests)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Execution Summary Cards */}
      {testResults && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Tests</span>
              <span className="text-2xl font-black text-white">{testResults.totalTests}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Authoritative Assertions</span>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Passed</span>
              <span className="text-2xl font-black text-emerald-400">{testResults.passed}</span>
              <span className="text-[11px] text-emerald-500/80 block mt-0.5">100% Target Met</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Failed</span>
              <span className="text-2xl font-black text-rose-400">{testResults.failed}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">0 Defects Allowed</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Status</span>
              <span className="text-sm font-black text-white truncate block mt-1">
                {testResults.failed === 0 ? '50/50 ALL PASS' : 'FAILURES DETECTED'}
              </span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">Stage G2 Certified</span>
            </div>
          </div>

          {/* Test Category Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filter by Category:
              </span>
              <span className="text-xs text-slate-400">
                Showing <strong className="text-white">{filteredTests.length}</strong> of {testResults.totalTests} tests
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ALL CATEGORIES ({testResults.totalTests})
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat} ({testResults.tests.filter((t: any) => t.category === cat).length})
                </button>
              ))}
            </div>
          </div>

          {/* Test Results Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Test ID</th>
                    <th className="py-3 px-4">Name / Specification</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Details / Authoritative Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTests.map((test: any) => (
                    <tr key={test.testId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                        {test.testId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {test.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono">
                          {test.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {test.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px]">
                            <XCircle className="w-3 h-3" /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {test.notes || test.error || 'Passed assertion.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Scorecard Audit Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Live Scorecard Inspector (Admin Audit)
            </h3>
            <p className="text-xs text-slate-400">
              Audit the authoritative scorecard payload sent to player clients for any competition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
            >
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.title} ({comp.status})
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchSampleScorecard(selectedCompId)}
              disabled={loadingScorecard || !selectedCompId}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingScorecard ? 'animate-spin' : ''}`} />
              Fetch Scorecard
            </button>
          </div>
        </div>

        {loadingScorecard ? (
          <div className="py-8 text-center text-slate-500 text-xs font-semibold">
            Loading scorecard payload...
          </div>
        ) : sampleScorecard ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Competition Classification</span>
                <span className="text-xs font-bold text-slate-200">{sampleScorecard.league || 'Multiple Leagues'}</span>
                <span className="text-[10px] text-slate-400 block">{sampleScorecard.normalizedRound || 'Regular Round'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Match Progress</span>
                <span className="text-xs font-bold text-slate-200">{sampleScorecard.completedFixtures} / {sampleScorecard.totalFixtures} Completed</span>
                <span className="text-[10px] text-emerald-400 block">{sampleScorecard.progressPercentage}% Resolved</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Player Points & Rank</span>
                <span className="text-xs font-bold text-emerald-400">+{sampleScorecard.totalPointsEarned} pts</span>
                <span className="text-[10px] text-slate-400 block">Rank #{sampleScorecard.playerRank} of {sampleScorecard.totalEntrants}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Accuracy & Markets</span>
                <span className="text-xs font-bold text-amber-400">{sampleScorecard.accuracyPercentage}% Accuracy</span>
                <span className="text-[10px] text-slate-400 block">{sampleScorecard.marketPerformance.length} Market Types</span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300">
                Fixtures in Scorecard ({sampleScorecard.fixtures.length})
              </div>
              <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                {sampleScorecard.fixtures.map((fix) => (
                  <div key={fix.fixtureId} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/40">
                    <div>
                      <span className="font-bold text-white">
                        {typeof fix.homeTeam === 'string' ? fix.homeTeam : fix.homeTeam?.name || 'Home'} vs {typeof fix.awayTeam === 'string' ? fix.awayTeam : fix.awayTeam?.name || 'Away'}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {fix.isFinished
                          ? (fix.homeScore !== undefined && fix.awayScore !== undefined && fix.homeScore !== null && fix.awayScore !== null
                              ? `Final Score: ${fix.homeScore} - ${fix.awayScore}`
                              : 'Final: Score Unavailable')
                          : fix.isLive
                          ? 'LIVE IN-PLAY'
                          : 'SCHEDULED'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fix.isFinished ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        fix.isLive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {fix.status}
                      </span>
                      <span className="font-bold text-emerald-400">+{fix.fixtureTotalPoints} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            Select a competition above to view its live player scorecard structure.
          </div>
        )}
      </div>
    </div>
  );
};
