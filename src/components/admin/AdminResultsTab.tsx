import React, { useState, useMemo } from 'react';
import {
  Trophy,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Edit3,
  ShieldAlert,
  Zap,
  Globe
} from 'lucide-react';
import { CentralFixture, User } from '../../types';

interface AdminResultsTabProps {
  currentUser: User;
  centralFixtures: CentralFixture[];
  loading: boolean;
  onSyncResults: () => Promise<void>;
  onManualScoreUpdate: (fixtureId: string, homeScore: number, awayScore: number, status: string, reason?: string) => Promise<void>;
}

export const AdminResultsTab: React.FC<AdminResultsTabProps> = ({
  currentUser,
  centralFixtures = [],
  loading,
  onSyncResults,
  onManualScoreUpdate
}) => {
  const safeFixtures = Array.isArray(centralFixtures) ? centralFixtures : [];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Manual Override Modal
  const [editingFixture, setEditingFixture] = useState<CentralFixture | null>(null);
  const [editHomeScore, setEditHomeScore] = useState<number>(0);
  const [editAwayScore, setEditAwayScore] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('FINISHED');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    return safeFixtures.filter(f => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'LIVE' && f.status !== 'LIVE') return false;
        if (statusFilter === 'FINISHED' && f.status !== 'FINISHED') return false;
        if (statusFilter === 'POSTPONED' && f.status !== 'POSTPONED') return false;
        if (statusFilter === 'SCHEDULED' && f.status !== 'SCHEDULED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const home = (typeof f.homeTeam === 'string' ? f.homeTeam : (f.homeTeam as any)?.name || '').toLowerCase();
        const away = (typeof f.awayTeam === 'string' ? f.awayTeam : (f.awayTeam as any)?.name || '').toLowerCase();
        const league = (f.league || '').toLowerCase();
        if (!home.includes(q) && !away.includes(q) && !league.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [safeFixtures, statusFilter, searchQuery]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncResults();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenEditModal = (fix: CentralFixture) => {
    setEditingFixture(fix);
    setEditHomeScore(fix.homeScore ?? 0);
    setEditAwayScore(fix.awayScore ?? 0);
    setEditStatus(fix.status || 'FINISHED');
    setOverrideReason('');
  };

  const handleSaveOverride = async () => {
    if (!editingFixture) return;
    setIsSubmittingOverride(true);
    try {
      await onManualScoreUpdate(
        editingFixture.id,
        Number(editHomeScore),
        Number(editAwayScore),
        editStatus,
        overrideReason.trim()
      );
      setEditingFixture(null);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-400" />
            Match Results & Scoring Engine
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Monitor real-time match scores, automated API sync, and manual supervisor overrides.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing with API-Football...' : 'Trigger Automatic Sync'}
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-bold">
          {['ALL', 'FINISHED', 'LIVE', 'SCHEDULED', 'POSTPONED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                statusFilter === st ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search teams or league..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* RESULTS CARDS */}
      {filteredFixtures.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">No Match Results Found</h4>
          <p className="text-xs text-slate-400 mt-1">No fixtures match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFixtures.map(fix => {
            const home = typeof fix.homeTeam === 'string' ? fix.homeTeam : (fix.homeTeam as any)?.name || 'Home';
            const away = typeof fix.awayTeam === 'string' ? fix.awayTeam : (fix.awayTeam as any)?.name || 'Away';
            const isFinished = fix.status === 'FINISHED';
            const isLive = fix.status === 'LIVE';

            return (
              <div
                key={fix.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-400 truncate">{fix.league || 'Football League'} {fix.matchdayNumber ? `• MD ${fix.matchdayNumber}` : fix.weekNumber ? `• W${fix.weekNumber}` : ''}</span>
                    <div className="flex items-center gap-1.5">
                      {fix.sourceProvenance === 'VERIFIED_FOOTBALL_DATA_ORG' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Football-Data.org
                        </span>
                      ) : fix.source === 'MANUAL' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          Manual Override
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                          {fix.providerName || 'Provider'}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isFinished
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isLive
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isFinished ? 'FINAL SCORE' : fix.status}
                      </span>
                    </div>
                  </div>

                  {/* Teams & Scores */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex-1 space-y-1.5">
                      <div className="text-sm font-bold text-white flex items-center justify-between pr-4">
                        <span>{home}</span>
                        {isFinished ? (
                          fix.homeScore !== undefined && fix.homeScore !== null ? (
                            <span className="font-mono text-base font-black text-emerald-400">
                              {fix.homeScore}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Score Unavailable
                            </span>
                          )
                        ) : isLive && fix.homeScore !== undefined && fix.homeScore !== null ? (
                          <span className="font-mono text-base font-black text-rose-400">
                            {fix.homeScore}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm font-bold text-white flex items-center justify-between pr-4">
                        <span>{away}</span>
                        {isFinished ? (
                          fix.awayScore !== undefined && fix.awayScore !== null ? (
                            <span className="font-mono text-base font-black text-emerald-400">
                              {fix.awayScore}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Score Unavailable
                            </span>
                          )
                        ) : isLive && fix.awayScore !== undefined && fix.awayScore !== null ? (
                          <span className="font-mono text-base font-black text-rose-400">
                            {fix.awayScore}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {!isFinished && (
                      <div className="text-xs text-slate-400 font-mono text-center pl-2 border-l border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Result Pending</div>
                        <div>{fix.matchDate}</div>
                        <div className="text-slate-300 font-bold">
                          {fix.kickoffTime ? new Date(fix.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:00'} EAT
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Manual Edit Option */}
                {currentUser.role === 'SUPER_ADMIN' && (
                  <div className="pt-2.5 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => handleOpenEditModal(fix)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      Override Score
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SCORE OVERRIDE MODAL */}
      {editingFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Manual Match Score Override</h4>
                <p className="text-xs text-slate-400">
                  {typeof editingFixture.homeTeam === 'string' ? editingFixture.homeTeam : (editingFixture.homeTeam as any)?.name} vs{' '}
                  {typeof editingFixture.awayTeam === 'string' ? editingFixture.awayTeam : (editingFixture.awayTeam as any)?.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Home Score</label>
                <input
                  type="number"
                  min="0"
                  value={editHomeScore}
                  onChange={e => setEditHomeScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Away Score</label>
                <input
                  type="number"
                  min="0"
                  value={editAwayScore}
                  onChange={e => setEditAwayScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Match Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="FINISHED">FINISHED (Official Result)</option>
                <option value="LIVE">LIVE (In Progress)</option>
                <option value="POSTPONED">POSTPONED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Audited Override Reason</label>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="e.g. Official VAR adjustment / API feed delay verification"
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingFixture(null)}
                disabled={isSubmittingOverride}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                disabled={isSubmittingOverride}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5"
              >
                {isSubmittingOverride ? 'Updating...' : 'Save & Trigger Scoring'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
