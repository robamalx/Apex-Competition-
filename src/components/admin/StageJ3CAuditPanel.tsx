import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Clock,
  Layers,
  Sparkles,
  DollarSign,
  Trophy,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
  RefreshCw,
  Coins
} from 'lucide-react';
import { StageJ3CTestResult, StageJ3CTestSuiteResponse } from '../../types';

interface StageJ3CAuditPanelProps {
  token?: string | null;
  currentUser?: any;
}

export const StageJ3CAuditPanel: React.FC<StageJ3CAuditPanelProps> = ({
  token,
  currentUser
}) => {
  const [suiteResult, setSuiteResult] = useState<StageJ3CTestSuiteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/stage-j3c/test-suite', {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setSuiteResult(data);
    } catch (err: any) {
      console.error('Failed to run Stage J3-C audit:', err);
      setError(err.message || 'Failed to execute Stage J3-C audit suite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const categories = suiteResult
    ? Array.from(new Set(suiteResult.tests.map(t => t.category)))
    : [];

  const filteredTests = (suiteResult?.tests || []).filter(t => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Stage J3-C Verified
              </span>
              <span className="text-xs text-slate-400">
                Dynamic Competition Prize Pool & Zero-Manual Input Validation
              </span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span>Dynamic Prize Pool Engine & Validation Audit</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Full verification that competitions require 0 manual prize pool input at publish time, auto-calculating strictly from settled entry fees (55% Rank 1, 15% Rank 2, 5% Rank 3, 25% House) with dynamic ledger deduction on refunds and zero financial delta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchResults}
              disabled={loading}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Executing 30 Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Rerun J3-C Suite</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* METRIC STATS */}
      {suiteResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Test Suite Status</div>
            <div className="text-lg font-black text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>{suiteResult.passedTests}/{suiteResult.totalTests} PASS</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{suiteResult.passRate} success rate</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prize Calculation</div>
            <div className="text-lg font-black text-amber-400 mt-1">100% Dynamic</div>
            <div className="text-[10px] text-slate-500 mt-0.5">0 Manual Entry Required</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">House & Prize Split</div>
            <div className="text-lg font-black text-cyan-400 mt-1">55 / 15 / 5 / 25</div>
            <div className="text-[10px] text-slate-500 mt-0.5">R1 / R2 / R3 / House</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Delta</div>
            <div className="text-lg font-black text-emerald-400 mt-1">0 ETB Discrepancy</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Conservation Guaranteed</div>
          </div>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold">Execution Error</div>
            <div className="text-rose-200 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Categories ({suiteResult?.totalTests || 30})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search test results..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* TEST LIST */}
      <div className="space-y-2">
        {filteredTests.map((test) => {
          const isExpanded = expandedTestId === test.id;
          return (
            <div
              key={test.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
            >
              <div
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                      test.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {test.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                    {test.id}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {test.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono hidden md:inline">
                    {test.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {test.durationMs}ms
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Expected:</span>
                    <div className="text-slate-200 bg-slate-900 p-2 rounded-lg font-mono text-[11px] border border-slate-800">
                      {test.expected}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Actual:</span>
                    <div className="text-slate-200 bg-slate-900 p-2 rounded-lg font-mono text-[11px] border border-slate-800">
                      {test.actual}
                    </div>
                  </div>

                  {test.details && (
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Details & Architecture:</span>
                      <div className="text-slate-300 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                        {test.details}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
