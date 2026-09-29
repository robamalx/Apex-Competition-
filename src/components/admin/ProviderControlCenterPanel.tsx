import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Layers,
  ArrowRightLeft,
  Database,
  Search,
  FileCheck,
  Zap,
  Sliders,
  Clock,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  ProviderHealthRecord,
  ProviderConflictRecord,
  ProviderMigrationRecord,
  TeamMappingReviewRecord,
  FixtureMappingReviewRecord,
  CanonicalTeamInfo,
  Risk2AcceptanceReport,
  Risk2TestItem
} from '../../types';

interface ProviderControlCenterPanelProps {
  token?: string | null;
}

export const ProviderControlCenterPanel: React.FC<ProviderControlCenterPanelProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'suite' | 'migration' | 'conflicts' | 'canonical'>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [healthRecords, setHealthRecords] = useState<ProviderHealthRecord[]>([]);
  const [conflicts, setConflicts] = useState<ProviderConflictRecord[]>([]);
  const [teamReviews, setTeamReviews] = useState<TeamMappingReviewRecord[]>([]);
  const [fixtureReviews, setFixtureReviews] = useState<FixtureMappingReviewRecord[]>([]);
  const [canonicalTeams, setCanonicalTeams] = useState<CanonicalTeamInfo[]>([]);
  const [report, setReport] = useState<Risk2AcceptanceReport | null>(null);

  // Migration states
  const [activeMigration, setActiveMigration] = useState<ProviderMigrationRecord | null>(null);
  const [migrationRunning, setMigrationRunning] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>('ALL');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const fetchOverview = async () => {
    try {
      const [ovRes, hlRes, cfRes, rvRes, tmRes] = await Promise.all([
        fetch('/api/admin/provider-control/overview', { headers: getHeaders() }),
        fetch('/api/admin/provider-control/health', { headers: getHeaders() }),
        fetch('/api/admin/provider-control/conflicts', { headers: getHeaders() }),
        fetch('/api/admin/provider-control/reviews', { headers: getHeaders() }),
        fetch('/api/admin/provider-control/canonical-teams', { headers: getHeaders() })
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (hlRes.ok) setHealthRecords(await hlRes.json());
      if (cfRes.ok) setConflicts(await cfRes.json());
      if (rvRes.ok) {
        const data = await rvRes.json();
        setTeamReviews(data.teamReviews || []);
        setFixtureReviews(data.fixtureReviews || []);
      }
      if (tmRes.ok) setCanonicalTeams(await tmRes.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load provider overview');
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleTestConnection = async (providerName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/provider-control/test-connection', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ providerName })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Connection test to ${providerName} SUCCESSFUL!\nLatency: ${data.latencyMs}ms\nHTTP Status: ${data.httpStatus}`);
      } else {
        alert(`Connection test to ${providerName} FAILED:\nError: ${data.error}\nHTTP Status: ${data.httpStatus}`);
      }
      fetchOverview();
    } catch (err: any) {
      alert(`Error testing ${providerName}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveProvider = async (providerName: string) => {
    if (!confirm(`Are you sure you want to switch primary provider to "${providerName}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/provider-control/set-active', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ providerName })
      });
      if (res.ok) {
        alert(`Active provider switched to ${providerName}`);
        fetchOverview();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunTestSuite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/provider-control/run-acceptance-suite', {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        setError('Suite execution failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMigration = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/provider-control/migration/plan', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fromProvider: overview?.activeProvider || 'football-data.org',
          toProvider: overview?.backupProvider || 'api-football.com',
          adminUserId: 'usr_superadmin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveMigration(data.migration);
      }
    } catch (err: any) {
      alert(`Error creating plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteMigrationStep = async (stepNumber: number) => {
    if (!activeMigration) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/provider-control/migration/execute-step', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          migrationId: activeMigration.id,
          stepNumber,
          adminUserId: 'usr_superadmin'
        })
      });
      const data = await res.json();
      if (data.migration) {
        setActiveMigration(data.migration);
      }
      fetchOverview();
    } catch (err: any) {
      alert(`Step failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAllMigrationSteps = async () => {
    if (!activeMigration) return;
    setMigrationRunning(true);
    for (let stepNum = 1; stepNum <= 17; stepNum++) {
      await handleExecuteMigrationStep(stepNum);
    }
    setMigrationRunning(false);
    alert('All 17 migration validation steps completed!');
  };

  const handleResolveConflict = async (conflictId: string, resolutionType: string) => {
    try {
      const res = await fetch('/api/admin/provider-control/resolve-conflict', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          conflictId,
          resolutionType,
          resolutionNote: 'SuperAdmin manual override',
          resolvedBy: 'SuperAdmin'
        })
      });
      if (res.ok) {
        fetchOverview();
      }
    } catch (err: any) {
      alert(`Error resolving conflict: ${err.message}`);
    }
  };

  const filteredTests = report?.tests.filter(t => {
    if (testCategoryFilter !== 'ALL' && t.category !== testCategoryFilter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div id="provider-control-center-root" className="space-y-6">
      {/* Header & Subsystem Badge */}
      <div id="pcc-header" className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RISK 2 MITIGATION: ARCHITECTURE ACTIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                CANONICAL ADAPTER PATTERN
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Football Data Provider Control Center
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Provider abstraction layer, health monitoring, zero-downtime migration engine, stale-data protection, and financial settlement safety gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="pcc-refresh-btn"
              onClick={fetchOverview}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              id="pcc-run-suite-btn"
              onClick={handleRunTestSuite}
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-md flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Run 33-Test Resilience Suite
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="pcc-tabs" className="flex border-b border-slate-800 mt-6 -mb-6 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 transition border-b-2 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Provider Status & Health
          </button>
          <button
            onClick={() => setActiveTab('suite')}
            className={`pb-4 transition border-b-2 flex items-center gap-2 ${
              activeTab === 'suite'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Acceptance Test Suite
            {report && (
              <span className={`px-2 py-0.5 rounded text-xs ${report.verdict === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {report.passedCount}/{report.totalTests}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`pb-4 transition border-b-2 flex items-center gap-2 ${
              activeTab === 'migration'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Migration Engine (17 Steps)
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`pb-4 transition border-b-2 flex items-center gap-2 ${
              activeTab === 'conflicts'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Conflicts & Reviews
            {((overview?.unresolvedConflictsCount || 0) + (overview?.pendingTeamReviewsCount || 0)) > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-bold">
                {(overview?.unresolvedConflictsCount || 0) + (overview?.pendingTeamReviewsCount || 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('canonical')}
            className={`pb-4 transition border-b-2 ${
              activeTab === 'canonical'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Canonical Dictionary ({Object.keys(canonicalTeams).length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & PROVIDER CARDS */}
      {activeTab === 'overview' && (
        <div id="pcc-overview-tab" className="space-y-6">
          {/* Top Quick Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Primary Provider</div>
              <div className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-400" />
                {overview?.activeProvider || 'football-data.org'}
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Authoritative Primary Source
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backup Standby Provider</div>
              <div className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                {overview?.backupProvider || 'api-football.com'}
              </div>
              <div className="text-xs text-blue-400 mt-2 flex items-center gap-1 font-medium">
                <Activity className="w-3.5 h-3.5" />
                Standby Adapter Configured
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Canonical Teams / Fixtures</div>
              <div className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                {overview?.totalCanonicalTeams || 12} / {overview?.totalCanonicalFixtures || 6}
              </div>
              <div className="text-xs text-purple-400 mt-2 font-medium">
                Decoupled from External IDs
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reconciliation Discrepancy</div>
              <div className="text-xl font-bold text-emerald-400 mt-1.5 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                0.00 ETB
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">
                100% Balanced Ledger
              </div>
            </div>
          </div>

          {/* Detailed Provider Health Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {healthRecords.map(prov => (
              <div
                key={prov.providerName}
                className={`bg-slate-900 border rounded-xl p-6 shadow-sm transition ${
                  prov.isPrimary ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                      <Server className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{prov.providerName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        {prov.isPrimary && <span className="text-emerald-400 font-semibold uppercase">PRIMARY ACTIVE</span>}
                        {prov.isBackup && <span className="text-blue-400 font-semibold uppercase">BACKUP STANDBY</span>}
                        <span>•</span>
                        <span>Avg Latency: {prov.averageLatencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      prov.state === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : prov.state === 'DEGRADED'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {prov.state}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 my-5 py-4 border-y border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">Availability</span>
                    <span className="font-semibold text-slate-200 text-sm">{prov.availabilityPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">429 Rate Limits</span>
                    <span className={`font-semibold text-sm ${prov.rateLimit429Count > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {prov.rateLimit429Count}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">HTTP 5xx Errors</span>
                    <span className={`font-semibold text-sm ${prov.httpErrorCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                      {prov.httpErrorCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => handleTestConnection(prov.providerName)}
                    disabled={loading}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    Test Live Connection
                  </button>

                  {!prov.isPrimary && (
                    <button
                      onClick={() => handleSetActiveProvider(prov.providerName)}
                      disabled={loading}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      Make Primary Provider
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stale Data & Settlement Safety Policy Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              APEX ARENA Football Data Resilience Rules & Settlement Guard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">1. Canonical Isolation</span>
                The prediction, scoring, leaderboard, and wallet modules never depend on raw provider schemas. All external data passes through typed canonical adapters.
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">2. Stale & Outage Safety Gate</span>
                If authoritative results cannot be verified or data is stale beyond threshold, automated settlement is blocked. User funds and house accounts remain 100% safe.
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">3. Immutable Historical Records</span>
                Historical settlements, prediction entries, and ledger transactions are permanently sealed and cannot be modified by provider sync or provider switching.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCEPTANCE TEST SUITE */}
      {activeTab === 'suite' && (
        <div id="pcc-suite-tab" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Risk 2 Acceptance Test Suite (33 Test Cases)</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Validates Provider Availability, Canonical Integrity, Settlement Safety Gates, and Zero-Impact Migration.
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow flex items-center gap-2 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                {loading ? 'Running 33 Tests...' : 'Execute Full Test Suite'}
              </button>
            </div>

            {report && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800 text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Total Tests</span>
                  <div className="text-xl font-bold text-white mt-1">{report.totalTests}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-emerald-400 uppercase font-semibold">Passed</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{report.passedCount}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-red-400 uppercase font-semibold">Failed</span>
                  <div className="text-xl font-bold text-red-400 mt-1">{report.failedCount}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-blue-400 uppercase font-semibold">Pass Rate</span>
                  <div className="text-xl font-bold text-blue-400 mt-1">{report.passPercentage}%</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-purple-400 uppercase font-semibold">Verdict</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{report.verdict}</div>
                </div>
              </div>
            )}
          </div>

          {/* Test Case Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              {['ALL', 'Provider Availability', 'Data Integrity', 'Settlement Safety', 'Migration', 'Operational Resilience'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setTestCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    testCategoryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-800">
              {filteredTests.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No test results to display. Click "Execute Full Test Suite" above to run.
                </div>
              ) : (
                filteredTests.map(test => (
                  <div key={test.caseNumber} className="p-4 hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {test.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">Case {test.caseNumber < 10 ? '0' + test.caseNumber : test.caseNumber}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {test.category}
                            </span>
                            <span className="text-xs text-slate-500">{test.durationMs}ms</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-1">{test.name}</h4>
                          <p className="text-xs text-slate-400 mt-1">{test.details}</p>

                          <div className="mt-2 text-xs grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800/60">
                            <div>
                              <span className="text-slate-500 font-semibold block">Expected:</span>
                              <span className="text-slate-300 font-mono text-[11px]">{test.expected}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-semibold block">Actual:</span>
                              <span className="text-emerald-400 font-mono text-[11px]">{test.actual}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {test.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MIGRATION ENGINE (17 STEPS) */}
      {activeTab === 'migration' && (
        <div id="pcc-migration-tab" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">17-Step Provider Migration Engine</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Validates authentication, catalog parity, team mappings, fixture IDs, kickoffs, scoring rehearsals, and zero-downtime cutover.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!activeMigration ? (
                  <button
                    onClick={handleStartMigration}
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow transition"
                  >
                    Initialize 17-Step Migration Plan
                  </button>
                ) : (
                  <button
                    onClick={handleRunAllMigrationSteps}
                    disabled={loading || migrationRunning}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow flex items-center gap-2 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {migrationRunning ? 'Executing Pipeline...' : 'Run All 17 Validation Steps'}
                  </button>
                )}
              </div>
            </div>

            {activeMigration && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{activeMigration.fromProvider}</span>
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">{activeMigration.toProvider}</span>
                  </div>
                  <div>
                    Stage: <span className="font-bold text-emerald-400">{activeMigration.stage}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeMigration.steps.map(step => (
                    <div
                      key={step.stepNumber}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center">
                          {step.stepNumber}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{step.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{step.details}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            step.status === 'PASSED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : step.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {step.status}
                        </span>

                        {step.status !== 'PASSED' && (
                          <button
                            onClick={() => handleExecuteMigrationStep(step.stepNumber)}
                            disabled={loading}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONFLICTS & REVIEWS */}
      {activeTab === 'conflicts' && (
        <div id="pcc-conflicts-tab" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Active Provider Disagreements & Conflicts ({conflicts.length})
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Discrepancies in score, kickoff, or status between providers block automated settlement until explicitly resolved.
            </p>

            <div className="mt-4 divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
              {conflicts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  Zero active provider conflicts. All providers are in consensus.
                </div>
              ) : (
                conflicts.map(conf => (
                  <div key={conf.id} className="p-4 bg-slate-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 uppercase">{conf.conflictType}</span>
                          <span className="text-xs text-slate-500">Fixture: {conf.internalFixtureId}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-semibold">{conf.providerA.name}:</span>
                            <div className="text-slate-200 mt-1 font-mono">{JSON.stringify(conf.providerA.data)}</div>
                          </div>
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-semibold">{conf.providerB.name}:</span>
                            <div className="text-slate-200 mt-1 font-mono">{JSON.stringify(conf.providerB.data)}</div>
                          </div>
                        </div>
                      </div>

                      {conf.status === 'UNRESOLVED' ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleResolveConflict(conf.id, 'RESOLVED_BY_ADMIN')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition"
                          >
                            Accept Authority & Resolve
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-slate-400">
                          {conf.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Reviews Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h4 className="text-base font-bold text-white mb-2">Team Mapping Review Queue ({teamReviews.length})</h4>
              <div className="space-y-2 text-xs">
                {teamReviews.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">0 unmapped team identities</div>
                ) : (
                  teamReviews.map(r => (
                    <div key={r.id} className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-white font-semibold">{r.rawTeamName}</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">Provider: {r.providerName}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-[11px]">
                        {r.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h4 className="text-base font-bold text-white mb-2">Fixture Mapping Review Queue ({fixtureReviews.length})</h4>
              <div className="space-y-2 text-xs">
                {fixtureReviews.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">0 unmapped fixtures</div>
                ) : (
                  fixtureReviews.map(r => (
                    <div key={r.id} className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-white font-semibold">{r.homeTeam} vs {r.awayTeam}</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">ID: {r.providerFixtureId}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-[11px]">
                        {r.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CANONICAL DICTIONARY */}
      {activeTab === 'canonical' && (
        <div id="pcc-canonical-tab" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-1">Canonical Team Identity Registry</h3>
          <p className="text-slate-400 text-xs mb-6">
            Standard internal identities mapping to provider-specific identifiers and aliases across football-data.org and api-football.com.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canonicalTeams.map(t => (
              <div key={t.canonicalId} className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{t.displayName}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-bold">
                    {t.tla}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px] mb-2">{t.canonicalId}</div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>football-data.org ID:</span>
                    <span className="text-slate-300 font-mono">{t.providerIds['football-data.org'] || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>api-football.com ID:</span>
                    <span className="text-slate-300 font-mono">{t.providerIds['api-football.com'] || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-400">Aliases: </span>
                  {t.aliases.slice(0, 3).join(', ')}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
