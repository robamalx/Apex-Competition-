import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Activity,
  UserCheck,
  CreditCard,
  Sliders,
  FileText,
  Lock,
  Terminal,
  Cpu,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Risk11SecurityPanel } from './Risk11SecurityPanel';

interface SubsystemHealth {
  subsystem: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  details: string;
  lastChecked: string;
}

interface InvariantCheck {
  invariantName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  discrepancyETB: number;
}

interface FailureSimulations {
  dbUnavailable: boolean;
  dbTimeout: boolean;
  apiTimeout: boolean;
  api500: boolean;
  footballProviderUnavailable: boolean;
  footballProviderStale: boolean;
  backupProviderUnavailable: boolean;
  networkInterruption: boolean;
  paymentTimeout: boolean;
  paymentDuplicateCallback: boolean;
  paymentContradictoryCallback: boolean;
  notificationFailure: boolean;
  smsFailure: boolean;
  telegramFailure: boolean;
  serverRestart: boolean;
  settlementInterruption: boolean;
  refundInterruption: boolean;
  withdrawalInterruption: boolean;
}

interface TestScenarioResult {
  testId: string;
  category: string;
  name: string;
  precondition: string;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  errorDetails?: string;
  operationId: string;
  correlationId: string;
  timestamp: string;
  invariantsPassed: boolean;
  financialDiscrepancyETB: number;
}

interface TestSuiteReport {
  summary: {
    totalExecuted: number;
    totalPassed: number;
    totalFailed: number;
    successRate: string;
    discrepancyETB: number;
  };
  results: TestScenarioResult[];
}

interface TestLog {
  operationId: string;
  correlationId: string;
  userId?: string;
  action: string;
  status: string;
  timestamp: string;
  details?: string;
  amountETB?: number;
}

export const TestDashboard: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [health, setHealth] = useState<SubsystemHealth[]>([]);
  const [invariants, setInvariants] = useState<InvariantCheck[]>([]);
  const [simulations, setSimulations] = useState<FailureSimulations | null>(null);
  const [suiteReport, setSuiteReport] = useState<TestSuiteReport | null>(null);
  const [logs, setLogs] = useState<TestLog[]>([]);

  // Funding Form State
  const [fundUserId, setFundUserId] = useState<string>('usr_test_player_a');
  const [fundAmount, setFundAmount] = useState<number>(1000);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);
  const [fundingLoading, setFundingLoading] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'simulations' | 'test_runner' | 'logs' | 'risk11_security'>('overview');
  const [runningSuite, setRunningSuite] = useState<boolean>(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test/status');
      if (!res.ok) {
        throw new Error('Failed to connect to local testing environment service.');
      }
      const data = await res.json();
      setHealth(data.health || []);
      setInvariants(data.invariants || []);
      setSimulations(data.simulations || null);
      setLogs(data.recentLogs || []);
    } catch (err: any) {
      setError(err.message || 'Error loading test dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleResetData = async () => {
    if (!confirm('Are you sure you want to reset all local test data? This will re-seed standard test accounts and canonical test competitions.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/test/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      alert('Local test data successfully reset and re-seeded!');
      await fetchStatus();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/init-accounts', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Init failed');
      alert(`Successfully initialized ${data.count} standard test accounts!`);
      await fetchStatus();
    } catch (err: any) {
      alert(`Account init error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundingLoading(true);
    setFundingMessage(null);
    try {
      const res = await fetch('/api/test/fund-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: fundUserId, amountETB: fundAmount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Funding failed');
      setFundingMessage(`Successfully funded ${data.user.username} with +${fundAmount} ETB (Ledger ID: ${data.ledgerId})`);
      await fetchStatus();
    } catch (err: any) {
      setFundingMessage(`Error: ${err.message}`);
    } finally {
      setFundingLoading(false);
    }
  };

  const handleToggleSimulation = async (key: keyof FailureSimulations, value: boolean) => {
    if (!simulations) return;
    const updated = { ...simulations, [key]: value };
    setSimulations(updated);
    try {
      const res = await fetch('/api/test/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error('Failed to update simulation flag');
      await fetchStatus();
    } catch (err: any) {
      alert(`Failed to update simulation flag: ${err.message}`);
    }
  };

  const handleRunSuite = async () => {
    setRunningSuite(true);
    try {
      const res = await fetch('/api/test/run-suite', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suite run failed');
      setSuiteReport(data);
      await fetchStatus();
    } catch (err: any) {
      alert(`Test suite execution error: ${err.message}`);
    } finally {
      setRunningSuite(false);
    }
  };

  if (loading && health.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading APEX ARENA Local Testing Environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-500/40 rounded-xl space-y-4 max-w-2xl mx-auto my-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-red-200">Local Test Service Unavailable</h3>
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const allInvariantsPass = invariants.every(i => i.status === 'PASS');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* LOCAL TEST HEADER BANNER */}
      <div className="relative overflow-hidden p-6 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/40 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black rounded uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                LOCAL TEST ENVIRONMENT
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded">
                ENV: LOCAL_TEST
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              APEX ARENA Pre-Launch Local Testing & Verification Support System
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Isolated local testing suite for verifying financial invariants, failure simulations, double-entry ledger integrity, and canonical competition rules prior to server launch. Real money and production credentials strictly isolated.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunSuite}
              disabled={runningSuite}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {runningSuite ? 'Running Tests...' : 'Run Acceptance Suite'}
            </button>
            <button
              onClick={handleResetData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Reset Test DB
            </button>
          </div>
        </div>
      </div>

      {/* SAFETY INVARIANTS STATUS CARD */}
      <div className={`p-5 rounded-xl border transition ${allInvariantsPass ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-red-950/20 border-red-500/40'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${allInvariantsPass ? 'text-emerald-400' : 'text-red-400'}`} />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Financial Invariants Safety Deck (10/10 Invariants)
            </h3>
          </div>
          <span className={`px-2.5 py-1 text-xs font-black rounded ${allInvariantsPass ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
            {allInvariantsPass ? '0.00 ETB DISCREPANCY — ALL PASSED' : 'FINANCIAL DISCREPANCY DETECTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {invariants.map((inv, idx) => (
            <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-start gap-2.5">
              {inv.status === 'PASS' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-200">{inv.invariantName}</p>
                <p className="text-[11px] text-slate-400">{inv.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Subsystem Health & Controls
        </button>
        <button
          onClick={() => setActiveTab('simulations')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'simulations'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Failure Simulations Matrix
        </button>
        <button
          onClick={() => setActiveTab('test_runner')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'test_runner'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Play className="w-4 h-4" />
          Acceptance Test Suite Results
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Operation Trace Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('risk11_security')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'risk11_security'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-indigo-400" />
          Account Takeover & Session Security (Risk 11)
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CONTROLS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Subsystem Health Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Subsystem Operational Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {health.map((sub, i) => (
                <div key={i} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{sub.subsystem}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                      sub.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{sub.details}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions Panel */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Environment Management Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleInitAccounts}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Seed Standard Accounts (10 Players + 7 Staff)
                </button>
                <button
                  onClick={handleResetData}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-2"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  Purge & Re-seed Fixtures & Competitions
                </button>
              </div>
            </div>
          </div>

          {/* Controlled Wallet Funding Widget */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Controlled Local Test Wallet Funding
            </h3>
            <p className="text-xs text-slate-400">
              Inject test ETB funds into any test account. Generates immutable DEPOSIT ledger entry tagged with <code className="text-emerald-300">LOCAL_TEST</code>.
            </p>

            <form onSubmit={handleFundWallet} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Target Account</label>
                <select
                  value={fundUserId}
                  onChange={e => setFundUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                >
                  <option value="usr_test_player_a">PLAYER_A (usr_test_player_a)</option>
                  <option value="usr_test_player_b">PLAYER_B (usr_test_player_b)</option>
                  <option value="usr_test_player_c">PLAYER_C (usr_test_player_c)</option>
                  <option value="usr_test_player_d">PLAYER_D (usr_test_player_d)</option>
                  <option value="usr_test_player_e">PLAYER_E (usr_test_player_e)</option>
                  <option value="usr_test_player_f">PLAYER_F (usr_test_player_f)</option>
                  <option value="usr_test_player_g">PLAYER_G (usr_test_player_g)</option>
                  <option value="usr_test_player_h">PLAYER_H (usr_test_player_h)</option>
                  <option value="usr_test_player_i">PLAYER_I (usr_test_player_i)</option>
                  <option value="usr_test_player_j">PLAYER_J (usr_test_player_j)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Amount (ETB)</label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={fundAmount}
                  onChange={e => setFundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={fundingLoading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-lg transition disabled:opacity-50"
              >
                {fundingLoading ? 'Processing Funding...' : 'Fund Wallet (+ETB)'}
              </button>

              {fundingMessage && (
                <div className={`p-2.5 rounded text-xs font-medium ${fundingMessage.startsWith('Error') ? 'bg-red-950/40 text-red-300 border border-red-800' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'}`}>
                  {fundingMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: FAILURE SIMULATIONS MATRIX */}
      {activeTab === 'simulations' && simulations && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Failure & Fault Injection Matrix (Section 8)
              </h3>
              <p className="text-xs text-slate-400">
                Toggle controlled fault modes to verify system resilience, transaction rollbacks, and error recovery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { key: 'dbUnavailable', label: 'Database Unavailable', desc: 'Simulates database disconnection / lock failure' },
              { key: 'dbTimeout', label: 'Database Query Timeout', desc: 'Simulates high latency DB queries' },
              { key: 'api500', label: 'API 500 Internal Error', desc: 'Simulates unexpected server-side exception' },
              { key: 'footballProviderUnavailable', label: 'Primary Football Data Offline', desc: 'Triggers failover to secondary backup provider' },
              { key: 'footballProviderStale', label: 'Stale Football Data Threshold', desc: 'Simulates data provider freeze beyond threshold' },
              { key: 'backupProviderUnavailable', label: 'Backup Football Data Offline', desc: 'Both data providers fail simultaneously' },
              { key: 'paymentTimeout', label: 'Payment Gateway Timeout', desc: 'Simulates missing or delayed TeleBirr callback' },
              { key: 'paymentDuplicateCallback', label: 'Duplicate Payment Callback', desc: 'Tests idempotency against double crediting' },
              { key: 'paymentContradictoryCallback', label: 'Contradictory Payment Status', desc: 'Tests payment status conflict resolution' },
              { key: 'smsFailure', label: 'SMS Gateway Failure', desc: 'Simulates SMS delivery failure for phone OTP' },
              { key: 'telegramFailure', label: 'Telegram Bot Service Offline', desc: 'Simulates Telegram bot API unavailability' },
              { key: 'settlementInterruption', label: 'Settlement Interruption', desc: 'Simulates server crash during prize distribution' }
            ].map(sim => (
              <div key={sim.key} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-200 block">{sim.label}</span>
                  <span className="text-[11px] text-slate-400 block">{sim.desc}</span>
                </div>
                <button
                  onClick={() => handleToggleSimulation(sim.key as keyof FailureSimulations, !simulations[sim.key as keyof FailureSimulations])}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg transition shrink-0 ${
                    simulations[sim.key as keyof FailureSimulations]
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {simulations[sim.key as keyof FailureSimulations] ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACCEPTANCE TEST SUITE RESULTS */}
      {activeTab === 'test_runner' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Local Acceptance Test Suite Execution Results
            </h3>
            <button
              onClick={handleRunSuite}
              disabled={runningSuite}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {runningSuite ? 'Executing...' : 'Re-run Full Suite'}
            </button>
          </div>

          {suiteReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block uppercase font-bold">Total Tests</span>
                  <span className="text-xl font-black text-slate-100">{suiteReport.summary.totalExecuted}</span>
                </div>
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block uppercase font-bold">Passed</span>
                  <span className="text-xl font-black text-emerald-400">{suiteReport.summary.totalPassed}</span>
                </div>
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block uppercase font-bold">Failed</span>
                  <span className="text-xl font-black text-red-400">{suiteReport.summary.totalFailed}</span>
                </div>
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block uppercase font-bold">Success Rate</span>
                  <span className="text-xl font-black text-cyan-400">{suiteReport.summary.successRate}</span>
                </div>
              </div>

              <div className="space-y-3">
                {suiteReport.results.map((r, i) => (
                  <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] font-bold rounded">
                          {r.testId}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{r.name}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 text-xs font-black rounded ${r.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                      <div><strong className="text-slate-300">Action:</strong> {r.action}</div>
                      <div><strong className="text-slate-300">Expected:</strong> {r.expectedResult}</div>
                      <div className="md:col-span-2"><strong className="text-slate-300">Actual Result:</strong> {r.actualResult}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No test execution report yet. Click "Run Acceptance Suite" to execute all test cases.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT TRACE LOGS */}
      {activeTab === 'logs' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Structured Audit Trace Logs (Recent 50 Operations)
            </h3>
            <button
              onClick={fetchStatus}
              className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-bold rounded hover:bg-slate-700 transition"
            >
              Refresh Logs
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-[500px] overflow-y-auto pr-1">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">{log.action}</span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {log.details && <p className="text-slate-300 text-[11px]">{log.details}</p>}
                  <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-500">
                    {log.operationId && <span>OP: {log.operationId}</span>}
                    {log.correlationId && <span>CORR: {log.correlationId}</span>}
                    {log.userId && <span>USER: {log.userId}</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic p-4 text-center">No trace logs recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RISK 11 ACCOUNT TAKEOVER & SESSION SECURITY */}
      {activeTab === 'risk11_security' && <Risk11SecurityPanel />}

    </div>
  );
};
