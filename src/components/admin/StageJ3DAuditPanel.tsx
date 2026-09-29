import React, { useState } from 'react';
import { ShieldCheck, Play, RotateCw, CheckCircle2, AlertTriangle, FileText, Trophy, Award } from 'lucide-react';
import { User } from '../../types';

interface StageJ3DAuditPanelProps {
  currentUser: User;
}

export const StageJ3DAuditPanel: React.FC<StageJ3DAuditPanelProps> = ({ currentUser }) => {
  const [running, setRunning] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runJ3DSuite = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tests/stage-j3d', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setError(data.error || 'Failed to execute Stage J3-D test suite');
      }
    } catch (err: any) {
      setError(err.message || 'Network error executing test suite');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              STAGE J3-D FINAL
            </span>
            <h3 className="text-lg font-black text-white">Competition Creation, 8-Match Rule & Demo Cleanup Audit</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verifies the 8 verified fixtures minimum rule, multi-week selection, admin competition details view, dynamic prize pool (55/15/5/25), and zero demo data regeneration.
          </p>
        </div>

        <button
          onClick={runJ3DSuite}
          disabled={running}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-colors"
        >
          {running ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{running ? 'Running Stage J3-D Suite...' : 'Run Stage J3-D Verification'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          {/* SUMMARY BANNER */}
          <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            reportData.success ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                reportData.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {reportData.success ? '✓' : '✕'}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {reportData.success ? 'STAGE J3-D ACCEPTANCE SUITE PASSED' : 'STAGE J3-D ACCEPTANCE SUITE FAILED'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Passed {reportData.passed} of {reportData.totalTests} checks in {(reportData.durationMs / 1000).toFixed(2)}s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">
                Standard Minimum: 8 Fixtures
              </span>
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400">
                External API Calls: 0
              </span>
            </div>
          </div>

          {/* STANDARDIZED REPORT OUTPUT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>STAGE J3-D FINAL REPORT</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Standard Minimum:</span>
                  <strong className="text-emerald-400">{reportData.report.standardMinimum}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Multi-Week Selection:</span>
                  <strong className="text-emerald-400">{reportData.report.multiWeekSelection}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Competition Publishing:</span>
                  <strong className="text-emerald-400">{reportData.report.competitionPublishing}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admin Competition List:</span>
                  <strong className="text-emerald-400">{reportData.report.adminCompetitionList}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admin Competition Details:</span>
                  <strong className="text-emerald-400">{reportData.report.adminCompetitionDetails}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Fixture Display:</span>
                  <strong className="text-emerald-400">{reportData.report.assignedFixtureDisplay}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Provider ID Display:</span>
                  <strong className="text-emerald-400">{reportData.report.providerIdDisplay}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dynamic Prize Pool:</span>
                  <strong className="text-emerald-400">{reportData.report.dynamicPrizePool}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Financial Reconciliation:</span>
                  <strong className="text-emerald-400">{reportData.report.financialReconciliation}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Demo Comps Before/After:</span>
                  <strong className="text-white">{reportData.report.demoCompsBefore} / {reportData.report.demoCompsAfter}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Demo Players Before/After:</span>
                  <strong className="text-white">{reportData.report.demoPlayersBefore} / {reportData.report.demoPlayersAfter}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Demo Regeneration After Restart:</span>
                  <strong className="text-emerald-400">{reportData.report.demoRegenerationAfterRestart}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">External Football API Requests:</span>
                  <strong className="text-cyan-400">{reportData.report.externalApiRequests}</strong>
                </div>
              </div>
            </div>

            {/* REGRESSION SUMMARY */}
            <div className="pt-4 border-t border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Regression Suites Summary</h5>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
                {Object.entries(reportData.report.regressionResults || {}).map(([key, val]) => (
                  <div key={key} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">{key}</span>
                    <strong className="text-emerald-400 text-xs mt-1 block">{String(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
