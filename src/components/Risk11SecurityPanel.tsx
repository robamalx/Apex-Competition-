import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Smartphone,
  Send,
  Database,
  Terminal,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Key,
  Laptop,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface AdversarialTestResult {
  caseNumber: number;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  verificationSource: string;
  forensicEvidence: string;
  durationMs: number;
}

export interface Risk11AdversarialReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRatePercent: number;
  allPassed: boolean;
  financialInvariant: {
    startLedgerSumCents: string;
    endLedgerSumCents: string;
    discrepancyCents: string;
    preserved: boolean;
  };
  categories: Record<string, { total: number; passed: number; failed: number }>;
  results: AdversarialTestResult[];
}

export const Risk11SecurityPanel: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Risk11AdversarialReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCases, setExpandedCases] = useState<Record<number, boolean>>({});

  const fetchLatestReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test/risk11-adversarial-suite/latest', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch Risk 11 report`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error loading Risk 11 security report');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSuite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test/risk11-adversarial-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to execute adversarial test suite`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error running adversarial test suite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const toggleCase = (num: number) => {
    setExpandedCases(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const filteredResults = (report?.results || []).filter(item => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.expected.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actual.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categories = report?.categories ? Object.keys(report.categories) : [];

  return (
    <div className="space-y-6" id="risk11-adversarial-panel">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Phase 3: Risk 11 Verification Suite</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Account Takeover & Session Security</span>
              {report?.allPassed && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ALL 50 DEFENSES VERIFIED
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Adversarial resilience matrix evaluating credential stuffing protection, cryptographic session token life cycles,
              concurrency race conditions, Telegram 1:1 binding, session isolation (IDOR), and monetary balance invariance (0 minor unit drift).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunSuite}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'RUNNING 50 SUITES...' : 'EXECUTE ADVERSARIAL SUITE'}</span>
            </button>
            <button
              onClick={fetchLatestReport}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Report"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Metrics Cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pass Rate</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${report.allPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {report.passRatePercent}%
              </span>
              <span className="text-xs text-slate-500">
                ({report.passedTests}/{report.totalTests})
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Financial Invariant</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${report.financialInvariant.preserved ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.financialInvariant.discrepancyCents}¢ Drift
              </span>
              <span className="text-xs text-slate-500">0 Minor Units</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Failed Vectors</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${report.failedTests === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.failedTests}
              </span>
              <span className="text-xs text-slate-500">of 50</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Audit Timestamp</span>
            <div className="text-xs font-mono text-slate-300 truncate pt-1.5">
              {new Date(report.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 text-xs scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400'
            }`}
          >
            All Defenses ({report?.totalTests || 0})
          </button>
          {categories.map(cat => {
            const stat = report?.categories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400'
                }`}
              >
                {cat} ({stat?.passed}/{stat?.total})
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search test name or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Test Results Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-extrabold text-xs text-white uppercase tracking-wider">
              Adversarial Test Assertions ({filteredResults.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Click any row to expand forensic evidence</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredResults.map(test => {
            const isExpanded = Boolean(expandedCases[test.caseNumber]);
            return (
              <div
                key={test.caseNumber}
                className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => toggleCase(test.caseNumber)}
              >
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {test.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          #{String(test.caseNumber).padStart(2, '0')}
                        </span>
                        <span className="font-bold text-xs text-white">{test.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {test.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{test.durationMs}ms</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{test.expected}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        test.passed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {test.passed ? 'PASS' : 'FAIL'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-12 pb-4 pt-1 space-y-2.5 text-xs bg-slate-950/40 border-t border-slate-800/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Expected Security Outcome
                        </span>
                        <p className="text-slate-300">{test.expected}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Actual Observed Result
                        </span>
                        <p className="text-emerald-300 font-mono text-[11px]">{test.actual}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Forensic Rationale & Threat Mitigation
                      </span>
                      <p className="text-slate-400 leading-relaxed">{test.forensicEvidence}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Verification Layer: {test.verificationSource}</span>
                      <span>Latency: {test.durationMs} milliseconds</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
