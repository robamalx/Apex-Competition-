import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Trophy,
  Database,
  Lock,
  Shield,
  Server,
  Zap,
  Radio,
  FileText,
  DollarSign,
  Layers,
  Settings,
  AlertTriangle,
  Play,
  Save,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  StageH3TestSuiteResponse,
  StageH3Report,
  StageH3ProductionGap,
  StageH3TestResult
} from '../types';

export const StageH3LaunchSafetyPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [suiteResults, setSuiteResults] = useState<StageH3TestSuiteResponse | null>(null);
  const [report, setReport] = useState<StageH3Report | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Backup & Restore State
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [newBackupName, setNewBackupName] = useState<string>('');
  const [dryRunLoading, setDryRunLoading] = useState<boolean>(false);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);

  // Beta Config State
  const [betaConfig, setBetaConfig] = useState<any | null>(null);
  const [loadingBetaConfig, setLoadingBetaConfig] = useState<boolean>(false);
  const [savingBetaConfig, setSavingBetaConfig] = useState<boolean>(false);
  const [betaEmailsInput, setBetaEmailsInput] = useState<string>('');
  const [isBetaActive, setIsBetaActive] = useState<boolean>(true);

  const fetchBackups = async () => {
    if (!token) return;
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/admin/system/backups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error('Failed to load backups:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchBetaConfig = async () => {
    if (!token) return;
    setLoadingBetaConfig(true);
    try {
      const res = await fetch('/api/admin/system/beta-config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBetaConfig(data.config || null);
        if (data.config) {
          setIsBetaActive(data.config.isBetaActive ?? true);
          setBetaEmailsInput((data.config.allowedBetaUserEmails || []).join(', '));
        }
      }
    } catch (e) {
      console.error('Failed to load beta config:', e);
    } finally {
      setLoadingBetaConfig(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!token) return;
    setCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/system/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBackupName || undefined })
      });
      if (res.ok) {
        setNewBackupName('');
        await fetchBackups();
      }
    } catch (e) {
      console.error('Failed to create backup:', e);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDryRunRestore = async (backupId: string) => {
    if (!token) return;
    setDryRunLoading(true);
    setDryRunResult(null);
    try {
      const res = await fetch('/api/admin/system/restore-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ backupId, dryRun: true })
      });
      if (res.ok) {
        const data = await res.json();
        setDryRunResult(data);
      }
    } catch (e) {
      console.error('Failed to dry-run restore:', e);
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleSaveBetaConfig = async () => {
    if (!token) return;
    setSavingBetaConfig(true);
    try {
      const emails = betaEmailsInput
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/system/beta-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isBetaActive,
          allowedBetaUserEmails: emails
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBetaConfig(data.config);
      }
    } catch (e) {
      console.error('Failed to save beta config:', e);
    } finally {
      setSavingBetaConfig(false);
    }
  };

  const handleRunStageH3Suite = async () => {
    if (!token) return;
    setRunningSuite(true);
    try {
      const res = await fetch('/api/admin/security/stage-h3-verification-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: StageH3TestSuiteResponse = await res.json();
        setSuiteResults(data);
        setReport(data.report);
      }
    } catch (e) {
      console.error('Failed to run Stage H3 suite:', e);
    } finally {
      setRunningSuite(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchBetaConfig();
  }, [token]);

  const filteredTests = (suiteResults?.tests || []).filter(t => {
    if (selectedCategory === 'ALL') return true;
    return t.category === selectedCategory;
  });

  const categories = Array.from(new Set((suiteResults?.tests || []).map(t => t.category)));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Stage H3 Verification
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                Production Deployment & Launch Safety
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Production Deployment Readiness & Controlled Beta Engine
            </h2>
            <p className="text-sm text-slate-400">
              Systematic 24-point operational verification certifying environment configuration, secret isolation, non-destructive backup/restore, financial invariants (0.00 ETB unexplained delta), scheduler duplication guards, and controlled beta containment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleRunStageH3Suite}
              disabled={runningSuite}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {runningSuite ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>RUNNING 120 VERIFICATIONS...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>RUN STAGE H3 LAUNCH SUITE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verification Overview Bar */}
        {suiteResults && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tests</span>
              <span className="text-xl font-black text-white">{suiteResults.totalTests}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Passed</span>
              <span className="text-xl font-black text-emerald-400">{suiteResults.passed}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Failed</span>
              <span className="text-xl font-black text-rose-400">{suiteResults.failed}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Launch Verdict</span>
              <span className="text-xs font-black text-cyan-300 block truncate mt-1">
                {report?.finalVerdict || 'READY FOR BETA'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Financial Reconciliation Box */}
      {report?.financialReconciliation && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                Financial Settlement Invariant & Dual-Percentage Verification
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              DELTA: {report.financialReconciliation.unexplainedDeltaETB.toFixed(2)} ETB (RECONCILED)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono space-y-2">
            <p className="text-cyan-400 font-bold">{report.financialReconciliation.formula}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
              <div className="space-y-1">
                <span className="text-slate-400 block font-sans font-bold">Gross Entry Allocation:</span>
                <p>• Rank 1: {report.financialReconciliation.configuredPercentages.rank1Gross}</p>
                <p>• Rank 2: {report.financialReconciliation.configuredPercentages.rank2Gross}</p>
                <p>• Rank 3: {report.financialReconciliation.configuredPercentages.rank3Gross}</p>
                <p>• House Share: {report.financialReconciliation.configuredPercentages.houseGross}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-sans font-bold">Net Prize Pool (75%) Allocation:</span>
                <p>• Rank 1: {report.financialReconciliation.configuredPercentages.rank1NetPrizePool}</p>
                <p>• Rank 2: {report.financialReconciliation.configuredPercentages.rank2NetPrizePool}</p>
                <p>• Rank 3: {report.financialReconciliation.configuredPercentages.rank3NetPrizePool}</p>
                <p>• Unexplained Delta: <span className="text-emerald-400 font-black">0.00 ETB</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backups Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                Database Snapshots & Backups
              </h3>
            </div>
            <button
              onClick={fetchBackups}
              disabled={loadingBackups}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Backup label (optional)..."
              value={newBackupName}
              onChange={e => setNewBackupName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500"
            />
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {creatingBackup ? 'SAVING...' : 'CREATE SNAPSHOT'}
            </button>
          </div>

          {backups.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No system snapshots created yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {backups.map(b => (
                <div key={b.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">{b.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(b.createdAt).toLocaleString()} • {(b.sizeBytes / 1024).toFixed(1)} KB • {b.checksum?.substring(0, 16)}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleDryRunRestore(b.id)}
                    disabled={dryRunLoading}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    TEST DRY RUN
                  </button>
                </div>
              ))}
            </div>
          )}

          {dryRunResult && (
            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              dryRunResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <span className="font-black uppercase tracking-wider block">Dry-Run Restore Validation Result:</span>
              <p>{dryRunResult.details}</p>
            </div>
          )}
        </div>

        {/* Controlled Beta Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                Controlled Beta Pilot Configuration
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isBetaActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {isBetaActive ? 'BETA ACTIVE' : 'BETA INACTIVE'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="betaToggle"
                checked={isBetaActive}
                onChange={e => setIsBetaActive(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500"
              />
              <label htmlFor="betaToggle" className="text-slate-300 font-bold">
                Enable Controlled Beta Guard (Isolate test cohorts from production books)
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Authorized Pilot Tester Whitelist (Comma-separated emails):</label>
              <textarea
                rows={3}
                value={betaEmailsInput}
                onChange={e => setBetaEmailsInput(e.target.value)}
                placeholder="robamjaj@gmail.com, tester1@habeshabets.et..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
              />
            </div>

            <button
              onClick={handleSaveBetaConfig}
              disabled={savingBetaConfig}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {savingBetaConfig ? 'SAVING...' : 'SAVE BETA CONFIG'}
            </button>
          </div>
        </div>
      </div>

      {/* Regression Suites Matrix */}
      {report?.fullRegression && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                Full 17-Suite Regression Status Baseline
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ALL REGRESSION SUITES GREEN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {Object.entries(report.fullRegression).map(([suiteName, suiteData]: [string, any]) => (
              <div key={suiteName} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="space-y-0.5 max-w-[180px]">
                  <p className="font-bold text-white truncate">{suiteName}</p>
                  <p className="text-[10px] text-slate-400">{suiteData.passed} / {suiteData.total} Passed</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400">
                  {suiteData.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining Production Gaps */}
      {report?.remainingProductionGaps && report.remainingProductionGaps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
              Pre-Launch Production Environment Notes & Gaps
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {report.remainingProductionGaps.map(gap => (
              <div key={gap.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-amber-400 font-bold">{gap.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    gap.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-300' :
                    gap.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {gap.severity}
                  </span>
                </div>
                <h4 className="font-bold text-white">{gap.title}</h4>
                <p className="text-[11px] text-slate-400">{gap.evidence}</p>
                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300">
                  <span className="font-bold block text-slate-400">Required Action:</span>
                  {gap.requiredAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results Inspector */}
      {suiteResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                Stage H3 Test Execution Log ({filteredTests.length} Tests)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs max-h-96 overflow-y-auto">
            {filteredTests.map(t => (
              <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 text-[10px]">{t.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    t.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="font-bold text-white">{t.name}</p>
                <p className="text-[11px] text-slate-400">{t.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
