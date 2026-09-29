import React from 'react';
import {
  Calendar,
  Trophy,
  Users,
  Wallet,
  Activity,
  AlertCircle,
  PlusCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Clock,
  Radio,
  FileText
} from 'lucide-react';
import { Competition, CentralFixture, WalletTransaction, User, SystemAlert } from '../../types';

interface AdminDashboardTabProps {
  user: User;
  competitions: Competition[];
  centralFixtures: CentralFixture[];
  transactions: WalletTransaction[];
  users: User[];
  systemAlerts: SystemAlert[];
  emergencyState?: {
    publicAccess: boolean;
    competitionEntryCircuitBreaker: boolean;
    financialKillSwitch: boolean;
    maintenanceMode: boolean;
  } | null;
  onNavigateTab: (tab: string, subAction?: string) => void;
  onTriggerImportModal: () => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  user,
  competitions = [],
  centralFixtures = [],
  transactions = [],
  users = [],
  systemAlerts = [],
  emergencyState,
  onNavigateTab,
  onTriggerImportModal
}) => {
  const safeCompetitions = Array.isArray(competitions) ? competitions : [];
  const safeFixtures = Array.isArray(centralFixtures) ? centralFixtures : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAlerts = Array.isArray(systemAlerts) ? systemAlerts : [];

  const pendingWithdrawals = safeTransactions.filter(
    t => (t.type === 'WITHDRAWAL' || t.direction === 'DEBIT') && t.status === 'PENDING'
  );
  const activeCompetitions = safeCompetitions.filter(
    c => ['PUBLISHED', 'OPEN', 'LOCKED', 'IN_PROGRESS', 'LIVE'].includes(c.status)
  );
  const upcomingFixtures = safeFixtures.filter(
    f => f.status === 'SCHEDULED' && new Date(f.kickoffTime || f.matchDate) >= new Date()
  );

  // Check competitions approaching lock (< 60 mins)
  const now = Date.now();
  const approachingLockComps = activeCompetitions.filter(c => {
    if (!c.autoLockTime) return false;
    const lockTime = new Date(c.autoLockTime).getTime();
    return lockTime > now && lockTime - now <= 60 * 60 * 1000;
  });

  // Check RBAC Authorization
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Executive Operations Dashboard is restricted to Super Administrators and Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Circuit Breaker Status */}
      {emergencyState && (emergencyState.maintenanceMode || emergencyState.financialKillSwitch || emergencyState.competitionEntryCircuitBreaker || !emergencyState.publicAccess) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Active Safety Controls:</span>{' '}
              {emergencyState.maintenanceMode && <span className="underline font-semibold ml-1">Maintenance Mode Active</span>}
              {emergencyState.financialKillSwitch && <span className="underline font-semibold ml-1">Financial Kill Switch Active</span>}
              {emergencyState.competitionEntryCircuitBreaker && <span className="underline font-semibold ml-1">Entry Breaker Locked</span>}
              {!emergencyState.publicAccess && <span className="underline font-semibold ml-1">Public Access Off (Beta Only)</span>}
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('system', 'emergency')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0"
          >
            Manage
          </button>
        </div>
      )}

      {/* TODAY'S METRICS AT A GLANCE */}
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Today's Operational Summary
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Upcoming Matches */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Upcoming Fixtures</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{upcomingFixtures.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Scheduled for competition selection</span>
          </div>

          {/* Active Competitions */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Active Competitions</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{activeCompetitions.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Open or In-Progress</span>
          </div>

          {/* Total Players */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Registered Players</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{safeUsers.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Active user accounts</span>
          </div>

          {/* Pending Withdrawals */}
          <div
            onClick={() => onNavigateTab('finance', 'withdrawals')}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${
              pendingWithdrawals.length > 0
                ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Pending Withdrawals</span>
              <Wallet className={`w-4 h-4 ${pendingWithdrawals.length > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{pendingWithdrawals.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {pendingWithdrawals.length > 0 ? 'Requires Staff Review' : 'All reviews cleared'}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Primary Operational Actions
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={onTriggerImportModal}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Import Fixtures</span>
          </button>

          <button
            onClick={() => onNavigateTab('competitions', 'create')}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Create Competition</span>
          </button>

          <button
            onClick={() => onNavigateTab('fixtures')}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Select Fixtures</span>
          </button>

          <button
            onClick={() => onNavigateTab('results')}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">View Results</span>
          </button>

          <button
            onClick={() => onNavigateTab('finance', 'withdrawals')}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Review Withdrawals</span>
          </button>

          <button
            onClick={() => onNavigateTab('system')}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-500/50 rounded-xl flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">System Health</span>
          </button>
        </div>
      </div>

      {/* ACTIONABLE OPERATIONAL ALERTS */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          Actionable Notifications & Alerts
        </h3>

        {approachingLockComps.length === 0 && pendingWithdrawals.length === 0 && safeAlerts.filter(a => a.status === 'OPEN' || (a.status as any) === 'ACTIVE').length === 0 ? (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">All Operational Systems Normal</h4>
            <p className="text-xs text-slate-400 mt-1">
              No urgent withdrawal reviews, impending lock warnings, or system anomalies at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Approaching Lock Alert */}
            {approachingLockComps.map(comp => (
              <div
                key={`alert-lock-${comp.id}`}
                className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 text-amber-200">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300">{comp.title}</span> is approaching automatic 10-minute kickoff lock (Lock time: {new Date(comp.autoLockTime || '').toLocaleTimeString()}).
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('competitions')}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition-colors shrink-0"
                >
                  View
                </button>
              </div>
            ))}

            {/* Pending Withdrawal Alerts */}
            {pendingWithdrawals.length > 0 && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-rose-200">
                  <Wallet className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-300">{pendingWithdrawals.length} withdrawal requests</span> require compliance verification and approval.
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('finance', 'withdrawals')}
                  className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg transition-colors shrink-0"
                >
                  Review
                </button>
              </div>
            )}

            {/* Active System Alerts */}
            {safeAlerts.filter(a => a.status === 'OPEN' || (a.status as any) === 'ACTIVE').slice(0, 3).map(alert => (
              <div
                key={`alert-sys-${alert.id}`}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white uppercase">{alert.category}:</span> {alert.description || (alert as any).message}
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('system')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors shrink-0"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
