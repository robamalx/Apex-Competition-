import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  Server,
  Database,
  History,
  Info,
  Clock,
  KeyRound,
  Filter
} from 'lucide-react';
import {
  StageI4GatewayDiagnostics,
  StageI4TestSuiteResponse,
  StageI4ControlledSyncResult,
  StageI4SingleLeagueVerificationResult,
  User
} from '../../types';

interface StageI4QuotaProtectionCardProps {
  currentUser: User;
}

export const StageI4QuotaProtectionCard: React.FC<StageI4QuotaProtectionCardProps> = ({ currentUser }) => {
  const [diagnostics, setDiagnostics] = useState<StageI4GatewayDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  
  // Test suite state
  const [suiteResults, setSuiteResults] = useState<StageI4TestSuiteResponse | null>(null);
  const [runningSuite, setRunningSuite] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Progressive single league state
  const [verifyingSingleLeague, setVerifyingSingleLeague] = useState(false);
  const [singleLeagueResult, setSingleLeagueResult] = useState<StageI4SingleLeagueVerificationResult | null>(null);

  // Controlled sync state
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(39);
  const [syncingLeague, setSyncingLeague] = useState(false);
  const [syncResult, setSyncResult] = useState<StageI4ControlledSyncResult | null>(null);

  // Reset circuit state
  const [resettingCircuit, setResettingCircuit] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch('/api/admin/stage-i4/diagnostics');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.diagnostics) {
          setDiagnostics(data.diagnostics);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Stage I4 diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRunSuite = async () => {
    setRunningSuite(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/stage-i4/test-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data: StageI4TestSuiteResponse = await res.json();
        setSuiteResults(data);
        setActionMessage({
          text: `Stage I4 Quota & Sync Suite completed: ${data.passed}/${data.totalTests} tests passed.`,
          type: data.success ? 'success' : 'error'
        });
      } else {
        setActionMessage({ text: 'Failed to run Stage I4 test suite.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: `Test execution error: ${err.message}`, type: 'error' });
    } finally {
      setRunningSuite(false);
      fetchDiagnostics();
    }
  };

  const handleVerifySingleLeague = async (leagueId: number = 39) => {
    setVerifyingSingleLeague(true);
    setSingleLeagueResult(null);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/stage-i4/verify-single-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId })
      });
      const data: StageI4SingleLeagueVerificationResult = await res.json();
      setSingleLeagueResult(data);
      if (data.success) {
        setActionMessage({
          text: `Progressive single-league verification for ${data.leagueName} PASSED. Multi-league synchronization is now unlocked.`,
          type: 'success'
        });
      } else {
        setActionMessage({
          text: `Verification for ${data.leagueName} completed with notices: ${data.errors.join('; ') || 'No fixtures imported'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setActionMessage({ text: `Single-league verification error: ${err.message}`, type: 'error' });
    } finally {
      setVerifyingSingleLeague(false);
      fetchDiagnostics();
    }
  };

  const handleControlledSync = async () => {
    setSyncingLeague(true);
    setSyncResult(null);
    setActionMessage(null);
    const idempotencyKey = `manual_sync_${selectedLeagueId}_${Date.now()}`;
    try {
      const res = await fetch('/api/admin/stage-i4/sync-controlled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeagueId,
          idempotencyKey
        })
      });
      const data: StageI4ControlledSyncResult = await res.json();
      setSyncResult(data);
      if (data.success) {
        setActionMessage({
          text: `Controlled sync for ${data.leagueName} completed: ${data.importedCount} imported, ${data.updatedCount} updated.`,
          type: 'success'
        });
      } else {
        setActionMessage({
          text: `Controlled sync notice for ${data.leagueName}: ${data.errors.join('; ')}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setActionMessage({ text: `Controlled sync error: ${err.message}`, type: 'error' });
    } finally {
      setSyncingLeague(false);
      fetchDiagnostics();
    }
  };

  const handleResetCircuit = async () => {
    setResettingCircuit(true);
    try {
      const res = await fetch('/api/admin/stage-i4/circuit-breaker/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setActionMessage({ text: 'Circuit breaker manually reset to CLOSED state.', type: 'success' });
      }
    } catch (err: any) {
      setActionMessage({ text: `Circuit reset failed: ${err.message}`, type: 'error' });
    } finally {
      setResettingCircuit(false);
      fetchDiagnostics();
    }
  };

  const filteredTests = suiteResults?.tests.filter(t => {
    if (categoryFilter === 'ALL') return true;
    return t.category === categoryFilter;
  });

  return (
    <div className="space-y-6" id="stage-i4-quota-container">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-cyan-500/20 text-cyan-400 text-xs font-black px-2.5 py-1 rounded-md tracking-wider uppercase border border-cyan-500/30">
                Stage I4 Authoritative
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded">
                Production API Quota Gateway & Circuit Breaker
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              API-Football Quota Protection & Controlled Synchronization
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Strict server-side isolation, hard safety budgets (75 req/day, 5 req/min), automated circuit breaking, idempotency locks, and progressive single-league validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiagnostics}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
              id="refresh-diagnostics-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleRunSuite}
              disabled={runningSuite}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow flex items-center gap-2"
              id="run-i4-suite-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {runningSuite ? 'Running 25-Point Suite...' : 'Run Stage I4 Suite (25 Tests)'}
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                : 'bg-rose-950/50 text-rose-300 border-rose-800/50'
            }`}
          >
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Real-time Status Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Circuit Breaker State */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Circuit Breaker</span>
            <Zap className={`w-4 h-4 ${diagnostics?.circuitBreaker.state === 'CLOSED' ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-lg font-black ${
                diagnostics?.circuitBreaker.state === 'CLOSED'
                  ? 'text-emerald-400'
                  : diagnostics?.circuitBreaker.state === 'HALF_OPEN'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {diagnostics?.circuitBreaker.state || 'CLOSED'}
            </span>
            <span className="text-xs text-slate-500">
              {diagnostics?.circuitBreaker.failureCount || 0}/3 failures
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {diagnostics?.circuitBreaker.tripReason || 'Healthy connection'}
          </p>
          {diagnostics?.circuitBreaker.state === 'OPEN' && currentUser.role === 'SUPER_ADMIN' && (
            <button
              onClick={handleResetCircuit}
              disabled={resettingCircuit}
              className="mt-3 w-full py-1 text-xs font-black rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 transition"
            >
              Reset Circuit to CLOSED
            </button>
          )}
        </div>

        {/* 2. Daily Quota Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Daily Safe Budget</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black text-white">
              {diagnostics?.dailyBudget.used || 0} / {diagnostics?.dailyBudget.safeLimit || 75}
            </span>
            <span className="text-xs text-slate-500">requests</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                (diagnostics?.dailyBudget.percentConsumed || 0) > 80 ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, diagnostics?.dailyBudget.percentConsumed || 0)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex justify-between">
            <span>Hard Provider Limit: 100/day</span>
            <span className="font-mono text-cyan-400">{diagnostics?.dailyBudget.remaining ?? 75} left</span>
          </p>
        </div>

        {/* 3. Per-Minute Safe Throttle */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Rate Limit Throttle</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black text-white">
              {diagnostics?.minuteBudget.used || 0} / {diagnostics?.minuteBudget.safeLimit || 5}
            </span>
            <span className="text-xs text-slate-500">req / min</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, ((diagnostics?.minuteBudget.used || 0) / (diagnostics?.minuteBudget.safeLimit || 5)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex justify-between">
            <span>Provider Limit: 10/min</span>
            <span className="font-mono text-amber-400">{diagnostics?.minuteBudget.remaining ?? 5} available</span>
          </p>
        </div>

        {/* 4. Credentials & Server Isolation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Credential Protection</span>
            <KeyRound className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400">Server-Side Only</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            API_FOOTBALL_KEY is masked in all logs, payloads, and browser network tabs.
          </p>
          <div className="mt-2 text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
            x-apisports-key: [REDACTED]
          </div>
        </div>
      </div>

      {/* PROGRESSIVE VERIFICATION & CONTROLLED SYNC SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Progressive Single-League Verification */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 text-xs font-black px-2 py-0.5 rounded">
                Step 1: Progressive Verification
              </span>
              <h3 className="text-base font-black text-white">Premier League (ID: 39) Gate</h3>
            </div>
            {diagnostics?.progressiveVerificationState.multiLeagueUnlocked ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40">
                <Unlock className="w-3.5 h-3.5" /> Multi-League Unlocked
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/40">
                <Lock className="w-3.5 h-3.5" /> Gated on Single League
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Safely test the new API key against a single, bounded request for England Premier League (39) before unlocking broader synchronization. Consumes exactly 1 request from safe budget.
          </p>

          <button
            onClick={() => handleVerifySingleLeague(39)}
            disabled={verifyingSingleLeague || diagnostics?.circuitBreaker.state === 'OPEN'}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black text-xs transition border border-cyan-500/30 flex items-center justify-center gap-2 shadow"
            id="verify-single-league-btn"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            {verifyingSingleLeague ? 'Verifying Premier League (ID 39)...' : 'Execute Single-League Verification (Premier League 39)'}
          </button>

          {singleLeagueResult && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>Result: {singleLeagueResult.leagueName}</span>
                <span className={singleLeagueResult.success ? 'text-emerald-400' : 'text-amber-400'}>
                  {singleLeagueResult.success ? 'PASSED (UNLOCKED)' : 'COMPLETED'}
                </span>
              </div>
              <div className="text-slate-400 space-y-1">
                <div>• Request: {singleLeagueResult.step1SingleLeagueRequest.details}</div>
                <div>• Schema Validated: {singleLeagueResult.step2ResponseSchemaValidated.passed ? 'YES' : 'PENDING'}</div>
                <div>• DB Persisted: {singleLeagueResult.step3DatabasePersisted.insertedCount} inserted</div>
                {singleLeagueResult.step4TraceabilityVerified.providerSyncId && (
                  <div>• Provider Sync ID: {singleLeagueResult.step4TraceabilityVerified.providerSyncId}</div>
                )}
                <div className="text-cyan-400 font-bold">• {singleLeagueResult.step5MultiLeagueUnlocked.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Controlled Manual Sync */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-400 text-xs font-black px-2 py-0.5 rounded">
                Step 2: Controlled Sync
              </span>
              <h3 className="text-base font-black text-white">Manual League Synchronization</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              5-min Cooldown / Mutex Lock
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Synchronize upcoming fixtures for a specific top European competition. Includes idempotency key deduplication and mutual exclusion locking.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Select Target Competition</label>
              <select
                value={selectedLeagueId}
                onChange={e => setSelectedLeagueId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold"
                id="select-league-sync"
              >
                <option value={39}>Premier League (England - ID 39)</option>
                <option value={140}>La Liga (Spain - ID 140)</option>
                <option value={135}>Serie A (Italy - ID 135)</option>
                <option value={78}>Bundesliga (Germany - ID 78)</option>
                <option value={61}>Ligue 1 (France - ID 61)</option>
                <option value={2}>UEFA Champions League (ID 2)</option>
              </select>
            </div>

            <button
              onClick={handleControlledSync}
              disabled={syncingLeague || diagnostics?.circuitBreaker.state === 'OPEN'}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition shadow flex items-center justify-center gap-2"
              id="controlled-sync-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingLeague ? 'animate-spin' : ''}`} />
              {syncingLeague ? 'Synchronizing Fixtures...' : `Controlled Sync League ${selectedLeagueId}`}
            </button>
          </div>

          {syncResult && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between font-bold text-slate-300">
                <span>Operation: {syncResult.operationId}</span>
                <span className={syncResult.success ? 'text-emerald-400' : 'text-amber-400'}>
                  {syncResult.success ? 'SUCCESS' : 'FINISHED'}
                </span>
              </div>
              <div className="text-slate-400">
                Imported: <span className="text-emerald-400 font-bold">{syncResult.importedCount}</span> | Updated: <span className="text-cyan-400 font-bold">{syncResult.updatedCount}</span> | Rejected: <span className="text-rose-400 font-bold">{syncResult.rejectedCount}</span>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="text-amber-400 text-xs mt-1">{syncResult.errors.join('; ')}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 25-POINT TEST SUITE RESULTS */}
      {suiteResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="stage-i4-suite-results">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-md uppercase ${
                    suiteResults.success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {suiteResults.summary.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {suiteResults.passed} / {suiteResults.totalTests} PASSED (100% Mock-Safe Quota Isolation)
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">Stage I4 Comprehensive Verification Suite</h3>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'SECURITY', 'QUOTA', 'CIRCUIT_BREAKER', 'SYNC_ENGINE', 'DATA_INTEGRITY', 'OPERATIONAL'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    categoryFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-96 overflow-y-auto pr-2">
            {filteredTests?.map(t => (
              <div
                key={t.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{t.id}</span>
                      <span className="text-xs font-black text-slate-200">{t.name}</span>
                    </div>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded flex items-center gap-1 ${
                        t.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {t.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-900 text-xs font-mono text-slate-500 truncate">
                  {t.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SANITIZED GATEWAY LOGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-black text-white">Outbound API Gateway Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Credentials Strictly Masked • Last {diagnostics?.recentGatewayLogs.length || 0} calls
          </span>
        </div>

        {diagnostics?.recentGatewayLogs && diagnostics.recentGatewayLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Endpoint</th>
                  <th className="pb-2">League</th>
                  <th className="pb-2">HTTP Status</th>
                  <th className="pb-2">Results</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Circuit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {diagnostics.recentGatewayLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-850/50">
                    <td className="py-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 text-cyan-400 font-bold">{log.endpoint}</td>
                    <td className="py-2">{log.leagueId ? `League ${log.leagueId}` : 'N/A'}</td>
                    <td className="py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          log.httpStatus >= 200 && log.httpStatus < 300
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {log.httpStatus || 'ERR'}
                      </span>
                    </td>
                    <td className="py-2 text-white font-bold">{log.resultCount} fixtures</td>
                    <td className="py-2 text-slate-400">{log.durationMs}ms</td>
                    <td className="py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          log.circuitState === 'CLOSED' ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'
                        }`}
                      >
                        {log.circuitState}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center font-mono">
            No outbound gateway requests dispatched yet. Gateway is in cold standby.
          </p>
        )}
      </div>
    </div>
  );
};
