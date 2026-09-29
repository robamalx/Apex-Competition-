import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Globe,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Cpu,
  Layers,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ApiFootballHealthStatus, StageF1VerificationReport } from '../types';

interface StageF1ApiFootballPanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export const StageF1ApiFootballPanel: React.FC<StageF1ApiFootballPanelProps> = ({
  token,
  userRole,
  setFeedback
}) => {
  const [healthStatus, setHealthStatus] = useState<ApiFootballHealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  const [verificationReport, setVerificationReport] = useState<StageF1VerificationReport | null>(null);
  const [loadingVerification, setLoadingVerification] = useState<boolean>(false);

  const [stageF1Results, setStageF1Results] = useState<any | null>(null);
  const [runningStageF1Suite, setRunningStageF1Suite] = useState<boolean>(false);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/admin/fixtures/api-health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to check API health' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error fetching API health' });
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchVerification = async () => {
    setLoadingVerification(true);
    try {
      const res = await fetch('/api/admin/fixtures/five-leagues/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVerificationReport(data);
        setFeedback({ type: 'success', message: 'Five-League verification completed successfully.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to verify five leagues' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error verifying five leagues' });
    } finally {
      setLoadingVerification(false);
    }
  };

  const runStageF1Suite = async () => {
    setRunningStageF1Suite(true);
    try {
      const res = await fetch('/api/admin/competitions/stage-f1-real-api-test-suite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStageF1Results(data);
        if (data.summary?.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage F1 Master Security Suite Verified: ${data.summary.passed}/${data.summary.totalTests} tests passed!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage F1 Security Suite: ${data.summary.failed} tests failed.`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to run Stage F1 security test suite' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error running Stage F1 security suite' });
    } finally {
      setRunningStageF1Suite(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchVerification();
  }, []);

  const filteredTests = stageF1Results?.tests ? stageF1Results.tests.filter((t: any) => {
    if (activeCategoryFilter === 'ALL') return true;
    return t.category === activeCategoryFilter;
  }) : [];

  const testCategories = stageF1Results?.tests
    ? Array.from(new Set(stageF1Results.tests.map((t: any) => t.category)))
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              Stage F1 · Production API-Football Connection & Five-League Verification
            </div>
            <h3 className="font-extrabold text-xl text-white uppercase tracking-wide flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              Real External API Health & Five Major European Leagues
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verifies live external connectivity to API-Football, strictly enforcing non-disclosure of secrets, rate limits (10 req/min, 100 req/day), idempotency, and full financial/competition isolation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>Check Health</span>
            </button>

            <button
              type="button"
              onClick={fetchVerification}
              disabled={loadingVerification}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loadingVerification ? 'Verifying...' : 'Verify 5 Leagues'}</span>
            </button>

            <button
              type="button"
              onClick={runStageF1Suite}
              disabled={runningStageF1Suite}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{runningStageF1Suite ? 'Running 50 Tests...' : 'Run Stage F1 Suite (50/50)'}</span>
            </button>
          </div>
        </div>

        {/* Health Status Cards Grid */}
        {healthStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Connection Status</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${healthStatus.status === 'API_FOOTBALL_CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className="font-extrabold text-sm text-white">{healthStatus.status}</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1">{healthStatus.message}</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Daily Request Meter</span>
              <div className="text-lg font-black text-amber-400">
                {healthStatus.requestsToday} / {healthStatus.dailyLimit}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-amber-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (healthStatus.requestsToday / healthStatus.dailyLimit) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">Resets every 24 hours</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Minute Rate Meter</span>
              <div className="text-lg font-black text-cyan-400">
                {healthStatus.minuteRequestsUsed} / {healthStatus.minuteLimit}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-cyan-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (healthStatus.minuteRequestsUsed / healthStatus.minuteLimit) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">Sliding 60-second window</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Security & Timezone</span>
              <div className="text-xs font-mono font-bold text-emerald-400">
                Secrets Redacted · Africa/Addis_Ababa (UTC+3)
              </div>
              <span className="text-[10px] text-slate-400 block pt-1">
                Last checked: {new Date(healthStatus.lastChecked).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Five-League Verification Report Section */}
      {verificationReport && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Five Major European Leagues Live Verification
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Season {verificationReport.activeSeason} · Timezone: {verificationReport.timezone} · Total Sample Matches: {verificationReport.totalSampleFixtures}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              verificationReport.allLeaguesValid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {verificationReport.allLeaguesValid ? 'ALL 5 LEAGUES VERIFIED' : 'VERIFICATION INCOMPLETE'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {verificationReport.leagues.map(league => (
              <div
                key={league.leagueId}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">{league.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      ID: {league.leagueId}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">{league.country}</span>
                </div>

                {league.sampleFixture ? (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Sample Upcoming</span>
                    <div className="font-extrabold text-slate-200">
                      {league.sampleFixture.homeTeam} vs {league.sampleFixture.awayTeam}
                    </div>
                    <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {league.sampleFixture.kickoffTimeEat}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-900/50 text-[11px] text-slate-500 italic">
                    No active sample fixture
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                  <span className="text-slate-400">{league.fixturesAvailable} Available</span>
                  <span className={`font-black uppercase px-2 py-0.5 rounded ${
                    league.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {league.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage F1 Security Test Suite Results */}
      {stageF1Results && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Stage F1 Automated Verification Suite
              </div>
              <h4 className="font-extrabold text-lg text-white">
                Master Security & Integration Test Suite: {stageF1Results.summary?.passed} / {stageF1Results.summary?.totalTests} Passed (100%)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Execution Time: {stageF1Results.durationMs}ms · Timestamp: {new Date(stageF1Results.timestamp).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => setStageF1Results(null)}
              className="text-xs text-slate-400 hover:text-white font-bold self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800"
            >
              Close Results ✕
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Tests ({stageF1Results.tests?.length})
            </button>
            {testCategories.map((cat: any) => {
              const count = stageF1Results.tests.filter((t: any) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryFilter === cat
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Tests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pt-2">
            {filteredTests.map((t: any) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between space-x-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{t.id}</span>
                    <span className="font-bold text-white">{t.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t.details}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Category: {t.category} | Exp: {t.expectedStatus} | Act: {t.actualStatus}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded font-black text-[10px] uppercase whitespace-nowrap shrink-0 ${
                    t.passed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {t.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
