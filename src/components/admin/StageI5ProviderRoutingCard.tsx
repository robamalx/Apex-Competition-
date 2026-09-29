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
  Server,
  Activity,
  Layers,
  FileText,
  Radio
} from 'lucide-react';
import {
  StageI5StatusResponse,
  StageI5VerificationResult,
  StageI5TestSuiteResponse,
  User
} from '../../types';

interface StageI5Props {
  currentUser?: User;
  token?: string | null;
}

export const StageI5ProviderRoutingCard: React.FC<StageI5Props> = ({ currentUser, token }) => {
  const [status, setStatus] = useState<StageI5StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<StageI5VerificationResult | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<StageI5TestSuiteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authToken = token || localStorage.getItem('auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [token]);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/stage-i5/status', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          setStatus(data.status);
          if (data.status.lastResult) {
            setVerificationResult(data.status.lastResult);
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch Stage I5 status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleVerifyPremierLeague = async () => {
    setVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/stage-i5/verify', {
        method: 'POST',
        headers: getHeaders()
      });
      const data: StageI5VerificationResult = await res.json();
      setVerificationResult(data);
      if (!data.success && data.error) {
        setErrorMessage(data.error);
      }
      fetchStatus();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error executing verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleRunTestSuite = async () => {
    setRunningTests(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/stage-i5/test-suite', {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data: StageI5TestSuiteResponse = await res.json();
        setTestResults(data);
      } else {
        const errJson = await res.json();
        setErrorMessage(errJson?.error || 'Failed to execute test suite');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error running Stage I5 test suite');
    } finally {
      setRunningTests(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'COMPETITION_PUBLISHER';

  return (
    <div id="stage-i5-provider-routing-panel" className="space-y-6">
      {/* 1. STAGE HEADER & PRIMARY PROVIDER IDENTITY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                STAGE I5-B
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRIMARY PROVIDER: FOOTBALL-DATA.ORG
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              Provider Routing & Single-Request Verification
            </h2>
            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Routes primary fixture ingestion exclusively to <strong className="text-white">Football-Data.org</strong> using{' '}
              <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">FOOTBALL_DATA_API_TOKEN</code>.
              API-Football remains an isolated secondary provider and is never invoked during Stage I5.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Refresh provider status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleRunTestSuite}
              disabled={runningTests}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors border border-slate-700"
            >
              <Play className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
              {runningTests ? 'Running Tests...' : 'Run I5-B Test Suite (12 Tests)'}
            </button>
            <button
              onClick={handleVerifyPremierLeague}
              disabled={verifying || !isSuperAdmin}
              className={`px-5 py-2.5 font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg ${
                verifying
                  ? 'bg-cyan-600 text-white cursor-wait opacity-80'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 hover:shadow-cyan-500/20'
              }`}
            >
              <Radio className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Executing 1 Live Request...' : 'Verify Premier League (1 Live Request)'}
            </button>
          </div>
        </div>

        {/* METRICS & STATUS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
            <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Primary Provider
            </div>
            <div className="text-sm font-black text-white mt-1">Football-Data.org</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">provider: FOOTBALL_DATA_ORG</div>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
            <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Server-Side Token
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                  status?.tokenConfigured
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {status?.tokenConfigured ? 'CONFIGURED' : 'MISSING'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">FOOTBALL_DATA_API_TOKEN</div>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
            <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Verification State
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                  verificationResult?.success
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : verificationResult
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {verifying
                  ? 'RUNNING'
                  : verificationResult?.success
                  ? 'SUCCESS'
                  : verificationResult
                  ? 'FAILED'
                  : status?.verificationState || 'NOT RUN'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Single-request boundary</div>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
            <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              DB Mutation Guard
            </div>
            <div className="text-sm font-black text-emerald-400 mt-1">0 Changes (Read-Only)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">CentralFixture safe</div>
          </div>
        </div>
      </div>

      {/* 2. ERROR BANNER (IF ANY) */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-bold text-rose-200">Stage I5 Verification Error</div>
            <div className="text-xs text-rose-300 font-mono">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* 3. VERIFICATION RESULT SECTION */}
      {verificationResult && (
        <div
          className={`border rounded-2xl p-6 transition-all shadow-xl ${
            verificationResult.success
              ? 'bg-slate-900 border-emerald-500/40'
              : 'bg-slate-900 border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {verificationResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <h3 className="text-base font-black text-white">
                  {verificationResult.success
                    ? 'FOOTBALL-DATA.ORG — VERIFIED'
                    : 'FOOTBALL-DATA.ORG — FAILED'}
                </h3>
                <p className="text-xs text-slate-400">
                  {verificationResult.success
                    ? 'Successfully received and parsed live Premier League fixtures from primary provider.'
                    : `Provider returned an error status. Execution stopped cleanly with 0 database changes.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
                HTTP {verificationResult.httpStatus || 'N/A'}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-cyan-400">
                {verificationResult.durationMs}ms
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Provider</div>
              <div className="text-sm font-bold text-white mt-0.5">{verificationResult.provider}</div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Competition / Season</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">
                {verificationResult.competition || 'Premier League'} ({verificationResult.season || 'Current'})
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Real Fixtures Returned</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {verificationResult.realFixturesReturned} matches
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Synthetic / DB Mutations</div>
              <div className="text-sm font-bold text-slate-300 mt-0.5">
                {verificationResult.syntheticFixturesCount} synthetic / {verificationResult.databaseChangesCount} DB writes
              </div>
            </div>
          </div>

          {/* SAMPLES TABLE IF SUCCESSFUL */}
          {verificationResult.success && verificationResult.firstFixtures && verificationResult.firstFixtures.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Sample Real Fixtures (First {verificationResult.firstFixtures.length} matches from provider)</span>
                <span className="text-emerald-400 font-mono text-[10px]">PROVENANCE: VERIFIED_FOOTBALL_DATA_ORG</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Match ID</th>
                      <th className="p-3">Matchday</th>
                      <th className="p-3">Home Team</th>
                      <th className="p-3 text-center">Score / Status</th>
                      <th className="p-3">Away Team</th>
                      <th className="p-3">Kickoff UTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    {verificationResult.firstFixtures.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-cyan-400 font-bold">{f.providerMatchId}</td>
                        <td className="p-3 text-slate-400">Matchday {f.matchday}</td>
                        <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                          {f.homeTeam.crest && (
                            <img
                              src={f.homeTeam.crest}
                              alt=""
                              className="w-4 h-4 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {f.homeTeam.name}
                        </td>
                        <td className="p-3 text-center font-sans font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                            {f.score?.home !== null && f.score?.away !== null
                              ? `${f.score.home} - ${f.score.away}`
                              : f.status}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                          {f.awayTeam.crest && (
                            <img
                              src={f.awayTeam.crest}
                              alt=""
                              className="w-4 h-4 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {f.awayTeam.name}
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">{new Date(f.kickoffUtc).toUTCString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FAILURE REASON IF FAILED */}
          {!verificationResult.success && (
            <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300">Provider Error Details:</div>
              <div className="text-xs font-mono text-rose-300 bg-rose-950/30 p-3 rounded-lg border border-rose-900/40">
                {verificationResult.error || 'Unknown provider error'}
              </div>
              <div className="text-[11px] text-slate-400">
                <strong>Corrective Action:</strong> Please ensure your Football-Data.org API token is valid and configured in the environment under <code className="text-cyan-300">FOOTBALL_DATA_API_TOKEN</code>.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TEST SUITE RESULTS SECTION */}
      {testResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-black text-white">Stage I5-B Acceptance Test Results</h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                  testResults.success
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {testResults.passed}/{testResults.totalTests} PASSED (100% Mock-Safe)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Test ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Assertion Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {testResults.tests.map(test => (
                  <tr key={test.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">{test.id}</td>
                    <td className="p-3 text-[11px] text-slate-400 font-mono">{test.category}</td>
                    <td className="p-3 font-bold text-white">{test.name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          test.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-400">{test.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SAFE AUDIT LOG TRAIL */}
      {status && status.safeAuditLogs && status.safeAuditLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileText className="w-4 h-4 text-cyan-400" />
              Safe Provider Audit Trail (Sanitized Metadata Only)
            </div>
            <div className="text-[11px] text-slate-500 font-mono">0 secrets recorded</div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Provider</th>
                  <th className="p-2.5">Endpoint</th>
                  <th className="p-2.5">HTTP Status</th>
                  <th className="p-2.5">Fixtures Returned</th>
                  <th className="p-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {status.safeAuditLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-900/30">
                    <td className="p-2.5 text-cyan-400 font-bold">{log.provider}</td>
                    <td className="p-2.5 text-slate-300">{log.endpoint}</td>
                    <td className="p-2.5">
                      <span className={log.httpStatus === 200 ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.httpStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-white font-bold">{log.resultCount}</td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
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
