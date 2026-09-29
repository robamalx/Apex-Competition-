import React, { useState } from 'react';
import {
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Check,
  XCircle,
  Layers,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import {
  AdPackageConfig
} from '../../../types.js';

interface AdsPackagesSettingsProps {
  packages: AdPackageConfig[];
  testResults: any;
  runningTests: boolean;
  onRunTestSuite: () => Promise<void>;
}

export const AdsPackagesSettings: React.FC<AdsPackagesSettingsProps> = ({
  packages,
  testResults,
  runningTests,
  onRunTestSuite
}) => {
  return (
    <div className="space-y-8">
      {/* 1. PACKAGES DIRECTORY */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Authoritative Advertising Packages & Rate Card
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Commercial package rates and durations are server-authoritative. Commercial campaigns cannot tamper with price schemas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              {pkg.isExclusive && (
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[9px] px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow">
                  ⭐ Exclusive Tier
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{pkg.id}</span>
                  <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-400">
                      {pkg.priceETB.toLocaleString()} ETB
                    </span>
                    <span className="text-xs text-slate-400">/ {pkg.durationDays} Days</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{pkg.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Allowed Placement Slots:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {pkg.allowedPlacements.map(p => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300 font-mono font-semibold border border-slate-800"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Priority Delivery Weight:</span>
                  <strong className="text-white font-mono">{pkg.priority}</strong>
                </div>

                {pkg.maxActiveConcurrent && (
                  <div className="flex items-center justify-between text-[11px] text-amber-400 pt-0.5">
                    <span>Max Concurrent:</span>
                    <strong className="font-mono">{pkg.maxActiveConcurrent} Slot</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. DIAGNOSTIC TEST SUITE (STAGE TASK 16 SUITE) */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              14-Category Authoritative Verification Diagnostic Suite
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Executes full server-side suite testing classification, packages, lifecycle, payments, delivery, security, financial isolation, and analytics algorithms.
            </p>
          </div>

          <button
            onClick={onRunTestSuite}
            disabled={runningTests}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
            {runningTests ? 'Running Verification...' : 'Execute Test Suite'}
          </button>
        </div>

        {testResults && (
          <div className="space-y-4">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Checks</span>
                <span className="text-2xl font-black text-white mt-1 block">{testResults.totalTests}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Passed</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{testResults.passedTests}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-rose-400">Failed</span>
                <span className="text-2xl font-black text-rose-400 mt-1 block">{testResults.failedTests}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-cyan-400">Duration</span>
                <span className="text-2xl font-black text-cyan-400 mt-1 block">{testResults.durationMs} ms</span>
              </div>
            </div>

            {/* Test List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
              {testResults.results.map((r: any) => (
                <div key={r.id} className="p-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                        {r.category}
                      </span>
                      <span className="font-bold text-xs text-white">{r.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">{r.message}</p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                      r.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {r.passed ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
