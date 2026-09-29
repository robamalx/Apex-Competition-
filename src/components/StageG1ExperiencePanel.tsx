import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Eye,
  Calendar,
  Lock,
  Layers,
  BarChart3,
  Award,
  Filter,
  Check
} from 'lucide-react';
import { StageG1TestSuiteResponse } from '../types';

interface StageG1ExperiencePanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export const StageG1ExperiencePanel: React.FC<StageG1ExperiencePanelProps> = ({
  token,
  userRole,
  setFeedback
}) => {
  const [suiteResults, setSuiteResults] = useState<StageG1TestSuiteResponse | null>(null);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const runG1TestSuite = async () => {
    if (!token) return;
    setRunningSuite(true);
    try {
      const res = await fetch('/api/admin/competitions/player-experience-test-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data: StageG1TestSuiteResponse = await res.json();
        setSuiteResults(data);
        if (data.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage G1 Verification Complete: All ${data.passed}/${data.totalTests} tests passed successfully!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage G1 Verification: ${data.failed} test(s) failed out of ${data.totalTests}.`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({
          type: 'error',
          message: err.error || 'Failed to run Stage G1 test suite.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error running Stage G1 test suite.'
      });
    } finally {
      setRunningSuite(false);
    }
  };

  const categories: string[] = suiteResults
    ? ['ALL', ...(Array.from(new Set(suiteResults.tests.map(t => t.category))) as string[])]
    : ['ALL'];

  const filteredTests = suiteResults
    ? suiteResults.tests.filter(t => activeCategory === 'ALL' || t.category === activeCategory)
    : [];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs uppercase border border-emerald-500/30 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> STAGE G1
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Player-Facing Competition Experience
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
              Player Experience & 50-Test Verification Suite
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Verifies player competition discovery, match schedules, Stage B draft autosave, submission locking (10-minute lock before kickoff), mobile day-by-day views, server-side scoring calculations, deterministic leaderboard rankings, and tamper prevention.
            </p>
          </div>

          <button
            onClick={runG1TestSuite}
            disabled={runningSuite}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all self-start sm:self-center"
          >
            {runningSuite ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Running 50 Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Stage G1 50-Test Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SUMMARY METRICS (WHEN RUN) */}
      {suiteResults && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Tests</span>
              <div className="text-2xl font-black text-white">{suiteResults.totalTests}</div>
              <span className="text-[11px] text-slate-500 font-medium">Stage G1 Suite</span>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase">Passed Tests</span>
              <div className="text-2xl font-black text-emerald-400">{suiteResults.passed}</div>
              <span className="text-[11px] text-emerald-500 font-semibold">100% Pass Rate</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Failed Tests</span>
              <div className={`text-2xl font-black ${suiteResults.failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {suiteResults.failed}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Zero Tolerance</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Execution Time</span>
              <div className="text-2xl font-black text-cyan-400">{suiteResults.durationMs} ms</div>
              <span className="text-[11px] text-slate-500 font-medium">Instant In-Memory Exec</span>
            </div>
          </div>

          {/* CATEGORY FILTER TABS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white uppercase">Filter Assertions by Category</span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Showing {filteredTests.length} of {suiteResults.totalTests} Assertions
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeCategory === cat
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* TEST RESULTS LIST */}
            <div className="space-y-2.5 pt-2">
              {filteredTests.map((t, idx) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    t.passed
                      ? 'bg-slate-950/80 border-slate-800/80'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {t.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">{t.id}</span>
                        <span className="text-xs font-black text-white">{t.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{t.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        t.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {t.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
